import { expect, test } from 'vitest';
import { computeAnalyticsOverview } from './overview';
import type { PostStatDetail } from './types';

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
