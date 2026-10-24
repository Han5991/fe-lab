'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { adminPostsIndexQuery } from './useAdminViews';
import { ADMIN_QUERY_PREFIX } from './adminCache';

/**
 * 글마다의 태그(slug → 태그) — admin 글 인덱스에서 뽑는다. 대시보드 데이터(`PostStatDetail`)는
 * 조회수 계산에 쓰는 필드만 들고 있어 태그가 없다.
 *
 * 인덱스 쿼리를 직접 구독하지 않고 파생 쿼리로 두는 이유는 태그 분포(`useAdminTagDistribution`)와
 * 같다 — admin 쿼리는 마운트마다 다시 받으므로(`adminQueryDefaults`) 인덱스를 구독하면 화면이
 * 열릴 때마다 인덱스 파일을 또 받는다. 파생 쿼리는 캐시된 인덱스를 `ensureQueryData`로 읽는다.
 */
export function useAdminPostTags(): ReadonlyMap<string, readonly string[]> {
  const { data } = useSuspenseQuery({
    queryKey: [...ADMIN_QUERY_PREFIX, 'post-tags'],
    queryFn: async ({ client }) => {
      const posts = await client.ensureQueryData(adminPostsIndexQuery);
      return new Map(posts.map(post => [post.slug, post.tags]));
    },
  });
  return data;
}
