import { useSuspenseQuery } from '@tanstack/react-query';
import { getKSTDateISO } from '@blog/content';
import { TIMEZONE } from '@/content.values.mts';
import {
  analyticsService,
  getPostDowDistribution,
  getPostHourlyDistribution,
} from '@/domain/analytics/admin';
import { useAdminDashboardData } from './useAdminViews';
import type {
  PostDetailStats,
  PostStatDetail,
  HourlyDistribution,
  DowDistribution,
} from '@/domain/analytics';

/** admin 목록의 간이 통계 — 상세 훅과 같은 계산을 화면 이름으로 다시 낸다. */
export const computeBriefStats = (post: PostStatDetail, todayISO: string) =>
  analyticsService.computeDerivedStats(post, todayISO);

// SSR/prerender에서 useAdminDashboardData가 빈 배열일 때 쓰는 placeholder.
// 클라이언트 hydration 후 진짜 post로 즉시 교체됩니다.
const PLACEHOLDER_POST = {
  slug: '',
  title: '',
  date: null,
  totalViews: 0,
  todayViews: 0,
  trends: [],
  status: 'published' as const,
  scheduledDate: null,
};

export function usePostDetailStats(slug: string): PostDetailStats {
  const { data: allPosts } = useAdminDashboardData();
  const post = allPosts.find(p => p.slug === slug);

  // useSuspenseQuery는 항상 호출되어야 하므로 post 가드보다 먼저 둡니다.
  // post가 아직 없으면 빈 분포 반환, 진짜 데이터는 hydration 후 갱신.
  const { data: distributions } = useSuspenseQuery({
    queryKey: ['admin', 'post-detail', slug],
    // 같은 사유 (useAdminDashboardData 주석 참조): SSR placeholder를 hydration
    // 직후 무조건 갱신해 prod 화면이 빈 차트로 굳지 않게 합니다.
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async (): Promise<{
      hourly: HourlyDistribution[];
      dow: DowDistribution[];
    }> => {
      if (!slug) return { hourly: [], dow: [] };
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

  if (!post) {
    // SSR/prerender에선 admin 데이터가 비어 있을 수 있음 → placeholder로 통과.
    if (typeof window === 'undefined') {
      return {
        post: PLACEHOLDER_POST,
        hourly: distributions.hourly,
        dow: distributions.dow,
        derived: analyticsService.computeDerivedStats(
          PLACEHOLDER_POST,
          getKSTDateISO(TIMEZONE),
        ),
      };
    }
    throw new Error(`Post not found: ${slug}`);
  }

  return {
    post,
    hourly: distributions.hourly,
    dow: distributions.dow,
    derived: analyticsService.computeDerivedStats(
      post,
      getKSTDateISO(TIMEZONE),
    ),
  };
}
