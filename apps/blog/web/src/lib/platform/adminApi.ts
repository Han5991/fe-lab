/**
 * Admin Edge Function 호출 추상화 레이어
 *
 * supabase-js의 functions.invoke()를 사용합니다.
 * functions.invoke()는 현재 세션의 JWT를 Authorization 헤더에 자동 첨부합니다.
 *
 * action 목록·params 형태는 `adminActions.ts`(Edge Function과 공유)가, 응답 형태는
 * `database.types.ts`의 RPC `Returns`(추이 행은 `adminActions.ts`의 `PostTrendRow`)가
 * 단일 출처입니다 — 호출자가 `call<T>()`로 응답 타입을 손으로 적지 않고, 응답은
 * `unknown`으로 받아 `RESULT_GUARDS`로 좁힙니다 (Edge Function은 손으로 배포하므로
 * 클라이언트와 어긋난 채 떠 있을 수 있다).
 *
 * 단위 테스트 가능성을 위해 순수 함수 + dependency injection 패턴을 사용합니다.
 */

import {
  isPostTrendRows,
  isRows,
  type AdminAction,
  type AdminActionParams,
  type AdminActionRpc,
  type PostTrendRow,
  type RowColumns,
} from './adminActions';
import type { Database } from './database.types';

// ── 타입 ───────────────────────────────────────────────────────────────────────

export type { AdminAction, AdminActionParams } from './adminActions';

type DbFunctions = Database['public']['Functions'];

/**
 * RPC의 행 배열 `Returns`. `AdminActionRpc`(`ADMIN_ACTION_RPCS`의 RPC 이름 전부)가 Functions 키가
 * 아니면 여기서 컴파일 에러가 난다 — `get_posts_trends`처럼 행 배열이 아닌 `Json`을 돌려주는 RPC는
 * 이 타입으로 읽지 않는다(그 행은 `adminActions.ts`의 `PostTrendRow`).
 */
type RpcReturns<N extends AdminActionRpc> = DbFunctions[N]['Returns'];

/**
 * 생성 타입이 실제보다 좁은 열. RETURNS TABLE의 bigint를 생성기는 non-null로 적지만,
 * get_all_post_stats는 nullable 열(post_views.view_count)을 coalesce 없이 낸다(저장소의
 * 마이그레이션 기준 — 프로덕션 함수 본문은 저장소와 다를 수 있어 SQL은 아직 고치지 않았다).
 * 응답 타입이 그 null을 말하게 해서, 폴백은 소비자가 보이게 고른다.
 */
type StatsRow = Omit<
  RpcReturns<'get_all_post_stats'>[number],
  'total_views'
> & { total_views: number | null };
type HourlyRow = RpcReturns<'get_post_hourly_distribution'>[number];
type DowRow = RpcReturns<'get_post_dow_distribution'>[number];

/** action별 응답 본문(Edge Function의 `{ data }` 안). */
interface AdminActionResults {
  /** 글별 누적·오늘 조회수(`get_all_post_stats`)와 일별 추이(`get_posts_trends`). */
  posts_overview: { stats: StatsRow[]; trends: PostTrendRow[] };
  post_hourly_distribution: HourlyRow[];
  post_dow_distribution: DowRow[];
}

export type AdminActionResult<A extends AdminAction> = AdminActionResults[A];

/** 행마다 열의 표 — 행 타입(`Returns`)에 묶인다(`RowColumns`, `adminActions.ts`). */
const STATS_COLUMNS = {
  slug: 'string',
  today_views: 'number',
  total_views: 'number|null',
} as const satisfies RowColumns<StatsRow>;
const HOURLY_COLUMNS = {
  hour: 'number',
  view_count: 'number',
} as const satisfies RowColumns<HourlyRow>;
const DOW_COLUMNS = {
  dow: 'number',
  view_count: 'number',
} as const satisfies RowColumns<DowRow>;

/** action마다 그 응답 모양을 좁히는 검사 — 키가 정확히 `AdminAction`이고 검사 대상이 `AdminActionResults`다. */
type ResultGuards = {
  readonly [A in AdminAction]: (
    value: unknown,
  ) => value is AdminActionResults[A];
};

/** action → 응답 본문 검사. 키·검사 대상은 `ResultGuards`가 묶는다(action 이름의 출처는 `adminActions.ts`). */
const RESULT_GUARDS = {
  posts_overview: (
    value: unknown,
  ): value is AdminActionResults['posts_overview'] =>
    typeof value === 'object' &&
    value !== null &&
    'stats' in value &&
    isRows(value.stats, STATS_COLUMNS) &&
    'trends' in value &&
    isPostTrendRows(value.trends),
  post_hourly_distribution: (value: unknown): value is HourlyRow[] =>
    isRows(value, HOURLY_COLUMNS),
  post_dow_distribution: (value: unknown): value is DowRow[] =>
    isRows(value, DOW_COLUMNS),
} as const satisfies ResultGuards;

/** 응답 본문이 그 action의 응답 모양인지. */
function isActionResult<A extends AdminAction>(
  action: A,
  value: unknown,
): value is AdminActionResult<A> {
  return RESULT_GUARDS[action](value);
}

/**
 * params가 필수인 action(`slug`)은 두 번째 인자를 강제하고, 없거나 전부
 * 선택인 action은 생략할 수 있게 한다.
 */
type CallArgs<A extends AdminAction> = undefined extends AdminActionParams[A]
  ? [params?: AdminActionParams[A]]
  : [params: AdminActionParams[A]];

