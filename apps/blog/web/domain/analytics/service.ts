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

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setUTCDate(today.getUTCDate() - 14);

  const todayStr = today.toISOString().split('T')[0];
  const sevenDayStr = sevenDaysAgo.toISOString().split('T')[0];
  const fourteenDayStr = fourteenDaysAgo.toISOString().split('T')[0];

  const recent7 = sorted
    .filter(t => t.view_date >= sevenDayStr && t.view_date < todayStr)
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

  const milestones: {
    target: (typeof MILESTONE_TARGETS)[number];
    reached: boolean;
    date: string | null;
  }[] = [];
  let cumulative = 0;
  let milestoneIdx = 0;

  for (const t of sorted) {
    cumulative += t.view_count;
    while (
      milestoneIdx < MILESTONE_TARGETS.length &&
      cumulative >= MILESTONE_TARGETS[milestoneIdx]
    ) {
      milestones.push({
        target: MILESTONE_TARGETS[milestoneIdx],
        reached: true,
        date: t.view_date,
      });
      milestoneIdx++;
    }
  }

  while (milestoneIdx < MILESTONE_TARGETS.length) {
    milestones.push({
      target: MILESTONE_TARGETS[milestoneIdx],
      reached: false,
      date: null,
    });
    milestoneIdx++;
  }

  return { weekGrowthRate, peakDay, dailyAverage, milestones };
}
