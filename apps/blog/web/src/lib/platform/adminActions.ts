/**
 * admin-analytics Edge Function 프로토콜 — action 이름과 그것이 대리 호출하는
 * RPC의 대응표, action별 params 형태, 응답 행의 열 검사.
 *
 * **Edge Function(Deno, `supabase/functions/admin-analytics/index.ts`)과 브라우저
 * 클라이언트(`adminApi.ts`)가 이 파일 하나를 import 한다.** 호환 구간은 없다 — 이 계약이
 * 바뀌면 함수와 클라이언트를 함께 배포하고, 한쪽만 나가면 admin 요청이 실패한다.
 *
 * 이 파일에는 **import를 두지 않는다.** Deno는 확장자 없는 상대 import를
 * 해석하지 못하고, Edge 번들러(`supabase functions deploy`)는 entrypoint의 import
 * 그래프를 따라 이 파일을 `supabase/functions` 밖에서 그대로 집어 간다 — 여기서
 * 다른 앱 모듈을 끌어오면 그 파일도 같은 제약을 받는다.
 *
 * RPC 이름이 `database.types.ts`의 Functions 키와 맞는지는 `adminApi.ts`의 `RpcReturns`가
 * 인덱싱으로 검사한다 — 어긋나면 그쪽이 컴파일 에러다.
 *
 * `get_posts_trends`는 `Json`을 돌려줘 생성 타입이 행 모양을 말하지 못한다 — 그 행(`PostTrendRow`)과
 * 열 표를 여기 두고 `isPostTrendRows`로 좁힌다. Edge Function이 RPC 결과를 받는 자리와 클라이언트가
 * 응답을 받는 자리가 같은 가드를 쓴다.
 */

/**
 * action → 그 action이 부르는 RPC(`Database['public']['Functions']`의 키). 클라이언트는 이 RPC들의
 * `Returns`에서 응답 타입을 파생한다. Edge Function은 `posts_overview`에서 둘을 병렬로 불러 한 응답으로
 * 묶는다 — 글 목록 화면이 둘을 늘 같이 쓰므로 왕복(콜드 preflight·JWT 검증 포함)이 한 번이다.
 * `get_posts_trends`는 행을 json 배열 하나로 내 PostgREST max_rows(1000)에 잘리지 않는다
 * (`get_all_post_stats`는 RETURNS TABLE이라 Edge Function이 페이징한다).
 */
export const ADMIN_ACTION_RPCS = {
  posts_overview: ['get_all_post_stats', 'get_posts_trends'],
  post_hourly_distribution: ['get_post_hourly_distribution'],
  post_dow_distribution: ['get_post_dow_distribution'],
} as const;

export type AdminAction = keyof typeof ADMIN_ACTION_RPCS;

/** action이 대리 호출하는 RPC 이름. */
export type AdminActionRpc<A extends AdminAction = AdminAction> =
  (typeof ADMIN_ACTION_RPCS)[A][number];

/** 열의 런타임 검사 — 키가 곧 열 타입의 이름이고, 검사가 통과시키는 값이 그 열의 TS 타입이다. */
const COLUMN_CHECKS = {
  string: (value: unknown): value is string => typeof value === 'string',
  number: (value: unknown): value is number => typeof value === 'number',
  'number|null': (value: unknown): value is number | null =>
    value === null || typeof value === 'number',
};

type ColumnName = keyof typeof COLUMN_CHECKS;

/** 열 타입 → 열 검사 이름. 여기 없는 열 타입이 생기면 `never`라 그 행의 열 표가 컴파일되지 않는다. */
type ColumnTag<T> = [T] extends [string]
  ? 'string'
  : [T] extends [number]
    ? 'number'
    : [T] extends [number | null]
      ? 'number|null'
      : never;

/**
 * 행의 열 → 그 열의 검사 이름. 열 표를 `satisfies RowColumns<Row>`로 묶으면 열이 늘거나 이름·타입이
 * 바뀔 때 표가 컴파일되지 않는다 — 표는 행 타입의 런타임 그림자다.
 */
export type RowColumns<Row> = {
  readonly [K in keyof Row]-?: ColumnTag<Row[K]>;
};

/** 값이 행 배열인지 — `columns`의 열마다 값의 타입까지 본다. */
export function isRows(
  value: unknown,
  columns: Readonly<Record<string, ColumnName>>,
): boolean {
  if (!Array.isArray(value)) return false;
  // Array.isArray는 any[]로 좁힌다 — 행은 unknown으로 다시 받는다.
  const rows: readonly unknown[] = value;
  return rows.every(row => {
    if (typeof row !== 'object' || row === null) return false;
    const values = new Map<string, unknown>(Object.entries(row));
    return Object.entries(columns).every(([name, tag]) =>
      COLUMN_CHECKS[tag](values.get(name)),
    );
  });
}

