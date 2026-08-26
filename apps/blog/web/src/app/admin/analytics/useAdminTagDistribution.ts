'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { getAdminPostsIndex } from '@/domain/analytics/admin';

/**
 * admin 포스트 인덱스에서 태그별 빈도수를 계산한다.
 * (analytics/page.tsx는 client 컴포넌트라 server-side getAllTags()를 못 쓴다)
 *
 * 인덱스 접근은 도메인 저장소(getAdminPostsIndex) 경유다 — 예전에는 이 훅이
 * `/admin-posts-index.json`을 직접 fetch해 저장소와 같은 코드가 두 벌이었다
 * (도메인 행 타입에 tags가 없어서였고, 지금은 있다).
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'tag-distribution'],
    queryFn: async () => {
      const posts = await getAdminPostsIndex();
      const counts = new Map<string, number>();
      for (const post of posts) {
        // 산출물의 tags는 언제나 배열이지만(generate-search-index.ts의
        // `p.tags || []`), 파일이 손으로 고쳐졌거나 형식이 어긋난 경우에도
        // useSuspenseQuery가 페이지째 throw하지 않도록 원소를 방어적으로 거른다.
        if (!Array.isArray(post.tags)) continue;
        for (const tag of post.tags) {
          if (typeof tag !== 'string') continue;
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
