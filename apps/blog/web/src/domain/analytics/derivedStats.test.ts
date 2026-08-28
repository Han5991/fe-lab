import { expect, test } from 'vitest';
import { computeDerivedStats } from './derivedStats';
import type { PostStatDetail } from './types';

// 기준일은 이제 필수 인자다 — 외부 시계 대신 고정 날짜로 결정성을 얻는다.
// (타임존 설정을 아는 쪽은 호출부인 훅이고, 이 레이어는 날짜 문자열만 받는다.)
const TODAY = '2026-05-24';

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
  const result = computeDerivedStats(makePost([]), TODAY);
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
    TODAY,
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
    TODAY,
  );
  expect(result.dailyAverage).toBe(1.3);
});

test('computeDerivedStats: 데이터 1개일 때 span=1로 가드되어 평균 = 본 그 값', () => {
  // 첫=끝 → diff=0, +1로 span=1. 같은 값이 평균으로 그대로 나와야 함.
  const result = computeDerivedStats(
    makePost([{ view_date: '2025-01-01', view_count: 7 }]),
    TODAY,
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
    TODAY,
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
  const result = computeDerivedStats(post, TODAY);
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
  const result = computeDerivedStats(makePost(trends), TODAY);
  expect(result.milestones[0].reached).toBe(true);
  expect(result.milestones[0].target).toBe(100);
  expect(result.milestones[1].reached).toBe(false);
  expect(result.milestones[1].target).toBe(500);
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
  const post = makePost(trends);

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