/** `get_posts_trends`가 내는 json 배열의 한 행 — 글별·일별(KST) 조회수. */
export interface PostTrendRow {
  slug: string;
  /** KST 날짜, `YYYY-MM-DD`. */
  view_date: string;
  view_count: number;
}

const POST_TREND_COLUMNS = {
  slug: 'string',
  view_date: 'string',
  view_count: 'number',
} as const satisfies RowColumns<PostTrendRow>;

/** `get_posts_trends`의 `Json`(또는 응답 본문)이 `PostTrendRow[]`인지 — 행마다 열의 값 타입까지 본다. */
export function isPostTrendRows(value: unknown): value is PostTrendRow[] {
  return isRows(value, POST_TREND_COLUMNS);
}

/**
 * 목록형 action의 선택 params — 이 글들만 서버에서 거른다(anon이 만든 가짜 slug 행이 통계 페이징
 * 상한을 채우거나 추이 json을 키우지 않게). 생략하면 거르지 않는다.
 */
export interface AdminSlugFilter {
  slugs?: readonly string[];
}

/**
 * `slugs` 한 요청의 최대 개수(입력 검증용). `get_all_post_stats` 쪽의 실제 한계는 필터가 실리는
 * 쿼리스트링 길이다 — 한도에 가까워지면 `get_posts_trends`처럼 slug 목록을 RPC 인자(POST 본문)로
 * 받는 RPC로 옮긴다.
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
  /** 글별 누적·오늘 조회수와 일별 추이 — 한 요청(왕복·JWT 검증 한 번)으로 둘 다 받는다. */
  posts_overview: AdminSlugFilter | undefined;
  post_hourly_distribution: { slug: string };
  post_dow_distribution: { slug: string };
}

/**
 * Edge Function 요청 body. `action`으로 판별되는 유니온이라 `switch (body.action)`
 * 안에서 `body.params`가 그 action의 형태로 함께 좁혀진다. params가 필수인
 * action(slug)은 여기서도 필수다 — 클라이언트 `call()`의 인자 규칙과 같은 파생이다.
 */
export type AdminRequest = {
  [A in AdminAction]: undefined extends AdminActionParams[A]
    ? { action: A; params?: AdminActionParams[A] }
    : { action: A; params: AdminActionParams[A] };
}[AdminAction];

/** `parseAdminRequest`의 결과 — 실패면 400으로 돌려줄 사유를 싣는다. */
export type ParsedAdminRequest =
  { ok: true; request: AdminRequest } | { ok: false; error: string };

/** 런타임 가드 — 요청 body의 `action`이 등록된 것인지. 프로토타입 키(`toString` 등)는 거른다. */
export function isAdminAction(value: unknown): value is AdminAction {
  return typeof value === 'string' && Object.hasOwn(ADMIN_ACTION_RPCS, value);
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

/**
 * Edge Function 요청 body(JSON에서 온 값)를 `AdminRequest`로 좁힌다.
 *
 * action마다 params 모양까지 여기서 확인한다. 그래서 통과한 요청은 단언 없이
 * `AdminRequest` 그대로 믿어도 되고, Edge Function의 case는 params를 다시 확인하지
 * 않는다. Deno 파일이라 vitest가 못 여는 Edge Function 대신 이 함수가 테스트된다.
 *
 * action을 추가하면 아래 switch가 모든 경로에서 값을 돌려주지 않아 컴파일이 깨진다.
 */
export function parseAdminRequest(body: unknown): ParsedAdminRequest {
  const record: object = typeof body === 'object' && body !== null ? body : {};
  const action = 'action' in record ? record.action : undefined;
  if (!isAdminAction(action)) {
    return { ok: false, error: `알 수 없는 action: ${String(action)}` };
  }
  const params: object =
    'params' in record &&
    typeof record.params === 'object' &&
    record.params !== null
      ? record.params
      : {};

  switch (action) {
    case 'posts_overview': {
      const slugs = 'slugs' in params ? params.slugs : undefined;
      if (slugs === undefined) return { ok: true, request: { action } };
      if (!isSlugList(slugs)) {
        return {
          ok: false,
          error: `slugs 파라미터는 문자열 배열(최대 ${MAX_FILTER_SLUGS}개)이어야 합니다.`,
        };
      }
      return { ok: true, request: { action, params: { slugs } } };
    }
    case 'post_hourly_distribution':
    case 'post_dow_distribution': {
      const slug = 'slug' in params ? params.slug : undefined;
      if (typeof slug !== 'string' || slug.length === 0) {
        return { ok: false, error: 'slug 파라미터가 필요합니다.' };
      }
      return { ok: true, request: { action, params: { slug } } };
    }
  }
}
