import { useSuspenseQuery } from '@tanstack/react-query';
import { client } from '../client';
import { useAdminDashboardData, PostStatDetail } from './useAdminViews';

export interface HourlyDistribution {
  hour: number;
  view_count: number;
}

export interface DowDistribution {
  dow: number;
  view_count: number;
}

export interface PostDetailStats {
  post: PostStatDetail;
  hourly: HourlyDistribution[];
  dow: DowDistribution[];
  derived: {
    weekGrowthRate: number | null; // percentage change: recent 7d vs previous 7d
    peakDay: { date: string; count: number } | null;
    dailyAverage: number;
    milestones: { target: number; reached: boolean; date: string | null }[];
  };
}

function computeDerivedStats(post: PostStatDetail) {
  const trends = post.trends;

  // 7-day growth rate
  const sorted = [...trends].sort((a, b) =>
    a.view_date.localeCompare(b.view_date),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(today.getDate() - 14);

  const sevenDayStr = sevenDaysAgo.toISOString().split('T')[0];
  const fourteenDayStr = fourteenDaysAgo.toISOString().split('T')[0];

  const recent7 = sorted
    .filter(t => t.view_date >= sevenDayStr)
    .reduce((acc, t) => acc + t.view_count, 0);
  const previous7 = sorted
    .filter(t => t.view_date >= fourteenDayStr && t.view_date < sevenDayStr)
    .reduce((acc, t) => acc + t.view_count, 0);

  const weekGrowthRate =
    previous7 > 0
      ? Math.round(((recent7 - previous7) / previous7) * 100)
      : null;

  // Peak day
  const peakDay =
    sorted.length > 0
      ? sorted.reduce((max, t) => (t.view_count > max.view_count ? t : max))
      : null;

  // Daily average
  const totalViews = sorted.reduce((acc, t) => acc + t.view_count, 0);
  const dailyAverage =
    sorted.length > 0 ? Math.round((totalViews / sorted.length) * 10) / 10 : 0;

  // Milestones
  const milestoneTargets = [100, 500, 1000, 5000];
  const milestones = milestoneTargets.map(target => {
    let reachedDate: string | null = null;
    let tempCum = 0;
    for (const t of sorted) {
      tempCum += t.view_count;
      if (tempCum >= target) {
        reachedDate = t.view_date;
        break;
      }
    }
    return {
      target,
      reached: post.totalViews >= target,
      date: reachedDate,
    };
  });

  return {
    weekGrowthRate,
    peakDay: peakDay
      ? { date: peakDay.view_date, count: peakDay.view_count }
      : null,
    dailyAverage,
    milestones,
  };
}

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
          })),
          dow: ((!dowRes.error && dowRes.data) || []).map(d => ({
            dow: Number(d.dow),
            view_count: Number(d.view_count),
          })),
        };
      } catch {
        // RPC functions may not exist yet — return empty distributions
        return { hourly: [], dow: [] };
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

/** Lightweight derived stats from trends only (no RPC call) */
export function computeBriefStats(post: PostStatDetail) {
  return computeDerivedStats(post);
}
