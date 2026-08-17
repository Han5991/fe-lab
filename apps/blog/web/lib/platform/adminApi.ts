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
} from './adminActions';
import type { Database } from './database.types';

// ── 타입 ───────────────────────────────────────────────────────────────────────

export type { AdminAction, AdminActionParams } from './adminActions';

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

export interface AdminApiClient {
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

// ── 팩토리 함수 ────────────────────────────────────────────────────────────────

/**
 * AdminApiClient를 생성합니다.
 *
 * @param supabaseClient - functions.invoke를 가진 Supabase 호환 클라이언트 (JWT 자동 첨부)
 * @returns AdminApiClient 인스턴스
 */
export function createAdminApiClient(
  supabaseClient: FunctionsInvoker,
): AdminApiClient {
  return {
    async call<A extends AdminAction>(
      action: A,
      ...[params]: CallArgs<A>
    ): Promise<AdminActionResult<A>> {
      const { data, error } = await supabaseClient.functions.invoke<{
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
    },
  };
}
