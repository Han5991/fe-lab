import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import {
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
} from '@/src/domain/analytics/admin';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';

export type { PostStatDetail };

/**
 * admin 글 인덱스 — 빌드 산출물이라 배포 때만 바뀐다. 대시보드와 태그 분포가 이
 * 캐시 하나를 나눠 쓰고, 마운트마다 다시 받지 않는다(조회수 읽기가 매번 이 왕복을
 * 기다리지 않게).
 *
 * 재시도는 끈다 — 이것을 여는 쿼리가 `['admin']` 정책대로 다시 시도하므로, 여기서도
 * 하면 실패가 두 겹으로 재시도된다.
 */
export const adminPostsIndexQuery = queryOptions({
  queryKey: ['admin', 'posts-index'],
  queryFn: getAdminPostsIndex,
  staleTime: Infinity,
  retry: false,
});

export function useAdminDashboardData() {
  return useSuspenseQuery({
    queryKey: ['admin', 'dashboard-data'],
    queryFn: async ({ client }): Promise<PostStatDetail[]> => {
      // 조회수 두 읽기는 인덱스의 slug로 서버에서 거른다(anon이 만든 가짜 slug
      // 행이 1000행 cap을 채워 실제 글을 밀어내지 않게).
      const metadata = await client.ensureQueryData(adminPostsIndexQuery);
      const slugs = metadata.map(post => post.slug);
      const [stats, trends] = await Promise.all([
        getAllPostStats(slugs),
        getAllPostsTrends(slugs),
      ]);

      // 글 → (날짜 → 조회수). 같은 (slug, 날짜)가 두 번 오면 나중 값 하나만 남긴다
      // — Edge Function이 살아 있는 표를 페이지로 자르다 경계 행을 한 번 더 싣는
      // 경우(paging.ts의 key 주석)에 그 날이 두 번 합산되지 않게 한다. 서버도
      // 같은 키로 거르지만, 함수 배포는 수동이라 화면 쪽도 스스로 지킨다.
      const trendsMap = new Map<string, Map<string, number>>();
      for (const t of trends) {
        const byDate = trendsMap.get(t.slug) ?? new Map<string, number>();
        byDate.set(t.view_date, t.view_count);
        trendsMap.set(t.slug, byDate);
      }
      const trendsOf = (slug: string): TrendPoint[] =>
        Array.from(trendsMap.get(slug) ?? [], ([view_date, view_count]) => ({
          view_date,
          view_count,
        }));

      const statsMap = new Map(stats.map(s => [s.slug, s]));

      return metadata.map(post => {
        const postStats = statsMap.get(post.slug);
        return {
          slug: post.slug,
          title: post.title,
          date: post.date,
          totalViews: postStats?.total_views ?? 0,
          todayViews: postStats?.today_views ?? 0,
          trends: trendsOf(post.slug),
          // 폴백은 fail-closed('draft')여야 한다. 'published'로 두면 인덱스가
          // 깨졌을 때 draft·scheduled 글이 admin 대시보드에서 공개 글로 보인다.
          status: post.status || 'draft',
          scheduledDate: post.scheduledDate || null,
        };
      });
    },
  });
}
