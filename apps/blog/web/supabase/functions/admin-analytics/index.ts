/**
 * admin-analytics Edge Function
 *
 * admin RPC를 service_role 권한으로 대리 호출합니다.
 * 호출자의 JWT를 검증하고 ADMIN_EMAIL과 일치하는지 확인한 후에만 실행합니다.
 *
 * 지원 action과 각각이 부르는 RPC, params 형태는 **`lib/platform/adminActions.ts`가
 * 단일 출처**입니다(`ADMIN_ACTION_RPC` · `AdminRequest`). 브라우저 클라이언트
 * (`lib/platform/adminApi.ts`)도 같은 파일을 import 하므로 여기서 목록을 따로
 * 적지 않습니다 — action을 추가하려면 그 파일에 등록하고 아래 switch에 case를
 * 더하면 되고, case를 빼먹으면 `default`의 never 대입이 컴파일 에러를 냅니다.
 *
 * `supabase/functions` 밖의 파일을 import 하는 것은 의도된 것입니다.
 * `supabase functions deploy`는 entrypoint의 import 그래프를 따라 밖의 파일도
 * 번들에 넣습니다(CLI `BindHostModules`). 단, 그 파일들은 Deno가 해석할 수
 * 있어야 하므로 **import가 없는 순수 모듈**이어야 합니다 — adminActions.ts와
 * database.types.ts(`supabase gen types` 산출물)가 그렇습니다.
 *
 * 환경변수 (Supabase 자동 주입):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * 사용자가 Supabase Dashboard > Edge Functions > Secrets 에서 설정:
 *   ADMIN_EMAIL
 * 로컬 개발 전용(config.toml [edge_runtime.secrets]):
 *   ADMIN_ANALYTICS_ALLOW_UNAUTH="true" → 인증 우회. 프로덕션엔 미주입.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  ADMIN_ACTION_RPC,
  isAdminAction,
  type AdminRequest,
} from '../../../lib/platform/adminActions.ts';
import type { Database } from '../../../lib/platform/database.types.ts';

Deno.serve(async (req: Request) => {
  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ── 인증 ───────────────────────────────────────────────────────
    // 인증 우회는 명시적 opt-in 플래그로만 허용한다(기본 = 인증 강제).
    // 로컬 개발은 config.toml [edge_runtime.secrets]에서 이 플래그를 켠다.
    // 프로덕션(Cloud/셀프호스트)은 플래그 미설정 → 인증 강제.
    // (예전엔 SUPABASE_URL에 kong/127.0.0.1/localhost가 있으면 자동 우회했는데,
    //  'kong'은 Supabase 셀프호스트 docker-compose의 표준 게이트웨이 호스트명이라
    //  셀프호스트 프로덕션에서도 인증이 통째로 꺼지는 footgun이었다.)
    const allowUnauthenticated =
      Deno.env.get('ADMIN_ANALYTICS_ALLOW_UNAUTH') === 'true';

    if (!allowUnauthenticated) {
      // 1. 사용자 JWT 추출
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Authorization 헤더가 없습니다.' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (!adminEmail) {
        console.error('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.');
        return new Response(
          JSON.stringify({ error: '서버 설정 오류입니다.' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // 2. 사용자 JWT로 user 검증
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userError,
      } = await userClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: '인증에 실패했습니다.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. admin 이메일 확인
      if (user.email !== adminEmail) {
        return new Response(
          JSON.stringify({ error: '관리자 권한이 없습니다.' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    // ── 요청 body 파싱 ──────────────────────────────────────────────
    const raw = (await req.json()) as { action?: unknown } | null;
    if (!isAdminAction(raw?.action)) {
      return new Response(
        JSON.stringify({ error: `알 수 없는 action: ${String(raw?.action)}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    // action이 등록된 것이면 body를 그 action의 요청 형태로 본다. params는
    // JSON에서 온 값이라 필수 필드(slug)는 아래 case에서 런타임으로 한 번 더 확인.
    const request = raw as AdminRequest;

    // ── service_role client로 RPC 호출 ─────────────────────────────
    // Database 제네릭을 주면 아래 rpc() 이름·인자가 database.types.ts와 대조된다.
    const serviceClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
    );

    let data: unknown;
    let rpcError: unknown;

    switch (request.action) {
      case 'all_post_stats': {
        const result = await serviceClient.rpc(
          ADMIN_ACTION_RPC[request.action],
        );
        data = result.data;
        rpcError = result.error;
        break;
      }

      case 'all_posts_trends': {
        // 클라이언트가 range 인자로 페이지네이션을 제어합니다.
        const [from, to] = request.params?.range ?? [0, 999];
        const result = await serviceClient
          .rpc(ADMIN_ACTION_RPC[request.action])
          .range(from, to);
        data = result.data;
        rpcError = result.error;
        break;
      }

      case 'post_hourly_distribution':
      case 'post_dow_distribution': {
        const slug = request.params?.slug;
        if (typeof slug !== 'string' || slug.length === 0) {
          return new Response(
            JSON.stringify({ error: 'slug 파라미터가 필요합니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
        const result = await serviceClient.rpc(
          ADMIN_ACTION_RPC[request.action],
          { slug_input: slug },
        );
        data = result.data;
        rpcError = result.error;
        break;
      }

      default: {
        // ADMIN_ACTION_RPC에 action을 추가하고 여기 case를 빼먹으면 컴파일 에러.
        const unhandled: never = request;
        return new Response(
          JSON.stringify({
            error: `처리기가 없는 action: ${JSON.stringify(unhandled)}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    if (rpcError) {
      console.error('RPC 오류:', rpcError);
      return new Response(
        JSON.stringify({ error: 'RPC 호출에 실패했습니다.', detail: rpcError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge Function 오류:', err);
    return new Response(
      JSON.stringify({ error: '서버 내부 오류가 발생했습니다.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
