/**
 * admin 조회 실패의 분류 — 에러 경계와 재시도 정책이 쓴다. supabase 클라이언트를
 * 만들지 않는 순수 모듈이라, 판정만 필요한 소비자는 배럴 대신 이 모듈을 연다.
 */

import { AdminApiError } from '../../lib/platform/adminApi';

export { AdminApiError };

/** 화면이 가르는 실패 종류 — 401은 다시 로그인, 403은 관리자 아님, 나머지는 other. */
export type AdminFailureKind = 'unauthenticated' | 'forbidden' | 'other';

export function adminFailureKind(error: unknown): AdminFailureKind {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return 'unauthenticated';
    if (error.status === 403) return 'forbidden';
  }
  return 'other';
}

/** 다시 시도할 가치가 있는 실패인가 — 4xx는 다시 보내도 같은 답이다. */
export function isRetryableAdminError(error: unknown): boolean {
  return !(
    error instanceof AdminApiError &&
    error.status !== null &&
    error.status >= 400 &&
    error.status < 500
  );
}
