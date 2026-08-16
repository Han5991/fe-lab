import {
  addDaysISO,
  diffDaysISO,
  formatMonthDayISO,
  getKSTDateISO,
} from '@blog/content';
import type { PostStatDetail, DerivedStats } from './types';

// ── Analytics Overview ──────────────────────────────────────────────────────

export type AnalyticsRange = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/**
 * 별도 분석 API가 붙기 전, 총 조회수 대비 고유 방문자 추정 비율.
 */
export const UNIQUES_ESTIMATE_RATIO = 0.55;

export interface AnalyticsOverview {
  range: AnalyticsRange;
  rangeDays: number;
  total: number;
  totalDelta: number | null;
  uniques: number;
  uniquesDelta: number | null;
  postsPublished: number;
  avgPerPost: number;
  totalSeries: { date: string; value: number }[];
  topPosts: {
    slug: string;
    title: string;
    views: number;
    delta: number | null;
    series: number[];
  }[];
}

/**
 * 순수 함수: Supabase admin dashboard 데이터 + 기준일을 받아
 * Analytics 페이지용 AnalyticsOverview를 계산합니다.
 *
 * todayISO를 파라미터로 받아 외부 시계 의존을 제거했습니다.
 * 자정 경계 테스트 및 hook의 타이머 트리거가 가능합니다.
 */
export function computeAnalyticsOverview(
  data: PostStatDetail[],
  range: AnalyticsRange,
  todayISO: string,
): AnalyticsOverview {
  const rangeDays = RANGE_DAYS[range];

  const days: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    days.push(addDaysISO(todayISO, -i));
  }
  const prevDays: string[] = [];
  for (let i = rangeDays * 2 - 1; i >= rangeDays; i--) {
    prevDays.push(addDaysISO(todayISO, -i));
  }

  const dailyTotals = new Map<string, number>(days.map(d => [d, 0]));
  const prevTotals = new Map<string, number>(prevDays.map(d => [d, 0]));
  for (const post of data) {
    for (const t of post.trends) {
      if (dailyTotals.has(t.view_date)) {
        dailyTotals.set(
          t.view_date,
          (dailyTotals.get(t.view_date) ?? 0) + t.view_count,
        );
      } else if (prevTotals.has(t.view_date)) {
        prevTotals.set(
          t.view_date,
          (prevTotals.get(t.view_date) ?? 0) + t.view_count,
        );
      }
    }
  }

  const totalSeries = Array.from(dailyTotals.entries()).map(([d, v]) => ({
    date: formatMonthDayISO(d),
    value: v,
  }));

  const total = Array.from(dailyTotals.values()).reduce((s, v) => s + v, 0);
  const prevTotal = Array.from(prevTotals.values()).reduce((s, v) => s + v, 0);
  const totalDelta = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

  const uniques = Math.round(total * UNIQUES_ESTIMATE_RATIO);
  const prevUniques = Math.round(prevTotal * UNIQUES_ESTIMATE_RATIO);
  const uniquesDelta =
    prevUniques > 0 ? (uniques - prevUniques) / prevUniques : null;

  const postsPublished = data.filter(p => p.status === 'published').length;
  const avgPerPost =
    postsPublished > 0 ? Math.round(total / postsPublished) : 0;

  const topPosts = data
    .map(post => {
      let rangeViews = 0;
      let prevRangeViews = 0;
      const seriesMap = new Map<string, number>();
      days.forEach(d => seriesMap.set(d, 0));
      for (const t of post.trends) {
        if (dailyTotals.has(t.view_date)) {
          rangeViews += t.view_count;
          seriesMap.set(t.view_date, t.view_count);
        } else if (prevTotals.has(t.view_date)) {
          prevRangeViews += t.view_count;
        }
      }
      const delta =
        prevRangeViews > 0
          ? (rangeViews - prevRangeViews) / prevRangeViews
          : null;
      return {
        slug: post.slug,
        title: post.title,
        views: rangeViews,
        delta,
        series: Array.from(seriesMap.values()),
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return {
    range,
    rangeDays,
    total,
    totalDelta,
    uniques,
    uniquesDelta,
    postsPublished,
    avgPerPost,
    totalSeries,
    topPosts,
  };
}

const MILESTONE_TARGETS = [100, 500, 1000, 5000] as const;

/**
 * 트렌드 데이터에서 파생 통계를 계산합니다.
 * (주간 성장률, 피크 일자, 일 평균, 마일스톤)
 *
 * todayISO 파라미터로 기준일을 주입받습니다(기본값은 KST 오늘).
 * computeAnalyticsOverview와 동일한 패턴으로 외부 시계 의존을 격리해
 * 자정 경계 테스트를 가능하게 합니다.
 */
export function computeDerivedStats(
  post: PostStatDetail,
  todayISO: string = getKSTDateISO(),
): DerivedStats {
  const trends = post.trends;

  const sorted = [...trends].sort((a, b) =>
    a.view_date.localeCompare(b.view_date),
  );

  // KST 기준 today. RPC view_date도 KST이므로 동일 TZ로 윈도우를 잡아야
  // recent7/previous7이 어제·재작년처럼 한 칸 밀리지 않습니다.
  const sevenDayStr = addDaysISO(todayISO, -7);
  const fourteenDayStr = addDaysISO(todayISO, -14);

  // 오늘은 아직 진행 중인 날이라 두 윈도우 모두에서 의도적으로 제외합니다
  // ([7일 전, 오늘) vs [14일 전, 7일 전)). 7일 성장률 계산이 미완성된 오늘
  // 데이터로 왜곡되지 않도록 함입니다.
  const recent7 = sorted
    .filter(t => t.view_date >= sevenDayStr && t.view_date < todayISO)
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
  const firstTrend = sorted.at(0);
  const lastTrend = sorted.at(-1);
  const daySpan =
    firstTrend !== undefined && lastTrend !== undefined
      ? diffDaysISO(firstTrend.view_date, lastTrend.view_date) + 1
      : 0;
  const dailyAverage =
    daySpan > 0 ? Math.round((totalViews / daySpan) * 10) / 10 : 0;

  // trends RPC는 365일 cap이라 그 이전에 쌓인 누적이 sorted에 안 들어옵니다.
  // totalViews(post_views의 영구 누적값)와 sorted 합 차이를 시작 누적으로 두고,
  // 그 차이만큼 이미 통과한 마일스톤은 도달일자 미상(date=null)으로 reached 처리합니다.
  const milestones: {
    target: (typeof MILESTONE_TARGETS)[number];
    reached: boolean;
    date: string | null;
  }[] = [];
  let milestoneIdx = 0;
  const trendSum = totalViews;
  const offset = Math.max(0, post.totalViews - trendSum);
  let cumulative = offset;

  // cumulative가 이미 넘어선 마일스톤을 순서대로 소비합니다(도달일자는 호출부 몫).
  const pushReached = (date: string | null) => {
    for (const target of MILESTONE_TARGETS.slice(milestoneIdx)) {
      if (cumulative < target) break;
      milestones.push({ target, reached: true, date });
      milestoneIdx++;
    }
  };

  // trends 시작 전에 이미 통과한 마일스톤은 도달일자 미상으로 기록.
  pushReached(null);

  for (const t of sorted) {
    cumulative += t.view_count;
    pushReached(t.view_date);
  }

  for (const target of MILESTONE_TARGETS.slice(milestoneIdx)) {
    milestones.push({ target, reached: false, date: null });
  }

  return { weekGrowthRate, peakDay, dailyAverage, milestones };
}
