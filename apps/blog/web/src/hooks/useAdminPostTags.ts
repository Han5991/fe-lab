'use client';

import {
  queryOptions,
  usePrefetchQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import {
  adminDashboardDataQuery,
  adminPostsIndexQuery,
  type PostStatDetail,
} from './useAdminViews';
import { ADMIN_QUERY_PREFIX } from './adminCache';

/**
 * 글마다의 태그(slug → 태그) — admin 글 인덱스에서 뽑는다. 대시보드 데이터(`PostStatDetail`)는
 * 조회수 계산에 쓰는 필드만 들고 있어 태그가 없다.
 *
 * 인덱스 쿼리를 직접 구독하지 않고 파생 쿼리로 두는 이유는 태그 분포(`useAdminTagDistribution`)와
 * 같다 — 인덱스 쿼리는 재시도를 끄고(`adminPostsIndexQuery`) 여는 쪽이 재시도하게 해 두었다. 파생 쿼리는
 * 캐시된 인덱스를 `ensureQueryData`로 읽는다.
 */
export const adminPostTagsQuery = queryOptions({
  queryKey: [...ADMIN_QUERY_PREFIX, 'post-tags'],
  queryFn: async ({
    client,
  }): Promise<ReadonlyMap<string, readonly string[]>> => {
    const posts = await client.ensureQueryData(adminPostsIndexQuery);
    return new Map(posts.map(post => [post.slug, post.tags]));
  },
});

/**
 * 대시보드 데이터와 글마다의 태그를 한 번에 기다린다 — 글 통계 패널은 둘 다 있어야 그린다. 차례로 기다리면
 * (대시보드 → 태그) 앞이 풀린 뒤에야 태그 쿼리가 생겨 패널이 한 번 더 suspend하고, 데이터가 React의 드러냄
 * throttle 창(300ms) 뒤에 오면(프로덕션) React가 그 드러냄을 300ms 더 미뤄 패널이 목록보다 늦게 섰다(실측).
 *
 * 태그 요청은 첫 렌더에서 대시보드 데이터와 함께 걸어 둔다(`usePrefetchQuery`). 태그는 글 인덱스만 읽어
 * 인덱스 뒤에 Edge Function까지 기다리는 대시보드 데이터보다 먼저 끝나므로, 대시보드가 풀린 다음 렌더에서
 * 태그는 캐시에서 바로 읽힌다 — suspend가 한 번이다. `useSuspenseQueries`도 같은 일을 하지만 admin 청크에
 * 없던 `QueriesObserver`를 실어 JS가 +1.3KB(gzip) 늘었다.
 */
export function useAdminPostsWithTags(): {
  posts: PostStatDetail[];
  tagsBySlug: ReadonlyMap<string, readonly string[]>;
} {
  usePrefetchQuery(adminPostTagsQuery);
  const { data: posts } = useSuspenseQuery(adminDashboardDataQuery);
  const { data: tagsBySlug } = useSuspenseQuery(adminPostTagsQuery);
  return { posts, tagsBySlug };
}
