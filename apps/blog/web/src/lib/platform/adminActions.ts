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
 * 목록형 action의 선택 params — 이 글들만 서버에서 거른다(anon이 만든 가짜 slug 행이
 * 1000행 cap·페이지 상한을 채우지 않게). 생략하면 거르지 않아 함수·클라이언트 중 어느
 * 쪽이 먼저 배포돼도 맞물린다.
 */
export interface AdminSlugFilter {
  slugs?: readonly string[];
}

/**
 * `slugs` 한 요청의 최대 개수(입력 검증용). 실제 한계는 필터가 실리는 쿼리스트링
 * 길이다 — 한도에 가까워지면 slug 목록을 POST 본문으로 받는 RPC로 옮긴다.
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
  /** 1000행 cap(`max_rows`) 페이징은 Edge Function 안에서 돈다 — 왕복·JWT 검증은 한 번. */
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

/** 요청 body의 `slugs`가 거를 slug 목록으로 쓸 수 있는 모양인지(JSON에서 온 값이다). */
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
