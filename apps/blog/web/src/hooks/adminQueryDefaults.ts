import type { QueryClient } from '@tanstack/react-query';
// admin 배럴은 supabase 클라이언트를 바인딩하므로 순수 leaf를 연다.
import { isRetryableAdminError } from '@/src/domain/analytics/adminErrors';

/**
 * 한 번만 다시 시도하고 4xx는 하지 않는다 — 전역 기본값(3회)이면 안내가 ~7초 늦고,
 * 설정 오류·권한 문제는 다시 해도 같다.
 */
function retryAdminQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isRetryableAdminError(error);
}

/** admin 쿼리(`['admin', …]`) 전부의 정책 — 쿼리마다 적으면 빠뜨린 쿼리가 전역 기본값을 받는다. */
export function setAdminQueryDefaults(client: QueryClient): void {
  client.setQueryDefaults(['admin'], {
    retry: retryAdminQuery,
    // SSG prerender의 빈 결과가 캐시에 남지 않게 마운트마다 다시 받는다.
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
