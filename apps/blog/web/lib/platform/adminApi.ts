/**
 * Admin Edge Function 호출 추상화 레이어
 *
 * supabase-js의 functions.invoke()를 사용합니다.
 * functions.invoke()는 현재 세션의 JWT를 Authorization 헤더에 자동 첨부합니다.
 *
 * 단위 테스트 가능성을 위해 순수 함수 + dependency injection 패턴을 사용합니다.
 */

// ── 타입 ───────────────────────────────────────────────────────────────────────

export type AdminAction =
  | 'all_post_stats'
  | 'all_posts_trends'
  | 'post_hourly_distribution'
  | 'post_dow_distribution';

export interface AdminApiClient {
  call<T>(action: AdminAction, params?: Record<string, unknown>): Promise<T>;
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
    async call<T>(
      action: AdminAction,
      params?: Record<string, unknown>,
    ): Promise<T> {
      const { data, error } = await supabaseClient.functions.invoke<{
        data: T;
      }>('admin-analytics', {
        body: { action, params },
      });

      if (error) {
        throw new Error(
          `admin-analytics Edge Function 오류 [${action}]: ${error.message}`,
        );
      }

      if (!data) {
        throw new Error(
          `admin-analytics Edge Function이 빈 응답을 반환했습니다 [${action}]`,
        );
      }

      // Edge Function은 { data: T } 형태로 반환합니다.
      return data.data;
    },
  };
}
