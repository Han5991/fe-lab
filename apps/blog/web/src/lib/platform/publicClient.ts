import { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from './database.types';

/**
 * 공개 페이지 전용 Supabase 데이터 클라이언트 (PostgREST만).
 *
 * `lib/platform/client.ts`의 `createClient()`는 생성자에서 Auth·Realtime·Storage·
 * Functions 클라이언트를 **전부 즉시 인스턴스화**한다. 그래서 조회수 하나만
 * 읽어도 번들러가 그 넷을 떨궈내지 못하고, 홈·글 목록·글 상세까지 gzip 45KB가
 * 따라붙었다(그중 realtime+phoenix+storage 18.5KB는 앱 어디서도 호출하지 않는
 * 죽은 코드였다). 로그인·Edge Function은 `/admin`에서만 쓴다.
 *
 * 공개 페이지가 실제로 하는 건 `post_views` 읽기와 `increment_view_count`
 * RPC뿐이고 둘 다 순수 PostgREST라, 그 부분만 담은 클라이언트를 따로 둔다.
 * 인증이 필요한 경로는 계속 `lib/platform/client.ts`를 쓴다.
 *
 * 헤더는 supabase-js가 세션 없는 요청에 붙이는 것과 동일하게 맞춘다
 * (`apikey` + anon key를 담은 `Authorization`). 즉 서버가 보는 요청은 그대로다.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// supabase-js의 `new URL('rest/v1', baseUrl)`과 같은 결과. 다만 baseUrl에
// 후행 슬래시가 없으면 URL 해석이 마지막 세그먼트를 갈아치우므로 직접 맞춘다.
const restUrl = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`;

export const publicDb = new PostgrestClient<Database>(restUrl, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
  // supabase-js는 db.schema 기본값 'public'을 PostgrestClient에 넘기고, 그게
  // 요청에 Accept-Profile/Content-Profile 헤더로 나간다. 빼먹으면 PostgREST가
  // 서버 기본 스키마로 처리해서 — 지금 설정에선 결과가 같지만 — 노출 스키마가
  // 늘어나는 순간 조용히 달라진다. 명시해서 요청을 바이트 단위로 맞춘다.
  schema: 'public',
});
