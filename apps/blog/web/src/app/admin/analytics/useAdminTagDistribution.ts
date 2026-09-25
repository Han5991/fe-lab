'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { adminPostsIndexQuery } from '@/src/hooks/useAdminViews';

/**
 * admin 포스트 인덱스에서 태그별 빈도수를 계산한다.
 * (analytics/page.tsx는 client 컴포넌트라 server-side getAllTags()를 못 쓴다)
 *
 * 인덱스는 대시보드와 같은 캐시(`adminPostsIndexQuery`)에서 읽는다 — 같은 화면에서
 * 파일을 두 번 받지 않는다. 형식 검증은 저장소가 한다(어긋난 행은 걸러져 온다).
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'tag-distribution'],
    queryFn: async ({ client }) => {
      const posts = await client.ensureQueryData(adminPostsIndexQuery);
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
  });
  return data;
}
