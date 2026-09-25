/**
 * admin-analytics Edge Function 프로토콜 — action 이름과 그것이 대리 호출하는
 * RPC의 대응표, action별 params 형태.
 *
 * **Edge Function(Deno, `supabase/functions/admin-analytics/index.ts`)과 브라우저
 * 클라이언트(`adminApi.ts`)가 이 파일 하나를 import 한다.** 예전엔 양쪽이 같은
 * 유니온을 따로 적어 두고 있어서 한쪽만 고치면 조용히 어긋났다.
 *
 * 이 파일에는 **import를 두지 않는다.** Deno는 확장자 없는 상대 import를
 * 해석하지 못하고, Edge 번들러(`supabase functions deploy`)는 entrypoint의 import
 * 그래프를 따라 이 파일을 `supabase/functions` 밖에서 그대로 집어 간다 — 여기서
 * 다른 앱 모듈을 끌어오면 그 파일도 같은 제약을 받는다.
 *
 * RPC 이름이 `database.types.ts`의 Functions 키와 맞는지는 `adminApi.ts`의
 * `AdminActionResult`가 인덱싱으로 검사한다 — 어긋나면 그쪽이 컴파일 에러다.
 */

/** action → 대리 호출하는 RPC(`Database['public']['Functions']`의 키). */
export const ADMIN_ACTION_RPC = {
  all_post_stats: 'get_all_post_stats',
  all_posts_trends: 'get_all_posts_trends',
  post_hourly_distribution: 'get_post_hourly_distribution',
  post_dow_distribution: 'get_post_dow_distribution',
} as const;

export type AdminAction = keyof typeof ADMIN_ACTION_RPC;

/** action이 대리 호출하는 RPC 이름. */
export type AdminActionRpc<A extends AdminAction = AdminAction> =
  (typeof ADMIN_ACTION_RPC)[A];

/**
 * 목록형 action(`all_post_stats`·`all_posts_trends`)의 선택 params — 이 글들만
 * 서버에서 거른다.
 *
 * 두 RPC가 읽는 post_views·post_view_logs는 anon이 `increment_view_count`로
 * 아무 slug나 만들 수 있는 표다. 거르지 않으면 가짜 slug 행이 PostgREST의
 * 1000행 cap을 채워 실제 글이 잘리거나(정렬이 없으면 무작위로), 페이지 상한을
 * 넘겨 대시보드가 통째로 500이 된다. 클라이언트는 admin 글 인덱스의 slug를 넘긴다.
 *
 * 생략하면 거르지 않는다 — 이 필드를 모르는 옛 Edge Function과 옛 클라이언트가
 * 어느 쪽이 먼저 배포되든 그대로 맞물린다.
 */
export interface AdminSlugFilter {
  slugs?: readonly string[];
}

/**
 * `slugs` 한 요청의 최대 개수 — JSON 입력 검증용 상한이다.
 *
 * 실제 한계는 이 숫자가 아니라 **쿼리스트링 길이**다. 필터는 PostgREST에
 * `slug=in.(…)`로 실리므로 URL이 글 수에 비례해 길어진다(45편 ≈ 1.6KB). 게이트웨이의
 * URL 한도(수 KB대)에 가까워질 만큼 글이 늘면, slug 목록을 POST 본문으로 받는
 * RPC로 옮겨야 한다 — 그 전까지는 실패가 414/500으로 드러난다(조용히 잘리지 않는다).
 */
export const MAX_FILTER_SLUGS = 1000;

/** slug 한 개의 최대 길이 — `increment_view_count`가 기록을 거부하는 길이와 같다. */
export const MAX_SLUG_LENGTH = 200;

/**
 * action별 요청 params. params가 없는 action은 `undefined`.
 * 클라이언트 `call()`의 두 번째 인자와 Edge Function이 읽는 `body.params`가
 * 여기서 같은 형태를 본다.
 */
export interface AdminActionParams {
  all_post_stats: AdminSlugFilter | undefined;
  /**
   * PostgREST의 1000행 cap(`config.toml`의 `max_rows`)은 Edge Function이 안에서
   * range를 돌려 모아 넘긴다(`all_post_stats`도 같다).
   *
   * 예전엔 브라우저가 `range`를 바꿔가며 직렬로 여러 번 불렀다. 그러면 페이지
   * 수만큼 인터넷 왕복이 늘 뿐 아니라 요청마다 JWT 검증(`auth.getUser()`)까지
   * 다시 돌아, 데이터가 늘수록 비용이 곱으로 붙었다.
   */
  all_posts_trends: AdminSlugFilter | undefined;
  post_hourly_distribution: { slug: string };
  post_dow_distribution: { slug: string };
}

/**
 * Edge Function 요청 body. `action`으로 판별되는 유니온이라 `switch (body.action)`
 * 안에서 `body.params`가 그 action의 형태로 함께 좁혀진다.
 */
export type AdminRequest = {
  [A in AdminAction]: { action: A; params?: AdminActionParams[A] };
}[AdminAction];

/** 런타임 가드 — 요청 body의 `action`이 등록된 것인지. 프로토타입 키(`toString` 등)는 거른다. */
export function isAdminAction(value: unknown): value is AdminAction {
  return typeof value === 'string' && Object.hasOwn(ADMIN_ACTION_RPC, value);
}

/**
 * 런타임 가드 — 요청 body의 `slugs`가 거를 slug 목록으로 쓸 수 있는 모양인지.
 * JSON에서 온 값이라 Edge Function이 RPC 필터에 싣기 전에 한 번 확인한다.
 */
export function isSlugList(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length <= MAX_FILTER_SLUGS &&
    value.every(
      (s): s is string =>
        typeof s === 'string' && s.length > 0 && s.length <= MAX_SLUG_LENGTH,
    )
  );
}
