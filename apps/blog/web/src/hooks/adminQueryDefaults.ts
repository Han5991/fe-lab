import type { QueryClient } from '@tanstack/react-query';
// 판정만 필요하므로 admin 배럴(모듈 최상위에서 supabase 클라이언트를 바인딩)이
// 아니라 순수 leaf를 연다 — adminErrors.ts 머리 주석.
import { isRetryableAdminError } from '@/src/domain/analytics/adminErrors';

/**
 * admin 쿼리의 재시도 정책 — 한 번만 다시 시도하고, 4xx는 아예 하지 않는다.
 *
 * 전역 기본값(3회, 1s·2s·4s 백오프)이면 Edge Function이 실패했을 때 스켈레톤이
 * ~7초 돌고 나서야 `src/app/admin/error.tsx`가 안내를 띄운다. admin 읽기는 같은
 * 리전의 한 왕복이라 일시 장애는 한 번이면 가려지고, 설정 오류(ADMIN_EMAIL 미설정
 * 등)는 몇 번을 다시 해도 같다. 401·403은 세션·권한 문제라 재시도가 답이 아니다 —
 * 바로 "다시 로그인" 안내로 간다.
 */
function retryAdminQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isRetryableAdminError(error);
}

/**
 * admin 쿼리(`['admin', …]`) 전부의 정책. 쿼리마다 옮겨 적으면 빠뜨린 쿼리가
 * 전역 기본값(3회 재시도·5분 캐시)을 받는다.
 */
export function setAdminQueryDefaults(client: QueryClient): void {
  client.setQueryDefaults(['admin'], {
    retry: retryAdminQuery,
    // SSG prerender에서는 admin 읽기가 빈 값으로 대기한다(getAdminPostsIndex의
    // window 가드). 전역 기본값(staleTime 5분 + refetchOnMount false)이면 그 빈
    // 캐시가 5분간 남아 차트가 비어 보이므로, 마운트마다 한 번 다시 받는다.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
