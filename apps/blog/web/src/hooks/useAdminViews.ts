import { useSuspenseQuery } from '@tanstack/react-query';
import {
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
} from '@/src/domain/analytics/admin';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';

export type { PostStatDetail };

export function useAdminDashboardData() {
  return useSuspenseQuery({
    queryKey: ['admin', 'dashboard-data'],
    queryFn: async (): Promise<PostStatDetail[]> => {
      // 인덱스를 먼저 받는다 — 조회수 두 읽기는 이 slug들로 서버에서 거른다
      // (anon이 만든 가짜 slug 행이 1000행 cap을 채워 실제 글을 밀어내지 않게).
      const metadata = await getAdminPostsIndex();
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
