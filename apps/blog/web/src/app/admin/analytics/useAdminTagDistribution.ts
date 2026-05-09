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
      // useSuspenseQuery는 가까운 ErrorBoundary로 throw를 위임하므로
      // 응답 코드와 형식을 명시적으로 검증합니다 (404나 깨진 JSON 시 .json()이
      // 그대로 throw되어 페이지 전체가 깨지는 것을 막습니다).
      const res = await fetch('/admin-posts-index.json');
      if (!res.ok) {
        throw new Error(
          `admin-posts-index.json fetch failed: ${res.status} ${res.statusText}`,
        );
      }
      const json: unknown = await res.json();
      const posts: AdminPostMeta[] = Array.isArray(json)
        ? (json as AdminPostMeta[])
        : [];
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
