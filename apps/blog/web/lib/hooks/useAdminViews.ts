import { useSuspenseQuery } from '@tanstack/react-query';
import { client } from '../client';

export interface PostStatDetail {
  slug: string;
  title: string;
  date: string | null;
  totalViews: number;
  todayViews: number;
  trends: { view_date: string; view_count: number }[];
}

export function useAdminDashboardData() {
  return useSuspenseQuery({
    queryKey: ['admin', 'dashboard-data'],
    queryFn: async (): Promise<PostStatDetail[]> => {
      // Fetch post metadata, overall stats, and daily trends concurrently
      const [metaRes, statsRes, trendsRes] = await Promise.all([
        fetch('/search-index.json').then(
          res =>
            res.json() as Promise<
              { slug: string; title: string; date: string | null }[]
            >,
        ),
        client.rpc('get_all_post_stats'),
        client.rpc('get_all_posts_trends'),
      ]);

      if (statsRes.error) throw statsRes.error;
      if (trendsRes.error) throw trendsRes.error;

      const metadata = metaRes || [];
      const stats = statsRes.data || [];
      const trends = trendsRes.data || [];

      // Group trends by slug
      const trendsMap = new Map<
        string,
        { view_date: string; view_count: number }[]
      >();
      for (const t of trends) {
        if (!trendsMap.has(t.slug)) {
          trendsMap.set(t.slug, []);
        }
        trendsMap.get(t.slug)!.push({
          view_date: t.view_date,
          view_count: Number(t.view_count),
        });
      }

      // Map stats by slug
      const statsMap = new Map<
        string,
        { total_views: number; today_views: number }
      >();
      for (const s of stats) {
        statsMap.set(s.slug, {
          total_views: Number(s.total_views),
          today_views: Number(s.today_views),
        });
      }

      // Combine into the final shape
      const combined: PostStatDetail[] = metadata.map(post => {
        const postStats = statsMap.get(post.slug) || {
          total_views: 0,
          today_views: 0,
        };
        const postTrends = trendsMap.get(post.slug) || [];

        return {
          slug: post.slug,
          title: post.title,
          date: post.date,
          totalViews: postStats.total_views,
          todayViews: postStats.today_views,
          trends: postTrends,
        };
      });

      return combined;
    },
  });
}
