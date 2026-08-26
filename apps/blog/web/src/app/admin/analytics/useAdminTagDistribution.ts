'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { getAdminPostsIndex } from '@/domain/analytics/admin';

/**
 * admin 포스트 인덱스에서 태그별 빈도수를 계산한다.
 * (analytics/page.tsx는 client 컴포넌트라 server-side getAllTags()를 못 쓴다)
 *
 * 인덱스 접근은 도메인 저장소(getAdminPostsIndex) 경유다 — 예전에는 이 훅이
 * `/admin-posts-index.json`을 직접 fetch해 저장소와 같은 코드가 두 벌이었다.
 * 형식 검증도 저장소가 한다(어긋난 행은 걸러져 온다).
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'tag-distribution'],
    queryFn: async () => {
      const posts = await getAdminPostsIndex();
      const counts = new Map<string, number>();
      for (const post of posts) {
        for (const tag of post.tags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries())
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
    },
    // getAdminPostsIndex는 SSG prerender에서 빈 배열을 돌려준다(위 저장소의
    // window 가드). 그 빈 결과가 hydration 캐시에 씨앗으로 남으면 전역
    // staleTime(5분) 동안 빈 차트로 고정되므로, useAdminViews와 같은 이유로
    // 마운트마다 다시 받아온다.
    staleTime: 0,
    refetchOnMount: 'always',
  });
  return data;
}
