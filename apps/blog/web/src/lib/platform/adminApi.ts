/**
 * Admin Edge Function 호출 추상화 레이어
 *
 * supabase-js의 functions.invoke()를 사용합니다.
 * functions.invoke()는 현재 세션의 JWT를 Authorization 헤더에 자동 첨부합니다.
 *
 * action 목록·params 형태는 `adminActions.ts`(Edge Function과 공유)가, 응답 형태는
 * `database.types.ts`의 RPC `Returns`가 단일 출처입니다 — 호출자가 `call<T>()`로
 * 응답 타입을 손으로 적지 않고, 응답은 `unknown`으로 받아 `RESULT_COLUMNS`로 좁힙니다
 * (Edge Function은 손으로 배포하므로 클라이언트와 어긋난 채 떠 있을 수 있다).
 *
 * 단위 테스트 가능성을 위해 순수 함수 + dependency injection 패턴을 사용합니다.
 */

import type {
  AdminAction,
  AdminActionParams,
  AdminActionRpc,
} from './adminActions';
import type { Database } from './database.types';

// ── 타입 ───────────────────────────────────────────────────────────────────────

export type { AdminAction, AdminActionParams } from './adminActions';

type DbFunctions = Database['public']['Functions'];

/**
 * action의 응답 = 대리 호출하는 RPC의 `Returns`.
 * `ADMIN_ACTION_RPC`의 값이 Functions 키가 아니면 여기서 컴파일 에러가 난다.
 */
type GeneratedRow<A extends AdminAction> =
  DbFunctions[AdminActionRpc<A>]['Returns'][number];

/**
 * 생성 타입이 실제보다 좁은 열. RETURNS TABLE의 bigint를 생성기는 non-null로 적지만,
 * get_all_post_stats는 nullable 열(post_views.view_count)을 coalesce 없이 낸다(저장소의
 * 마이그레이션 기준 — 프로덕션 함수 본문은 저장소와 다를 수 있어 SQL은 아직 고치지 않았다).
 * 응답 타입이 그 null을 말하게 해서, 폴백은 소비자가 보이게 고른다.
 */
interface NullableColumns {
  all_post_stats: 'total_views';
}

type ResultRow<A extends AdminAction> = A extends keyof NullableColumns
  ? Omit<GeneratedRow<A>, NullableColumns[A]> & {
      [K in NullableColumns[A]]: GeneratedRow<A>[K] | null;
    }
  : GeneratedRow<A>;

export type AdminActionResult<A extends AdminAction> = ResultRow<A>[];

/** 열의 런타임 검사 — 키가 곧 열 타입의 이름이다. */
const COLUMN_CHECKS = {
  string: (value: unknown) => typeof value === 'string',
  number: (value: unknown) => typeof value === 'number',
  'number|null': (value: unknown) =>
    value === null || typeof value === 'number',
};

/** 열 타입 → 검사 이름. 여기 없는 열 타입이 생기면 `never`라 아래 표가 컴파일되지 않는다. */
type ColumnTag<T> = [T] extends [string]
  ? 'string'
  : [T] extends [number]
    ? 'number'
    : [T] extends [number | null]
      ? 'number|null'
      : never;

/** action → 응답 행의 열 → 그 열의 검사 이름. 키 전부가 `AdminAction`과 `Returns`에서 온다. */
type ResultColumns = {
  readonly [A in AdminAction]: {
    readonly [K in keyof ResultRow<A>]-?: ColumnTag<ResultRow<A>[K]>;
  };
};

/**
 * action마다 응답 행의 열. 키와 열 타입이 `Returns`에 묶여(satisfies) 열이 늘거나 이름·타입이
 * 바뀌면 여기서 컴파일 에러가 난다 — 타입 사본이 아니라 그 타입의 런타임 그림자다.
 */
const RESULT_COLUMNS = {
  all_post_stats: {
    slug: 'string',
    today_views: 'number',
    total_views: 'number|null',
  },
  all_posts_trends: {
    slug: 'string',
    view_count: 'number',
    view_date: 'string',
  },
  post_hourly_distribution: { hour: 'number', view_count: 'number' },
  post_dow_distribution: { dow: 'number', view_count: 'number' },
} as const satisfies ResultColumns;

/** 응답 본문이 그 action의 `Returns`(행 배열)인지 — 열마다 값의 타입까지 본다. */
function isActionResult<A extends AdminAction>(
  action: A,
  value: unknown,
): value is AdminActionResult<A> {
  const columns: Readonly<Record<string, keyof typeof COLUMN_CHECKS>> =
    RESULT_COLUMNS[action];
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

    // Edge Function은 { data: Returns } 형태로 반환합니다. RPC가 0행이어도
    // PostgREST는 []를 주므로, 봉투가 없거나 안이 행 배열이 아니면 프로토콜 위반이다.
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
