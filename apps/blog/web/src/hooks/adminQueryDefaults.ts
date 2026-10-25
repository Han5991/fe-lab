import type { QueryClient } from '@tanstack/react-query';
// admin 배럴은 supabase 클라이언트를 바인딩하므로 순수 leaf를 연다.
import { isRetryableAdminError } from '@/src/domain/analytics/adminErrors';
import { ADMIN_QUERY_PREFIX } from './adminCache';

/**
 * 한 번만 다시 시도하고 4xx는 하지 않는다 — 전역 기본값(3회)이면 안내가 ~7초 늦고,
 * 설정 오류·권한 문제는 다시 해도 같다.
 */
function retryAdminQuery(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && isRetryableAdminError(error);
}

/** admin 쿼리(`['admin', …]`) 전부의 정책 — 쿼리마다 적으면 빠뜨린 쿼리가 전역 기본값을 받는다. */
export function setAdminQueryDefaults(client: QueryClient): void {
  client.setQueryDefaults(ADMIN_QUERY_PREFIX, {
    retry: retryAdminQuery,
    // 받은 지 30초 안의 재마운트(화면 이동·패널 열기)는 다시 받지 않고, 지나면 마운트가 뒤에서 다시
    // 받는다 — 구독이 새로 붙을 때마다 받던 때(staleTime 0 + 'always')는 뷰당 Edge 요청이 두 배였고 화면이
    // "새로고침 중…"으로 한 번 더 깜빡였다. 새로고침 버튼(`refetch`)은 신선해도 강제로 받는다.
    // `refetchOnMount: true`를 적는 이유: admin QueryClient의 기본값이 `false`라 빼면 staleTime이 아무 일도
    // 못 하고 새로고침 버튼만 데이터를 고친다(`queryClient.test.ts`가 잠근다). SSG 프리렌더의 빈 결과가
    // 캐시에 남을 걱정은 없다 — 서버는 렌더마다 QueryClient를 새로 만들고 캐시를 내려보내지 않는다.
    staleTime: 30_000,
    refetchOnMount: true,
    // admin 데이터 훅은 전부 suspense라 실패가 admin 에러 경계로 던져지고, 경계가
    // 401·403을 거른 뒤 보고한다 — 캐시가 같은 실패를 또 보고하지 않게 한다.
    meta: { errorsReportedByBoundary: true },
  });
}
