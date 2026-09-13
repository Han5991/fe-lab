import { PostgrestClient } from '@supabase/postgrest-js';
import type { Database } from '@blog/analytics';
import {
  PUBLIC_SUPABASE_ANON_KEY,
  PUBLIC_SUPABASE_URL,
} from '$env/static/public';

/**
 * 공개 페이지 전용 Supabase 데이터 클라이언트 (PostgREST만).
 *
 * `client.ts`의 `createClient()`는 생성자에서 Auth·Realtime·Storage·Functions를
 * **전부 즉시 인스턴스화**한다. 조회수 하나만 읽어도 번들러가 그 넷을 떨궈내지
 * 못해 gzip 45KB가 글 페이지에 따라붙는다(React 판에서 실측한 값이고, 그중
 * realtime+phoenix+storage 18.5KB는 어디서도 호출하지 않는 죽은 코드였다).
 *
 * 공개 페이지가 실제로 하는 건 `increment_view_count` RPC뿐이고 그건 순수
 * PostgREST라, 그 부분만 담은 클라이언트를 따로 둔다. 두 앱이 같은 판단을 하는
 * 이유가 프레임워크가 아니라 supabase-js의 생성자 모양이라는 것 자체가 비교의
 * 결과 하나다 — 여기서도 똑같이 필요했다.
 *
 * 헤더는 supabase-js가 세션 없는 요청에 붙이는 것과 동일하게 맞춘다.
 */
const restUrl = `${PUBLIC_SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;

export const publicDb = new PostgrestClient<Database>(restUrl, {
  headers: {
    apikey: PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_KEY}`,
  },
  // supabase-js는 db.schema 기본값 'public'을 PostgrestClient에 넘기고, 그게
  // 요청에 Accept-Profile/Content-Profile 헤더로 나간다. 빼먹으면 PostgREST가
  // 서버 기본 스키마로 처리해서 — 지금 설정에선 결과가 같지만 — 노출 스키마가
  // 늘어나는 순간 조용히 달라진다. 명시해서 요청을 바이트 단위로 맞춘다.
  schema: 'public',
});
