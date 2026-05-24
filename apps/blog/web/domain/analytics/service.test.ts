import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeDerivedStats,
  computeAnalyticsOverview,
  UNIQUES_ESTIMATE_RATIO,
} from './service';
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
  assert.equal(result.weekGrowthRate, null);
  assert.equal(result.peakDay, null);
  assert.equal(result.dailyAverage, 0);
  assert.equal(result.milestones.length, 4);
  assert.ok(result.milestones.every(m => !m.reached));
});

test('computeDerivedStats: 피크 일자 식별', () => {
  const result = computeDerivedStats(
    makePost([
      { view_date: '2025-01-01', view_count: 5 },
      { view_date: '2025-01-02', view_count: 30 },
      { view_date: '2025-01-03', view_count: 10 },
    ]),
  );
  assert.equal(result.peakDay?.date, '2025-01-02');
  assert.equal(result.peakDay?.count, 30);
});

test('computeDerivedStats: 일 평균 계산 (소수 1자리 반올림)', () => {
  const result = computeDerivedStats(
    makePost([
      { view_date: '2025-01-01', view_count: 1 },
      { view_date: '2025-01-02', view_count: 2 },
      { view_date: '2025-01-03', view_count: 1 },
    ]),
  );
  assert.equal(result.dailyAverage, 1.3);
});

test('computeDerivedStats: 데이터 1개일 때 span=1로 가드되어 평균 = 본 그 값', () => {
  // 첫=끝 → diff=0, +1로 span=1. 같은 값이 평균으로 그대로 나와야 함.
  const result = computeDerivedStats(
    makePost([{ view_date: '2025-01-01', view_count: 7 }]),
  );
  assert.equal(result.dailyAverage, 7);
  assert.equal(result.peakDay?.count, 7);
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
  assert.equal(result.dailyAverage, 2);
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
  assert.equal(result.milestones[0].reached, true);
  assert.equal(result.milestones[0].target, 100);
  assert.equal(result.milestones[0].date, null);
  assert.equal(result.milestones[1].reached, false);
  assert.equal(result.milestones[1].target, 500);
});

test('computeDerivedStats: 누적이 마일스톤을 넘으면 reached=true', () => {
  const trends = Array.from({ length: 5 }, (_, i) => ({
    view_date: `2025-01-0${i + 1}`,
    view_count: 30,
  })); // 누적 150 → 100은 통과, 500은 미달
  const result = computeDerivedStats(makePost(trends));
  assert.equal(result.milestones[0].reached, true);
  assert.equal(result.milestones[0].target, 100);
  assert.equal(result.milestones[1].reached, false);
  assert.equal(result.milestones[1].target, 500);
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
  assert.equal(result.total, 0);
  assert.equal(result.totalDelta, null);
  assert.equal(result.uniques, 0);
  assert.equal(result.topPosts.length, 0);
});

test('computeAnalyticsOverview: range=7d → rangeDays=7, totalSeries.length=7', () => {
  const result = computeAnalyticsOverview([], '7d', '2026-05-24');
  assert.equal(result.rangeDays, 7);
  assert.equal(result.totalSeries.length, 7);
});

test('computeAnalyticsOverview: range=30d → rangeDays=30, totalSeries.length=30', () => {
  const result = computeAnalyticsOverview([], '30d', '2026-05-24');
  assert.equal(result.rangeDays, 30);
  assert.equal(result.totalSeries.length, 30);
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
  assert.equal(result.total, 10);
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
  assert.equal(r1.total, 20);
  assert.equal(r2.total, 5);
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
  assert.equal(result.totalDelta, 2.0);
});

test('computeAnalyticsOverview: uniques는 UNIQUES_ESTIMATE_RATIO 비율', () => {
  const data = [
    makePostDetail('a', [{ view_date: '2026-05-20', view_count: 100 }]),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  assert.equal(result.uniques, Math.round(100 * UNIQUES_ESTIMATE_RATIO));
});

test('computeAnalyticsOverview: postsPublished는 published 상태 글만 카운트', () => {
  const data = [
    makePostDetail('pub1', [], 'published'),
    makePostDetail('pub2', [], 'published'),
    makePostDetail('draft1', [], 'draft'),
  ];
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  assert.equal(result.postsPublished, 2);
});

test('computeAnalyticsOverview: topPosts는 내림차순 상위 5개', () => {
  const data = Array.from({ length: 8 }, (_, i) =>
    makePostDetail(`post${i}`, [
      { view_date: '2026-05-20', view_count: i * 10 },
    ]),
  );
  const result = computeAnalyticsOverview(data, '7d', '2026-05-24');
  assert.equal(result.topPosts.length, 5);
  // 첫 번째가 최다 조회
  assert.ok(result.topPosts[0].views >= result.topPosts[1].views);
});
