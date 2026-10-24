'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { adminPostsIndexQuery } from './useAdminViews';
import { ADMIN_QUERY_PREFIX } from './adminCache';

/**
 * admin 글 인덱스의 태그별 글 수 — 클라이언트 화면이라 서버의 getAllTags()를 못 쓴다.
 * 태그가 하나라도 달린 글 수(`taggedPosts`)를 함께 준다 — 태그 없는 글이 많으면 분포가 그 글들을
 * 말하지 않는다는 것을 카드 머리가 밝힌다.
 */
export function useAdminTagDistribution() {
  const { data } = useSuspenseQuery({
    queryKey: [...ADMIN_QUERY_PREFIX, 'tag-distribution'],
    queryFn: async ({ client }) => {
      const posts = await client.ensureQueryData(adminPostsIndexQuery);
      const counts = new Map<string, number>();
      for (const post of posts) {
        for (const tag of post.tags) {
          counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
      }
      return {
        tags: Array.from(counts.entries())
          .map(([id, count]) => ({ id, count }))
          .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),
        taggedPosts: posts.filter(post => post.tags.length > 0).length,
      };
    },
  });
  return data;
}
