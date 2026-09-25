'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { adminPostsIndexQuery } from '@/src/hooks/useAdminViews';

/** admin 글 인덱스의 태그별 글 수 — 클라이언트 화면이라 서버의 getAllTags()를 못 쓴다. */
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
