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
    // SSG prerender 단계에서 getAdminPostsIndex가 typeof window 가드로 빈 배열을
    // 반환하기 때문에 SSR HTML은 placeholder 상태입니다. 글로벌 default
    // (staleTime 5분 + refetchOnMount false) 그대로면 그 빈 캐시가 클라이언트에
    // 그대로 hydrate된 후 5분간 refetch되지 않아 차트가 영원히 비어 보입니다.
    // 0 + 'always'로 hydration 직후 1회 refetch를 강제합니다.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<PostStatDetail[]> => {
      const [metadata, stats, trends] = await Promise.all([
        getAdminPostsIndex(),
        getAllPostStats(),
        getAllPostsTrends(),
      ]);

      const trendsMap = new Map<string, TrendPoint[]>();
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
          // 폴백은 fail-closed('draft')여야 한다. 'published'로 두면 인덱스가
          // 깨졌을 때 draft·scheduled 글이 admin 대시보드에서 공개 글로 보인다.
          status: post.status || 'draft',
          scheduledDate: post.scheduledDate || null,
        };
      });
    },
  });
}
