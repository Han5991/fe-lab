import { useSuspenseQuery } from '@tanstack/react-query';
import { getKSTDateISO } from '@blog/content';
import { TIMEZONE } from '@/content.values.mts';
import {
  analyticsService,
  getPostDowDistribution,
  getPostHourlyDistribution,
} from '@/src/domain/analytics/admin';
import { retryAdminQuery } from './useAdminViews';
import type {
  PostDetailStats,
  PostStatDetail,
  HourlyDistribution,
  DowDistribution,
} from '@/src/domain/analytics';

/** admin 목록의 간이 통계 — 상세 훅과 같은 계산을 화면 이름으로 다시 낸다. */
export const computeBriefStats = (post: PostStatDetail, todayISO: string) =>
  analyticsService.computeDerivedStats(post, todayISO);

/**
 * 글 **하나**의 상세 통계 — 시간대·요일 분포(Edge Function)와 파생 통계.
 *
 * 글은 호출자가 대시보드 데이터에서 찾아 넘긴다. 예전에는 이 훅이 slug로 직접
 * 찾고, 못 찾으면 렌더 중에 `throw new Error('Post not found')`를 던졌다 — 에러
 * 경계가 없던 시절이라 그대로 "Application error" 흰 화면이었다. 없는 글은 이제
 * 화면(PostDetailClient)이 안내로 그리고, 이 훅은 있는 글만 받는다.
 */
export function usePostDetailStats(post: PostStatDetail): PostDetailStats {
  const { slug } = post;

  const { data: distributions } = useSuspenseQuery({
    queryKey: ['admin', 'post-detail', slug],
    // 같은 사유 (useAdminDashboardData 주석 참조): SSR placeholder를 hydration
    // 직후 무조건 갱신해 prod 화면이 빈 차트로 굳지 않게 합니다.
    staleTime: 0,
    refetchOnMount: 'always',
    retry: retryAdminQuery,
    // 실패는 삼키지 않는다 — 예전엔 catch에서 빈 분포를 돌려줘, Edge Function의
    // 401·500이 "이 글은 조회가 없었다"는 빈 차트와 구분되지 않았다(그리고 그 빈
    // 값이 캐시에 성공으로 남았다). throw는 admin 에러 경계가 안내한다.
    queryFn: async (): Promise<{
      hourly: HourlyDistribution[];
      dow: DowDistribution[];
    }> => {
      const [hourly, dow] = await Promise.all([
        getPostHourlyDistribution(slug),
        getPostDowDistribution(slug),
      ]);
      return { hourly, dow };
    },
  });

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
