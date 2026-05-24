/**
 * admin-analytics Edge Function
 *
 * admin RPC 4건을 service_role 권한으로 대리 호출합니다.
 * 호출자의 JWT를 검증하고 ADMIN_EMAIL과 일치하는지 확인한 후에만 실행합니다.
 *
 * 지원 action:
 *   - all_post_stats        : get_all_post_stats RPC
 *   - all_posts_trends      : get_all_posts_trends RPC (range 페이지네이션 지원)
 *   - post_hourly_distribution : get_post_hourly_distribution RPC
 *   - post_dow_distribution : get_post_dow_distribution RPC
 *
 * 환경변수 (Supabase 자동 주입):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 * 사용자가 Supabase Dashboard > Edge Functions > Secrets 에서 설정:
 *   ADMIN_EMAIL
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type Action =
  | 'all_post_stats'
  | 'all_posts_trends'
  | 'post_hourly_distribution'
  | 'post_dow_distribution';

interface RequestBody {
  action: Action;
  params?: {
    slug?: string;
    range?: [number, number];
  };
}

Deno.serve(async (req: Request) => {
  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. 사용자 JWT 추출 ─────────────────────────────────────────
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminEmail = Deno.env.get('ADMIN_EMAIL');

    if (!adminEmail) {
      console.error('ADMIN_EMAIL 환경변수가 설정되지 않았습니다.');
      return new Response(JSON.stringify({ error: '서버 설정 오류입니다.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. 사용자 JWT로 user 검증 ──────────────────────────────────
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

    // ── 3. admin 이메일 확인 ───────────────────────────────────────
    if (user.email !== adminEmail) {
      return new Response(
        JSON.stringify({ error: '관리자 권한이 없습니다.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // ── 4. 요청 body 파싱 ──────────────────────────────────────────
    const body = (await req.json()) as RequestBody;
    const { action, params } = body;

    // ── 5. service_role client로 RPC 호출 ─────────────────────────
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    let data: unknown;
    let rpcError: unknown;

    switch (action) {
      case 'all_post_stats': {
        const result = await serviceClient.rpc('get_all_post_stats');
        data = result.data;
        rpcError = result.error;
        break;
      }

      case 'all_posts_trends': {
        // 클라이언트가 range 인자로 페이지네이션을 제어합니다.
        const [from, to] = params?.range ?? [0, 999];
        const result = await serviceClient
          .rpc('get_all_posts_trends')
          .range(from, to);
        data = result.data;
        rpcError = result.error;
        break;
      }

      case 'post_hourly_distribution': {
        if (!params?.slug) {
          return new Response(
            JSON.stringify({ error: 'slug 파라미터가 필요합니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
        const result = await serviceClient.rpc('get_post_hourly_distribution', {
          slug_input: params.slug,
        });
        data = result.data;
        rpcError = result.error;
        break;
      }

      case 'post_dow_distribution': {
        if (!params?.slug) {
          return new Response(
            JSON.stringify({ error: 'slug 파라미터가 필요합니다.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
        const result = await serviceClient.rpc('get_post_dow_distribution', {
          slug_input: params.slug,
        });
        data = result.data;
        rpcError = result.error;
        break;
      }

      default: {
        return new Response(
          JSON.stringify({ error: `알 수 없는 action: ${action}` }),
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
