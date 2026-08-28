/**
 * 글 **하나**의 파생 통계 — 주간 성장률·피크 일자·일 평균·마일스톤.
 *
 * 대시보드 개요(N개 글 × 기간)는 `overview.ts`다.
 */

import { addDaysISO, diffDaysISO } from '@blog/content';
import { percentDelta } from './delta';
import type { DerivedStats, PostStatDetail, TrendPoint } from './types';

const MILESTONE_TARGETS = [100, 500, 1000, 5000] as const;

type Milestone = DerivedStats['milestones'][number];

function sumViews(trends: readonly TrendPoint[]): number {
  return trends.reduce((acc, t) => acc + t.view_count, 0);
}

/**
 * 누적 조회수가 각 마일스톤을 넘긴 날.
 *
 * `startingCumulative`는 trends가 시작되기 **전에** 이미 쌓여 있던 누적이다 —
 * trends RPC는 365일 cap이라 그 이전 조회는 행으로 오지 않는다. 그만큼 이미
 * 통과한 마일스톤은 도달일자 미상(`date: null`)으로 reached 처리한다.
 *
 * 커서(`index`)와 누적(`cumulative`)을 변형하며 도는데, 그 변형이 이 함수
 * **안에서 끝난다**는 것이 이 함수가 따로 있는 이유다 — 예전에는 같은 클로저가
 * 90줄짜리 함수 한복판에서 바깥 변수 셋을 건드렸다.
 */
function computeMilestones(
  sorted: readonly TrendPoint[],
  startingCumulative: number,
): Milestone[] {
  const milestones: Milestone[] = [];
  let index = 0;
  let cumulative = startingCumulative;

  /** 지금 누적이 이미 넘어선 마일스톤을 순서대로 소비한다. */
  const takeReached = (date: string | null) => {
    for (const target of MILESTONE_TARGETS.slice(index)) {
      if (cumulative < target) break;
      milestones.push({ target, reached: true, date });
      index++;
    }
  };

  takeReached(null);

  for (const t of sorted) {
    cumulative += t.view_count;
    takeReached(t.view_date);
  }

  for (const target of MILESTONE_TARGETS.slice(index)) {
    milestones.push({ target, reached: false, date: null });
  }

  return milestones;
}

/**
 * 트렌드 데이터에서 파생 통계를 계산합니다.
 * (주간 성장률, 피크 일자, 일 평균, 마일스톤)
 *
 * todayISO 파라미터로 기준일을 **필수로** 주입받습니다.
 * computeAnalyticsOverview와 동일한 패턴으로 외부 시계 의존을 격리해
 * 자정 경계 테스트를 가능하게 합니다. 기본값이 없는 이유는 하나 더 있습니다 —
 * KST 오늘을 계산하려면 타임존 설정이 필요한데, 그 값은 앱 값 모듈이 소유하고
 * 이 레이어는 설정을 모릅니다(호출부인 훅이 계산해 넘깁니다).
 */
export function computeDerivedStats(
  post: PostStatDetail,
  todayISO: string,
): DerivedStats {
  const sorted = [...post.trends].sort((a, b) =>
    a.view_date.localeCompare(b.view_date),
  );

  // KST 기준 today. RPC view_date도 KST이므로 동일 TZ로 윈도우를 잡아야
  // recent7/previous7이 어제·재작년처럼 한 칸 밀리지 않습니다.
  const sevenDayStr = addDaysISO(todayISO, -7);
  const fourteenDayStr = addDaysISO(todayISO, -14);

  // 오늘은 아직 진행 중인 날이라 두 윈도우 모두에서 의도적으로 제외합니다
  // ([7일 전, 오늘) vs [14일 전, 7일 전)). 7일 성장률 계산이 미완성된 오늘
  // 데이터로 왜곡되지 않도록 함입니다.
  const recent7 = sumViews(
    sorted.filter(t => t.view_date >= sevenDayStr && t.view_date < todayISO),
  );
  const previous7 = sumViews(
    sorted.filter(
      t => t.view_date >= fourteenDayStr && t.view_date < sevenDayStr,
    ),
  );

  // 개요의 증감과 같은 공식을 쓰되, 이 지표만 정수 퍼센트로 내보낸다.
  const growthRatio = percentDelta(recent7, previous7);
  const weekGrowthRate =
    growthRatio === null ? null : Math.round(growthRatio * 100);

  const peakEntry =
    sorted.length > 0
      ? sorted.reduce((max, t) => (t.view_count > max.view_count ? t : max))
      : null;

  const peakDay = peakEntry
    ? { date: peakEntry.view_date, count: peakEntry.view_count }
    : null;

  const totalViews = sumViews(sorted);
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

  return {
    weekGrowthRate,
    peakDay,
    dailyAverage,
    milestones: computeMilestones(
      sorted,
      Math.max(0, post.totalViews - totalViews),
    ),
  };
}
