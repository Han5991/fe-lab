import type { QueryClient } from '@tanstack/react-query';

/** admin 데이터 쿼리 키의 접두 — 정책(adminQueryDefaults)·비우기·각 쿼리가 이 값에서 키를 만든다. */
export const ADMIN_QUERY_PREFIX = ['admin'] as const;

/**
 * 가드의 세션 쿼리 키. 데이터 쿼리와 정책이 달라(admin 기본값을 받지 않는다) 접두를 나눴다 —
 * 그래서 데이터 접두로 지울 때 함께 지워지지 않고, 아래 두 함수가 따로 다룬다.
 */
export const ADMIN_SESSION_QUERY_KEY = ['admin-auth-session'] as const;

/** 이 탭에 남은 admin 데이터 캐시를 지운다 — 다른 계정·뒤로 가기에 옛 집계가 보이지 않게. */
export function clearAdminData(client: QueryClient): void {
  client.removeQueries({ queryKey: ADMIN_QUERY_PREFIX });
}

/**
 * 이 탭의 admin 세션이 끝났다(로그아웃·다른 탭 로그아웃) — 데이터와 가드의 세션 캐시를 함께
 * 비운다. 세션 캐시는 지우지 않고 null로 덮는다: 남기면 뒤로 가기로 옛 세션 화면이 그려지고,
 * 지우면 마운트된 가드가 다시 물어 화면이 번쩍인다.
 */
export function endAdminSession(client: QueryClient): void {
  clearAdminData(client);
  client.setQueryData(ADMIN_SESSION_QUERY_KEY, null);
}
