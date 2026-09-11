/**
 * Admin Edge Function 호출 추상화 레이어
 *
 * supabase-js의 functions.invoke()를 사용합니다.
 * functions.invoke()는 현재 세션의 JWT를 Authorization 헤더에 자동 첨부합니다.
 *
 * action 목록·params 형태는 `adminActions.ts`(Edge Function과 공유)가, 응답 형태는
 * `database.types.ts`의 RPC `Returns`가 단일 출처입니다 — 호출자가 `call<T>()`로
 * 응답 타입을 손으로 적지 않습니다.
 *
 * 단위 테스트 가능성을 위해 순수 함수 + dependency injection 패턴을 사용합니다.
 */

import type {
  AdminAction,
  AdminActionParams,
  AdminActionRpc,
} from './adminActions.ts';
import type { Database } from './database.types.ts';

// ── 타입 ───────────────────────────────────────────────────────────────────────

export type { AdminAction, AdminActionParams } from './adminActions.ts';

type DbFunctions = Database['public']['Functions'];

/**
 * action의 응답 = 대리 호출하는 RPC의 `Returns`.
 * `ADMIN_ACTION_RPC`의 값이 Functions 키가 아니면 여기서 컴파일 에러가 난다.
 */
export type AdminActionResult<A extends AdminAction> =
  DbFunctions[AdminActionRpc<A>]['Returns'];

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
 * functions.invoke() 시그니처만 추출한 duck-type 인터페이스.
 * 테스트에서 최소한의 mock 객체를 넘길 수 있도록 구조적 타이핑을 사용합니다.
 */
export interface FunctionsInvoker {
  functions: {
    invoke<T>(
      functionName: string,
      options?: { body?: unknown },
    ): Promise<{ data: T | null; error: { message: string } | null }>;
  };
}

// ── 클라이언트 ─────────────────────────────────────────────────────────────────

/**
 * admin-analytics Edge Function 클라이언트. 호출할 클라이언트는 생성자로
 * 주입한다 — 프로덕션은 세션이 붙은 supabase 클라이언트(앱이 만든다), 테스트는
 * `FunctionsInvoker` 모양만 갖춘 가짜다(`AuthRepository`와 같은 관례).
 *
 * **여기서 싱글톤을 만들어 export하지 말 것.** 모듈 최상위 `new`는 번들러에
 * 부수효과라, 이 파일이 그래프에 닿기만 해도 supabase-js가 통째로 남는다.
 * 인스턴스를 만드는 것은 소비자의 일이고, 그 자리는 공개 페이지 그래프에서
 * 갈라져 있어야 한다 — `apps/blog/web`에서는 admin 전용 배럴
 * (`src/domain/analytics/admin.ts`)이 그 자리다(공개 배럴은 팩토리조차 최상위에서
 * 부르지 않는다). 실제로 갈라졌는지는 `check-bundle`의 admin 규칙이 산출물에서
 * 확인한다.
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
    const { data, error } = await this.#client.functions.invoke<{
      data: AdminActionResult<A> | null;
    }>('admin-analytics', {
      body: { action, params },
    });

    if (error) {
      throw new Error(
        `admin-analytics Edge Function 오류 [${action}]: ${error.message}`,
      );
    }

    // Edge Function은 { data: Returns } 형태로 반환합니다. RPC가 0행이어도
    // PostgREST는 []를 주므로, 봉투가 없거나 안이 null이면 프로토콜 위반이다.
    if (!data || data.data == null) {
      throw new Error(
        `admin-analytics Edge Function이 빈 응답을 반환했습니다 [${action}]`,
      );
    }

    return data.data;
  }
}