/**
 * admin-analytics 호출 계약. **소비자는 클래스가 아니라 이 인터페이스에 의존한다.**
 *
 * 구현이 하나뿐이라 클래스 타입을 그대로 써도 컴파일은 되지만, 그러면 소비자가
 * 가짜로 대체할 수 없다 — 클래스에 `#client` 프라이빗 필드가 있어 타입이 사실상
 * nominal이 되고, 같은 모양의 평범한 객체는 절대 대입되지 않는다.
 */
export interface AdminApi {
  call<A extends AdminAction>(
    action: A,
    ...args: CallArgs<A>
  ): Promise<AdminActionResult<A>>;
}

/**
 * functions.invoke() 실패의 구조적 부분형 — `message`는 상태와 무관한 고정 문구라,
 * 상태·서버 본문은 `context`(HTTP면 `Response`, 네트워크면 원인 값)에서 읽는다.
 */
export interface FunctionsFailure {
  message: string;
  context?: unknown;
}

/**
 * functions.invoke() 시그니처만 추출한 duck-type 인터페이스.
 * 테스트에서 최소한의 mock 객체를 넘길 수 있도록 구조적 타이핑을 사용합니다.
 */
export interface FunctionsInvoker {
  functions: {
    /** 응답 본문은 `unknown`이다 — 모양은 받은 뒤 확인한다(반환 타입 제네릭은 숨은 단언이다). */
    invoke(
      functionName: string,
      options?: { body?: unknown },
    ): Promise<{ data: unknown; error: FunctionsFailure | null }>;
  };
}

/**
 * admin-analytics 호출 실패 — `status`(응답이 없으면 null)와 본문의 `{ error }` 문구로
 * 화면이 "다시 로그인"과 "서버 장애"를 가른다.
 */
export class AdminApiError extends Error {
  override readonly name = 'AdminApiError';
  readonly action: AdminAction;
  readonly status: number | null;
  readonly serverMessage: string | null;

  constructor(init: {
    action: AdminAction;
    status: number | null;
    serverMessage: string | null;
    /** 사람이 읽을 원인 — 서버 문구가 없을 때(네트워크 실패 등) 메시지에 싣는다. */
    fallbackMessage: string;
    cause?: unknown;
  }) {
    const where = init.status === null ? '' : ` (${init.status})`;
    super(
      `admin-analytics Edge Function 오류 [${init.action}]${where}: ${
        init.serverMessage ?? init.fallbackMessage
      }`,
      { cause: init.cause },
    );
    this.action = init.action;
    this.status = init.status;
    this.serverMessage = init.serverMessage;
  }
}

/** `context`가 HTTP 응답(Response의 구조적 부분형)인지. */
function isHttpResponse(
  value: unknown,
): value is { status: number; json(): Promise<unknown> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof value.status === 'number' &&
    'json' in value &&
    typeof value.json === 'function'
  );
}

/** 실패 응답 본문의 `{ error }` 문구. JSON이 아니거나 모양이 다르면 null. */
async function readServerMessage(response: {
  json(): Promise<unknown>;
}): Promise<string | null> {
  try {
    const body = await response.json();
    return typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
      ? body.error
      : null;
  } catch {
    return null;
  }
}

async function toAdminApiError(
  action: AdminAction,
  failure: FunctionsFailure,
): Promise<AdminApiError> {
  const response = isHttpResponse(failure.context) ? failure.context : null;
  return new AdminApiError({
    action,
    status: response?.status ?? null,
    serverMessage: response ? await readServerMessage(response) : null,
    fallbackMessage: failure.message,
    cause: failure,
  });
}

// ── 클라이언트 ─────────────────────────────────────────────────────────────────

/**
 * admin-analytics Edge Function 클라이언트. 호출할 클라이언트는 생성자로
 * 주입한다 — 프로덕션은 세션이 붙은 `lib/platform/client`, 테스트는
 * `FunctionsInvoker` 모양만 갖춘 가짜다(domain/auth의 AuthRepository와 같은 관례).
 *
 * **인스턴스는 소비자가 필요할 때 만든다.** `domain/analytics/adminRepository`가
 * 첫 호출에 지연 생성하는데, 그건 취향이 아니라 번들 때문이다 — 모듈 최상위에서
 * `new`를 부르면 번들러가 부수효과로 보고 공개 페이지 그래프에서 supabase-js를
 * 떨궈내지 못한다(그 파일 주석 참고). 여기서 싱글톤을 만들어 export하지 말 것.
 *
 * 생성자 파라미터 프로퍼티를 안 쓴 이유는 `erasableSyntaxOnly`다 — 타입만
 * 지워서는 JS가 되지 않는 문법이라 tsconfig가 막는다.
 */
export class AdminApiClient implements AdminApi {
  readonly #client: FunctionsInvoker;

  /** @param client functions.invoke를 가진 Supabase 호환 클라이언트 (JWT 자동 첨부) */
  constructor(client: FunctionsInvoker) {
    this.#client = client;
  }

  async call<A extends AdminAction>(
    action: A,
    ...[params]: CallArgs<A>
  ): Promise<AdminActionResult<A>> {
    const { data, error } = await this.#client.functions.invoke(
      'admin-analytics',
      { body: { action, params } },
    );

    if (error) {
      throw await toAdminApiError(action, error);
    }

    // Edge Function은 { data: 그 action의 응답 } 형태로 반환합니다. RPC가 0행이어도
    // PostgREST는 []를 주므로, 봉투가 없거나 안이 그 action의 모양이 아니면 프로토콜 위반이다.
    const result =
      typeof data === 'object' && data !== null && 'data' in data
        ? data.data
        : undefined;
    if (!isActionResult(action, result)) {
      throw new Error(
        `admin-analytics Edge Function이 계약과 다른 응답을 반환했습니다 [${action}]`,
      );
    }

    return result;
  }
}
