'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

interface AdminPostMeta {
  slug: string;
  title: string;
  tags?: string[];
}

/**
 * admin-posts-index.json을 그대로 가져와 태그별 빈도수를 계산한다.
 * (analytics/page.tsx는 client 컴포넌트라 server-side getAllTags()를 못 쓴다)
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'tag-distribution'],
    queryFn: async () => {
      const res = await fetch('/admin-posts-index.json').then(r => r.json());
      const posts = (res ?? []) as AdminPostMeta[];
      const counts = new Map<string, number>();
      for (const post of posts) {
        for (const tag of post.tags ?? []) {
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
