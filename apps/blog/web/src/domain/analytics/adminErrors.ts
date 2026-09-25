/**
 * admin 조회 실패의 분류 — 에러 경계의 안내 문구와 쿼리 재시도 정책이 쓴다.
 *
 * **이 모듈은 supabase 클라이언트를 만들지 않는다**(`lib/platform/adminApi.ts`는
 * 타입만 import하는 순수 모듈이다). admin 배럴(`./admin`)은 저장소를 열면서
 * 모듈 최상위에서 클라이언트를 바인딩하므로, 판정만 필요한 소비자(에러 경계)는
 * 배럴 대신 이 모듈을 직접 연다 — `domain/auth/adminAccess`와 같은 관례다.
 */

import { AdminApiError } from '../../lib/platform/adminApi';

export { AdminApiError };

/**
 * 화면이 가르는 실패 종류.
 * - `unauthenticated`: 401 — 세션이 없거나 만료됐다(다시 로그인).
 * - `forbidden`: 403 — 로그인은 됐지만 관리자 계정이 아니다.
 * - `other`: 그 밖의 전부(서버 설정·RPC 실패·네트워크).
 */
export type AdminFailureKind = 'unauthenticated' | 'forbidden' | 'other';

export function adminFailureKind(error: unknown): AdminFailureKind {
  if (error instanceof AdminApiError) {
    if (error.status === 401) return 'unauthenticated';
    if (error.status === 403) return 'forbidden';
  }
  return 'other';
}

/**
 * 다시 시도할 가치가 있는 실패인가. 4xx(요청 형식·인증·권한)는 몇 번을 다시
 * 보내도 같은 답이라 재시도하지 않는다 — 기다리게만 하고 안내가 늦어진다.
 */
export function isRetryableAdminError(error: unknown): boolean {
  return !(
    error instanceof AdminApiError &&
    error.status !== null &&
    error.status >= 400 &&
    error.status < 500
  );
}
