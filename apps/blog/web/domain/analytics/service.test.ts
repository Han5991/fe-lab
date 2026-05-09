import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeDerivedStats } from './service';
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
