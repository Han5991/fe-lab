import { useSuspenseQuery } from '@tanstack/react-query';
import {
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
} from '@/domain/analytics/repository';
import type { PostStatDetail } from '@/domain/analytics/types';

export type { PostStatDetail };

export function useAdminDashboardData() {
  return useSuspenseQuery({
    queryKey: ['admin', 'dashboard-data'],
    queryFn: async (): Promise<PostStatDetail[]> => {
      const [metadata, stats, trends] = await Promise.all([
        getAdminPostsIndex(),
        getAllPostStats(),
        getAllPostsTrends(),
      ]);

      const trendsMap = new Map<
        string,
        { view_date: string; view_count: number }[]
      >();
      for (const t of trends) {
        const arr = trendsMap.get(t.slug) ?? [];
        arr.push({ view_date: t.view_date, view_count: t.view_count });
        trendsMap.set(t.slug, arr);
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
          trends: trendsMap.get(post.slug) ?? [],
          status: post.status || 'published',
          scheduledDate: post.scheduledDate || null,
        };
      });
    },
  });
}
