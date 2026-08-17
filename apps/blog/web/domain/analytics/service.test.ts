import { expect, test } from 'vitest';
import { computeDerivedStats, computeAnalyticsOverview } from './service';
import type { PostStatDetail } from './types';

function makePost(
  trends: { view_date: string; view_count: number }[],
): PostStatDetail {
  return {
    slug: 'sample',
    title: 'Sample',
    date: '2025-01-01',
    totalViews: trends.reduce((acc, t) => acc + t.view_count, 0),
    todayViews: 0,
    trends,
    status: 'published',
    scheduledDate: null,
  };
}

test('computeDerivedStats: 빈 트렌드는 0/null로 채움', () => {
  const result = computeDerivedStats(makePost([]));
  expect(result.weekGrowthRate).toBe(null);
  expect(result.peakDay).toBe(null);
  expect(result.dailyAverage).toBe(0);
  expect(result.milestones.length).toBe(4);
  expect(result.milestones.every(m => !m.reached)).toBeTruthy();
});

test('computeDerivedStats: 피크 일자 식별', () => {
  const result = computeDerivedStats(
    makePost([
      { view_date: '2025-01-01', view_count: 5 },
      { view_date: '2025-01-02', view_count: 30 },
      { view_date: '2025-01-03', view_count: 10 },
    ]),
  );
  expect(result.peakDay?.date).toBe('2025-01-02');
  expect(result.peakDay?.count).toBe(30);
});

test('computeDerivedStats: 일 평균 계산 (소수 1자리 반올림)', () => {
  const result = computeDerivedStats(
    makePost([
      { view_date: '2025-01-01', view_count: 1 },
      { view_date: '2025-01-02', view_count: 2 },
      { view_date: '2025-01-03', view_count: 1 },
    ]),
  );
  expect(result.dailyAverage).toBe(1.3);
});

test('computeDerivedStats: 데이터 1개일 때 span=1로 가드되어 평균 = 본 그 값', () => {
  // 첫=끝 → diff=0, +1로 span=1. 같은 값이 평균으로 그대로 나와야 함.
  const result = computeDerivedStats(
    makePost([{ view_date: '2025-01-01', view_count: 7 }]),
  );
  expect(result.dailyAverage).toBe(7);
  expect(result.peakDay?.count).toBe(7);
});

test('computeDerivedStats: 일 평균 분모는 활동일이 아닌 trends span(첫~끝)', () => {
  // 빈 날(view_count=0)은 RPC가 안 돌려주지만, 두 끝점 사이 캘린더 일수로 나눠야
  // 스파이크 1회 글의 평균이 비현실적으로 부풀지 않습니다.
  const result = computeDerivedStats(
    makePost([
      { view_date: '2025-01-01', view_count: 30 },
      { view_date: '2025-01-30', view_count: 30 },
    ]),
  );
  // 합 60, span 30일 → 60/30 = 2.0
  expect(result.dailyAverage).toBe(2);
});

test('computeDerivedStats: trends가 비어도 totalViews가 마일스톤 넘으면 reached(date 미상)', () => {
  // 글이 trends RPC 365일 cap 밖에서만 활동했을 때 발생하는 시나리오.
  // post.totalViews는 영구 누적이고 trends 합과 다를 수 있음.
  const post = {
    slug: 'old',
    title: 'Old post',
    date: '2024-01-01',
    totalViews: 427,
    todayViews: 0,
    trends: [],
    status: 'published' as const,
    scheduledDate: null,
  };
  const result = computeDerivedStats(post);
  expect(result.milestones[0].reached).toBe(true);
  expect(result.milestones[0].target).toBe(100);
  expect(result.milestones[0].date).toBe(null);
  expect(result.milestones[1].reached).toBe(false);
  expect(result.milestones[1].target).toBe(500);
});

test('computeDerivedStats: 누적이 마일스톤을 넘으면 reached=true', () => {
  const trends = Array.from({ length: 5 }, (_, i) => ({
    view_date: `2025-01-0${i + 1}`,
    view_count: 30,
  })); // 누적 150 → 100은 통과, 500은 미달
  const result = computeDerivedStats(makePost(trends));
  expect(result.milestones[0].reached).toBe(true);
  expect(result.milestones[0].target).toBe(100);
  expect(result.milestones[1].reached).toBe(false);
  expect(result.milestones[1].target).toBe(500);
});

// ── computeAnalyticsOverview ─────────────────────────────────────────────────

