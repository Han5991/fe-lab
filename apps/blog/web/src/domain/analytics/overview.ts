/**
 * Analytics 대시보드 **개요**의 순수 계산 — 기간 합계·증감·상위 글.
 *
 * 글 하나의 파생 통계는 `derivedStats.ts`다. 둘은 입력도 소비자도 다르다
 * (여기는 N개 글 × 기간, 저기는 글 하나 × 전 기간).
 */

import { addDaysISO, formatMonthDayISO } from '@blog/content';
import { percentDelta } from './delta';
import type { PostStatDetail } from './types';

export type AnalyticsRange = '7d' | '30d' | '90d';

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

/** 상위 글 목록에 싣는 개수. */
const TOP_POSTS_LIMIT = 5;

/**
 * 별도 분석 API가 붙기 전, 총 조회수 대비 고유 방문자 추정 비율.
 */
export const UNIQUES_ESTIMATE_RATIO = 0.55;

/** Analytics 대시보드 상위 글 한 줄 — 기간 내 조회수·직전 기간 대비 증감·스파크라인. */
export interface TopPostSummary {
  slug: string;
  title: string;
  views: number;
  /** 직전 기간 대비 증감율. 직전 기간 데이터가 없으면 null (totalDelta와 일관). */
  delta: number | null;
  series: number[];
}

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
  topPosts: TopPostSummary[];
}

/**
 * 비교할 두 기간 — 현재 `[오늘-N+1, 오늘]`과 직전 `[오늘-2N+1, 오늘-N]`.
 *
 * **윈도우를 값으로 만들어 한 번만 계산한다.** 예전에는 합계용으로 만든
 * `Map`에 `.has()`를 걸어 상위 글 집계가 "이 날짜가 어느 기간인가"를 다시
 * 판정했다 — 남의 자료구조에 얹힌 판정이라, 기간 규칙을 바꾸면 두 곳을 함께
 * 고쳐야 했고 한쪽만 고치면 합계와 상위 목록이 다른 기간을 말하게 된다.
 */
interface RangeWindows {
  /** 현재 기간의 날짜들 — 시계열 x축 순서 그대로(과거 → 오늘). */
  readonly days: readonly string[];
  readonly current: ReadonlySet<string>;
  readonly previous: ReadonlySet<string>;
}

function buildWindows(todayISO: string, rangeDays: number): RangeWindows {
  const days: string[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    days.push(addDaysISO(todayISO, -i));
  }
  const previousDays: string[] = [];
  for (let i = rangeDays * 2 - 1; i >= rangeDays; i--) {
    previousDays.push(addDaysISO(todayISO, -i));
  }
  return { days, current: new Set(days), previous: new Set(previousDays) };
}

/** 이 날짜가 속한 기간. 어디에도 없으면 null(범위 밖이라 버린다). */
function windowOf(
  windows: RangeWindows,
  date: string,
): 'current' | 'previous' | null {
  if (windows.current.has(date)) return 'current';
  if (windows.previous.has(date)) return 'previous';
  return null;
}

/** 글 하나를 상위 목록 한 줄로 접는다 — 기간 조회수·직전 대비 증감·스파크라인. */
function summarizePost(
  post: PostStatDetail,
  windows: RangeWindows,
): TopPostSummary {
  const series = new Map<string, number>(windows.days.map(d => [d, 0]));
  let views = 0;
  let previousViews = 0;

  for (const t of post.trends) {
    const where = windowOf(windows, t.view_date);
    if (where === 'current') {
      views += t.view_count;
      series.set(t.view_date, t.view_count);
    } else if (where === 'previous') {
      previousViews += t.view_count;
    }
  }

  return {
    slug: post.slug,
    title: post.title,
    views,
    delta: percentDelta(views, previousViews),
    // Map은 삽입 순서를 지키고 키는 windows.days 순으로 미리 심어 뒀으므로,
    // 값 배열이 곧 x축 순서다.
    series: Array.from(series.values()),
  };
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
  const windows = buildWindows(todayISO, rangeDays);

  const dailyTotals = new Map<string, number>(windows.days.map(d => [d, 0]));
  let total = 0;
  let previousTotal = 0;

  for (const post of data) {
    for (const t of post.trends) {
      const where = windowOf(windows, t.view_date);
      if (where === 'current') {
        dailyTotals.set(
          t.view_date,
          (dailyTotals.get(t.view_date) ?? 0) + t.view_count,
        );
        total += t.view_count;
      } else if (where === 'previous') {
        previousTotal += t.view_count;
      }
    }
  }

  const totalSeries = Array.from(dailyTotals.entries()).map(([d, v]) => ({
    date: formatMonthDayISO(d),
    value: v,
  }));

  const uniques = Math.round(total * UNIQUES_ESTIMATE_RATIO);
  const previousUniques = Math.round(previousTotal * UNIQUES_ESTIMATE_RATIO);

  const postsPublished = data.filter(p => p.status === 'published').length;
  const avgPerPost =
    postsPublished > 0 ? Math.round(total / postsPublished) : 0;

  const topPosts = data
    .map(post => summarizePost(post, windows))
    .sort((a, b) => b.views - a.views)
    .slice(0, TOP_POSTS_LIMIT);

  return {
    range,
    rangeDays,
    total,
    totalDelta: percentDelta(total, previousTotal),
    uniques,
    uniquesDelta: percentDelta(uniques, previousUniques),
    postsPublished,
    avgPerPost,
    totalSeries,
    topPosts,
  };
}
