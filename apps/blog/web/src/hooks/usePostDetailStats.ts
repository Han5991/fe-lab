import {
  queryOptions,
  usePrefetchQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { getKSTDateISO } from '@blog/content';
import { TIMEZONE } from '@/content.values.mts';
import {
  analyticsService,
  getPostDowDistribution,
  getPostHourlyDistribution,
} from '@/src/domain/analytics/admin';
import type {
  PostDetailStats,
  PostStatDetail,
  HourlyDistribution,
  DowDistribution,
} from '@/src/domain/analytics';

/** admin 목록의 간이 통계 — 상세 훅과 같은 계산을 화면 이름으로 다시 낸다. */
export const computeBriefStats = (post: PostStatDetail, todayISO: string) =>
  analyticsService.computeDerivedStats(post, todayISO);

/** 글 하나의 시간대·요일 분포(Edge Function) — slug만 있으면 받을 수 있다. */
const distributionsQuery = (slug: string) =>
  queryOptions({
    queryKey: ['admin', 'post-detail', slug],
    // 실패는 삼키지 않는다 — 빈 분포를 돌려주면 Edge Function의 401·500이 "조회가
    // 없었다"는 빈 차트와 구분되지 않는다. throw는 admin 에러 경계가 안내한다.
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

/**
 * 분포 요청을 미리 건다 — 글을 찾으려고 대시보드 데이터를 기다리는 동안 함께
 * 받아, 상세 화면이 두 왕복을 차례로 기다리지 않게 한다.
 */
export function usePrefetchPostDetailStats(slug: string): void {
  usePrefetchQuery(distributionsQuery(slug));
}

/**
 * 글 **하나**의 상세 통계 — 시간대·요일 분포와 파생 통계. 글은 호출자가 대시보드
 * 데이터에서 찾아 넘긴다(없는 글은 화면이 안내로 그린다).
 */
export function usePostDetailStats(post: PostStatDetail): PostDetailStats {
  const { data: distributions } = useSuspenseQuery(
    distributionsQuery(post.slug),
  );

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