function makePostDetail(
  slug: string,
  trends: { view_date: string; view_count: number }[],
  status: 'published' | 'draft' | 'scheduled' = 'published',
): PostStatDetail {
  return {
    slug,
    title: slug,
    date: '2025-01-01',
    totalViews: trends.reduce((acc, t) => acc + t.view_count, 0),
    todayViews: 0,
    trends,
    status,
    scheduledDate: null,
  };
}

test('computeAnalyticsOverview: 데이터 없으면 total=0, delta=null', () => {
  const result = computeAnalyticsOverview([], '7d', '2026-05-24');
  expect(result.total).toBe(0);
  expect(result.totalDelta).toBe(null);
  expect(result.uniques).toBe(0);
  expect(result.topPosts.length).toBe(0);
});

test('computeAnalyticsOverview: range=7d → rangeDays=7, totalSeries.length=7', () => {
  const result = computeAnalyticsOverview([], '7d', '2026-05-24');
  expect(result.rangeDays).toBe(7);
  expect(result.totalSeries.length).toBe(7);
});

test('computeAnalyticsOverview: range=30d → rangeDays=30, totalSeries.length=30', () => {
  const result = computeAnalyticsOverview([], '30d', '2026-05-24');
  expect(result.rangeDays).toBe(30);
  expect(result.totalSeries.length).toBe(30);
});

test('computeAnalyticsOverview: range=90d → rangeDays=90, totalSeries.length=90', () => {
  const result = computeAnalyticsOverview([], '90d', '2026-05-24');
  expect(result.rangeDays).toBe(90);
  expect(result.totalSeries.length).toBe(90);
});

test('computeAnalyticsOverview: 90d는 현재/직전 90일 윈도우를 분리 집계', () => {
  // todayISO=2026-05-24, range=90d → 현재 약 [2026-02-24 ~ 2026-05-24],
  // 직전 약 [2025-11-26 ~ 2026-02-23]. 직전보다 더 과거는 제외되어야 한다.
  const data = [
    makePostDetail('a', [
      { view_date: '2026-03-01', view_count: 50 }, // 현재 기간
      { view_date: '2026-01-01', view_count: 20 }, // 직전 기간
      { view_date: '2025-06-01', view_count: 999 }, // 직전보다 과거 → 제외
    ]),
  ];
  const result = computeAnalyticsOverview(data, '90d', '2026-05-24');
  expect(result.total).toBe(50);
  // 직전 20 → (50-20)/20 = 1.5
  expect(result.totalDelta).toBe(1.5);
});

