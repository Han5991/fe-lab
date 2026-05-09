import { addDaysISO, diffDaysISO, getKSTDateISO } from '../../lib/dates';
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

  // KST 기준 today. RPC view_date도 KST이므로 동일 TZ로 윈도우를 잡아야
  // recent7/previous7이 어제·재작년처럼 한 칸 밀리지 않습니다.
  const todayStr = getKSTDateISO();
  const sevenDayStr = addDaysISO(todayStr, -7);
  const fourteenDayStr = addDaysISO(todayStr, -14);

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
  // 일평균은 trends 첫 날 ~ 마지막 날 사이의 캘린더 일수로 나눕니다.
  // (활동일 수로 나누면 스파이크 1회로 끝난 글의 평균이 비현실적으로 높아집니다.)
  const daySpan =
    sorted.length > 0
      ? diffDaysISO(
          sorted[0].view_date,
          sorted[sorted.length - 1].view_date,
        ) + 1
      : 0;
  const dailyAverage =
    daySpan > 0 ? Math.round((totalViews / daySpan) * 10) / 10 : 0;

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
