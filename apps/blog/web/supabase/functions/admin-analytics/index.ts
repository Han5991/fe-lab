/**
 * admin-analytics Edge Function
 *
 * admin RPC를 service_role 권한으로 대리 호출합니다.
 * 호출자의 JWT를 검증하고 ADMIN_EMAIL과 일치하는지 확인한 후에만 실행합니다.
 *
 * 지원 action과 각각이 부르는 RPC, params 형태는 **`src/lib/platform/adminActions.ts`가
 * 단일 출처**입니다(`ADMIN_ACTION_RPCS` · `AdminRequest`). 브라우저 클라이언트
 * (`src/lib/platform/adminApi.ts`)도 같은 파일을 import 하므로 여기서 목록을 따로
 * 적지 않습니다 — action을 추가하려면 그 파일에 등록하고 아래 switch에 case를
 * 더하면 되고, case를 빼먹으면 `default`의 never 대입이 컴파일 에러를 냅니다.
 * `posts_overview`는 RPC 둘(글별 누적·오늘 조회수, 일별 추이)을 병렬로 불러 `{ stats, trends }`
 * 하나로 묶습니다 — 목록 화면이 둘을 늘 같이 쓰므로 왕복이 한 번입니다(아래 case 참고).
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
  ADMIN_ACTION_RPCS,
  isPostTrendRows,
  parseAdminRequest,
} from '../../../src/lib/platform/adminActions.ts';
import { collectPagedRows } from '../../../src/lib/platform/paging.ts';
import type { Database } from '../../../src/lib/platform/database.types.ts';

/** 필요한 환경변수가 없을 때 — 이름은 로그에만 남기고 호출자에겐 설정 오류로만 알린다. */
function missingEnv(name: string): Response {
  console.error(`${name} 환경변수가 설정되지 않았습니다.`);
  return new Response(JSON.stringify({ error: '서버 설정 오류입니다.' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) return missingEnv('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseServiceRoleKey) return missingEnv('SUPABASE_SERVICE_ROLE_KEY');

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

      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
      if (!supabaseAnonKey) return missingEnv('SUPABASE_ANON_KEY');
      const adminEmail = Deno.env.get('ADMIN_EMAIL');
      if (!adminEmail) return missingEnv('ADMIN_EMAIL');

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
    // JSON이 아닌 body는 서버 오류(500)가 아니라 요청 오류(400)다.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: '요청 본문이 JSON이 아닙니다.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    // action과 action별 params 모양을 adminActions.ts가 확인한다 — 통과한 요청은
    // 단언 없이 AdminRequest다.
    const parsed = parseAdminRequest(body);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ error: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { request } = parsed;

    // ── service_role client로 RPC 호출 ─────────────────────────────
    // Database 제네릭을 주면 아래 rpc() 이름·인자가 database.types.ts와 대조된다.
    const serviceClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceRoleKey,
    );

    let data: unknown;
    let rpcError: unknown;

    switch (request.action) {
      case 'posts_overview': {
        // 모양이 어긋난 slug 필터는 parseAdminRequest가 이미 400으로 끊었다. 생략하면 거르지 않는다.
        const slugFilter = request.params?.slugs;
        const [statsRpc, trendsRpc] = ADMIN_ACTION_RPCS.posts_overview;

        // 통계는 RETURNS TABLE 이라 PostgREST 가 한 응답에 max_rows(1000)까지만 줘서 여기서 페이징해
        // 합친다(브라우저가 돌면 페이지마다 왕복·JWT 검증이 반복된다). 루프는 테스트가 있는
        // collectPagedRows 에 있다. 정렬된 결과를 잘라야 행이 빠지거나 겹치지 않고, pageSize 는 서버
        // max_rows 와 같아야 한다. 페이지마다 시점이 달라 새 행이 끼면 앞 행이 다시 와서 식별 키로 한 번만 싣는다.
        const stats = collectPagedRows(
          async (from, to) => {
            const base = serviceClient.rpc(statsRpc);
            const filtered = slugFilter ? base.in('slug', slugFilter) : base;
            const result = await filtered
              .order('slug', { ascending: true })
              .range(from, to);
            if (result.error) throw result.error;
            return result.data;
          },
          { pageSize: 1000, maxPages: 50, key: row => row.slug },
        );
        // 추이는 json 배열 하나를 내는 RPC 한 번이다(스칼라 반환이라 max_rows 가 걸리지 않는다 —
        // 마이그레이션 20261025000000). 통계 페이징과 병렬로 돈다.
        const trends = serviceClient.rpc(
          trendsRpc,
          slugFilter ? { slugs: [...slugFilter] } : {},
        );

        try {
          const [statsRows, trendsResult] = await Promise.all([stats, trends]);
          if (trendsResult.error) throw trendsResult.error;
          // 생성 타입은 이 RPC 의 반환을 Json 으로 적는다 — 행 모양은 클라이언트와 같은 가드로 좁힌다.
          if (!isPostTrendRows(trendsResult.data)) {
            throw new Error(`${trendsRpc}가 계약과 다른 행을 돌려줬습니다.`);
          }
          data = { stats: statsRows, trends: trendsResult.data };
        } catch (err) {
          rpcError = err;
        }
        break;
      }

      case 'post_hourly_distribution':
      case 'post_dow_distribution': {
        const { slug } = request.params;
        const result = await serviceClient.rpc(
          ADMIN_ACTION_RPCS[request.action][0],
          { slug_input: slug },
        );
        data = result.data;
        rpcError = result.error;
        break;
      }

      default: {
        // ADMIN_ACTION_RPCS에 action을 추가하고 여기 case를 빼먹으면 컴파일 에러.
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
      // 원인(code·message·details·hint)은 로그에만 남긴다 — 응답에 실으면 DB 내부 정보가
      // 브라우저로 나간다(CodeQL js/stack-trace-exposure). 화면은 `error` 문구만 읽는다.
      console.error('RPC 오류:', rpcError);
      return new Response(
        JSON.stringify({ error: 'RPC 호출에 실패했습니다.' }),
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