test('computeAnalyticsOverview: 현재 기간 조회수만 total에 포함', () => {
  // todayISO = 2026-05-24, range=7d → 윈도우 2026-05-18 ~ 2026-05-24
  const data = [
    makePostDetail('a', [
      { view_date: '2026-05-20', view_count: 10 }, // 현재 기간
      { view_date: '2026-05-10', view_count: 99 }, // 직전 기간 바깥 → 집계 제외
    ]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  expect(result.total).toBe(10);
});

test('computeAnalyticsOverview: 자정 경계에서 todayISO 변경 시 윈도우 갱신', () => {
  // 동일 data, 동일 range지만 todayISO가 바뀌면 결과도 달라져야 함
  const data = [
    makePostDetail('a', [
      { view_date: '2026-05-17', view_count: 5 }, // todayISO=2026-05-17 기준 윈도우 안
      { view_date: '2026-05-18', view_count: 20 }, // todayISO=2026-05-24 기준 윈도우 안
    ]),
  ];
  // 05-24 기준: 윈도우 05-18~05-24 → 20
  const r1 = computeAnalyticsOverview(data, '7d', '2026-05-24');
  // 05-17 기준: 윈도우 05-11~05-17 → 5
  const r2 = computeAnalyticsOverview(data, '7d', '2026-05-17');
  expect(r1.total).toBe(20);
  expect(r2.total).toBe(5);
});

test('computeAnalyticsOverview: totalDelta — 직전 기간 대비 증감율', () => {
  // todayISO=2026-05-14, range=7d
  // 현재 기간: 05-08~05-14 → 30
  // 직전 기간: 05-01~05-07 → 10
  const data = [
    makePostDetail('a', [
      { view_date: '2026-05-03', view_count: 10 }, // 직전
      { view_date: '2026-05-10', view_count: 30 }, // 현재
    ]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-14');
  // (30-10)/10 = 2.0
  expect(result.totalDelta).toBe(2.0);
});

test('computeAnalyticsOverview: uniques는 총 조회수의 추정 비율(0.55)', () => {
  const data = [
    makePostDetail('a', [{ view_date: '2026-05-20', view_count: 100 }]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  // 리터럴로 고정 — UNIQUES_ESTIMATE_RATIO(0.55)가 바뀌면 의도적으로 함께 갱신.
  // round(100 * 0.55) = 55.
  expect(result.uniques).toBe(55);
});

test('computeAnalyticsOverview: uniquesDelta — 직전 고유추정 대비 증감율, 직전 0이면 null', () => {
  // todayISO=2026-05-14, range=7d → 현재 [05-08~05-14], 직전 [05-01~05-07]
  // 현재 total=200 → uniques=round(200*0.55)=110
  // 직전 total=100 → prevUniques=round(100*0.55)=55 → uniquesDelta=(110-55)/55=1.0
  const data = [
    makePostDetail('a', [
      { view_date: '2026-05-10', view_count: 200 }, // 현재
      { view_date: '2026-05-03', view_count: 100 }, // 직전
    ]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-14');
  expect(result.uniques).toBe(110);
  expect(result.uniquesDelta).toBe(1.0);

  // 직전 기간 조회수 0 → uniquesDelta는 null (0 나눗셈 가드)
  const onlyCurrent = [
    makePostDetail('b', [{ view_date: '2026-05-10', view_count: 200 }]),
  ];
  const r2 = computeAnalyticsOverview(onlyCurrent, '7d', '2026-05-14');
  expect(r2.uniquesDelta).toBe(null);
});

test('computeAnalyticsOverview: postsPublished는 published 상태 글만 카운트', () => {
  const data = [
    makePostDetail('pub1', [], 'published'),
    makePostDetail('pub2', [], 'published'),
    makePostDetail('draft1', [], 'draft'),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  expect(result.postsPublished).toBe(2);
});

test('computeAnalyticsOverview: topPosts는 내림차순 상위 5개', () => {
  const data = Array.from({ length: 8 }, (_, i) =>
    makePostDetail(`post${i}`, [
      { view_date: '2026-05-20', view_count: i * 10 },
    ]),
  );
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  expect(result.topPosts.length).toBe(5);
  // 첫 번째가 최다 조회
  expect(result.topPosts[0].views >= result.topPosts[1].views).toBeTruthy();
});

test('computeAnalyticsOverview: postsPublished=0 이면 avgPerPost=0 (0 나눗셈 가드)', () => {
  const data = [
    makePostDetail(
      'd1',
      [{ view_date: '2026-05-22', view_count: 100 }],
      'draft',
    ),
    makePostDetail(
      'd2',
      [{ view_date: '2026-05-22', view_count: 50 }],
      'draft',
    ),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  expect(result.postsPublished).toBe(0);
  expect(result.avgPerPost).toBe(0);
});

test('computeAnalyticsOverview: topPosts delta — 직전 기간 0이면 null (totalDelta와 일관)', () => {
  // post: 현재 기간만 조회수 있음, 직전 기간은 0
  const data = [
    makePostDetail('only-current', [
      { view_date: '2026-05-22', view_count: 50 },
    ]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  expect(result.topPosts[0].delta).toBe(null);
});

test('computeDerivedStats: todayISO 주입으로 자정 경계 결정성 확보', () => {
  // 같은 trends 데이터를 두 개의 todayISO로 계산 → recent7/previous7 윈도우가
  // 다르게 잡혀 weekGrowthRate가 달라야 함 (자정 stale 회귀 방지).
  const trends = [
    { view_date: '2026-05-13', view_count: 10 },
    { view_date: '2026-05-15', view_count: 20 },
    { view_date: '2026-05-18', view_count: 30 },
    { view_date: '2026-05-20', view_count: 40 },
    { view_date: '2026-05-22', view_count: 50 },
  ];
  const post = makePostDetail('x', trends);

  // todayISO='2026-05-23':
  //   recent7 [05-16, 05-23): 05-18(30) + 05-20(40) + 05-22(50) = 120
  //   previous7 [05-09, 05-16): 05-13(10) + 05-15(20) = 30 → growth = 300%
  const r1 = computeDerivedStats(post, '2026-05-23');
  // todayISO='2026-05-21':
  //   recent7 [05-14, 05-21): 05-15(20) + 05-18(30) + 05-20(40) = 90
  //   previous7 [05-07, 05-14): 05-13(10) = 10 → growth = 800%
  const r2 = computeDerivedStats(post, '2026-05-21');

  expect(r1.weekGrowthRate).not.toBe(r2.weekGrowthRate);
  expect(r1.weekGrowthRate).toBe(300);
  expect(r2.weekGrowthRate).toBe(800);
});
