import { useSuspenseQuery } from '@tanstack/react-query';
import {
  getPostDowDistribution,
  getPostHourlyDistribution,
} from '@/domain/analytics/repository';
import { computeDerivedStats } from '@/domain/analytics/service';
import { useAdminDashboardData } from './useAdminViews';
import type {
  PostDetailStats,
  HourlyDistribution,
  DowDistribution,
} from '@/domain/analytics/types';

export type {
  PostDetailStats,
  HourlyDistribution,
  DowDistribution,
} from '@/domain/analytics/types';

export { computeDerivedStats as computeBriefStats } from '@/domain/analytics/service';

export function usePostDetailStats(slug: string): PostDetailStats {
  const { data: allPosts } = useAdminDashboardData();
  const post = allPosts.find(p => p.slug === slug);

  if (!post) {
    throw new Error(`Post not found: ${slug}`);
  }

  const { data: distributions } = useSuspenseQuery({
    queryKey: ['admin', 'post-detail', slug],
    queryFn: async (): Promise<{
      hourly: HourlyDistribution[];
      dow: DowDistribution[];
    }> => {
      try {
        const [hourly, dow] = await Promise.all([
          getPostHourlyDistribution(slug),
          getPostDowDistribution(slug),
        ]);
        return { hourly, dow };
      } catch (error) {
        console.error(`Failed to fetch post detail stats for ${slug}:`, error);
        return { hourly: [], dow: [] };
      }
    },
  });

  return {
    post,
    hourly: distributions.hourly,
    dow: distributions.dow,
    derived: computeDerivedStats(post),
  };
}
