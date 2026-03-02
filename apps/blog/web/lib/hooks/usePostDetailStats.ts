import { useSuspenseQuery } from '@tanstack/react-query';
import { client } from '../client';
import { useAdminDashboardData } from './useAdminViews';
import { computeDerivedStats } from '../../domain/analytics/service';
import type {
  PostDetailStats,
  HourlyDistribution,
  DowDistribution,
} from '../../domain/analytics/types';

export type {
  PostDetailStats,
  HourlyDistribution,
  DowDistribution,
} from '../../domain/analytics/types';

export { computeDerivedStats as computeBriefStats } from '../../domain/analytics/service';

export function usePostDetailStats(slug: string): PostDetailStats {
  const { data: allPosts } = useAdminDashboardData();
  const post = allPosts.find(p => p.slug === slug);

  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }

  const { data: distributions } = useSuspenseQuery({
    queryKey: ['admin', 'post-detail', slug],
    queryFn: async () => {
      try {
        const [hourlyRes, dowRes] = await Promise.all([
          client.rpc('get_post_hourly_distribution', { slug_input: slug }),
          client.rpc('get_post_dow_distribution', { slug_input: slug }),
        ]);

        return {
          hourly: ((!hourlyRes.error && hourlyRes.data) || []).map(h => ({
            hour: Number(h.hour),
            view_count: Number(h.view_count),
          })) as HourlyDistribution[],
          dow: ((!dowRes.error && dowRes.data) || []).map(d => ({
            dow: Number(d.dow),
            view_count: Number(d.view_count),
          })) as DowDistribution[],
        };
      } catch (error) {
        // RPC functions may not exist yet — return empty distributions, but log the error for debugging.
        console.error(`Failed to fetch post detail stats for ${slug}:`, error);
        return {
          hourly: [] as HourlyDistribution[],
          dow: [] as DowDistribution[],
        };
      }
    },
  });

  const derived = computeDerivedStats(post);

  return {
    post,
    hourly: distributions.hourly,
    dow: distributions.dow,
    derived,
  };
}
