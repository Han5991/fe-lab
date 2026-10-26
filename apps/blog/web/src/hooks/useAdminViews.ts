import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  getAdminPostsIndex,
  getPostsOverview,
} from '@/src/domain/analytics/admin';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';
import { ADMIN_QUERY_PREFIX } from './adminCache';

export type { PostStatDetail };

/**
 * admin 글 인덱스 — 배포 때만 바뀌어 마운트마다 다시 받지 않는다. 재시도는 이것을 여는
 * 쿼리가 하므로 여기서는 끈다(두 겹으로 재시도하지 않게).
 */
export const adminPostsIndexQuery = queryOptions({
  queryKey: [...ADMIN_QUERY_PREFIX, 'posts-index'],
  queryFn: getAdminPostsIndex,
  staleTime: Infinity,
  retry: false,
});

/**
 * 대시보드 데이터 — 글 인덱스의 글마다 누적 조회수와 일별 추이를 붙인다. 대시보드·분석 두 화면(목록·지표·글 통계 패널)이
 * 이 쿼리 하나를 읽고, 각 훅(`useAnalyticsOverview` 등)이 거기서 자기 몫을 파생한다 — Edge Function 요청은
 * 구독이 몇이든 한 번이다(`posts_overview`).
 */
export const adminDashboardDataQuery = queryOptions({
  queryKey: [...ADMIN_QUERY_PREFIX, 'dashboard-data'],
  queryFn: async ({ client }): Promise<PostStatDetail[]> => {
    // 조회수 읽기는 인덱스의 slug로 서버에서 거른다(이유는 `AdminSlugFilter`).
    const metadata = await client.ensureQueryData(adminPostsIndexQuery);
    const slugs = metadata.map(post => post.slug);
    const { stats, trends } = await getPostsOverview(slugs);

    // 추이는 (slug, 날짜)당 한 행이고 slug·날짜 순이다(`get_posts_trends`) — 글별로 모으기만 한다.
    const trendsBySlug = new Map<string, TrendPoint[]>();
    for (const { slug, view_date, view_count } of trends) {
      const points = trendsBySlug.get(slug) ?? [];
      points.push({ view_date, view_count });
      trendsBySlug.set(slug, points);
    }

    const statsMap = new Map(stats.map(s => [s.slug, s]));

    return metadata.map(post => {
      const postStats = statsMap.get(post.slug);
      return {
        slug: post.slug,
        title: post.title,
        date: post.date,
        totalViews: postStats?.total_views ?? 0,
        todayViews: postStats?.today_views ?? 0,
        trends: trendsBySlug.get(post.slug) ?? [],
        // 모르는 값의 fail-closed 폴백은 경계(getAdminPostsIndex)가 이미 했다.
        status: post.status,
        scheduledDate: post.scheduledDate || null,
      };
    });
  },
});

export function useAdminDashboardData() {
  return useSuspenseQuery(adminDashboardDataQuery);
}
