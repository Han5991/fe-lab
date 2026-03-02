import type { PostStatDetail, DerivedStats } from './types';

const MILESTONE_TARGETS = [100, 500, 1000, 5000] as const;

/**
 * 트렌드 데이터에서 파생 통계를 계산합니다.
 * (주간 성장률, 피크 일자, 일 평균, 마일스톤)
 */
export function computeDerivedStats(post: PostStatDetail): DerivedStats {
  const trends = post.trends;

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

  const peakEntry =
    sorted.length > 0
      ? sorted.reduce((max, t) => (t.view_count > max.view_count ? t : max))
      : null;

  const peakDay = peakEntry
    ? { date: peakEntry.view_date, count: peakEntry.view_count }
    : null;

  const totalViews = sorted.reduce((acc, t) => acc + t.view_count, 0);
  const dailyAverage =
    sorted.length > 0 ? Math.round((totalViews / sorted.length) * 10) / 10 : 0;

  const milestones = MILESTONE_TARGETS.map(target => {
    let reachedDate: string | null = null;
    let cumulative = 0;
    for (const t of sorted) {
      cumulative += t.view_count;
      if (cumulative >= target) {
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

  return { weekGrowthRate, peakDay, dailyAverage, milestones };
}
