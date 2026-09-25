/**
 * 글별 추이의 "지난 N일" 필터 — 개요(overview)의 N일과 같은 창이어야 한다.
 *
 * 예전 필터는 `오늘-7` 이상이라 오늘 포함 8일("30일"은 31일)을 그려, 같은 글의
 * "지난 7일" 합이 개요 KPI와 하루치 달랐다.
 */
import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { computeAnalyticsOverview } from '@/src/domain/analytics/overview';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';
import { selectTrends, useDateFilter } from './DateRangeControls';

const TODAY = '2026-05-25';

/** 05-15 ~ 05-25, 하루 1회씩 — 날짜로 어느 창에 들었는지 바로 읽힌다. */
const TRENDS: TrendPoint[] = Array.from({ length: 11 }, (_, i) => ({
  view_date: `2026-05-${String(15 + i).padStart(2, '0')}`,
  view_count: 1,
}));

const dates = (rows: TrendPoint[]) => rows.map(r => r.view_date);

describe('selectTrends', () => {
  test('지난 7일은 오늘을 포함한 7일이다 — 8일째는 빠진다', () => {
    const rows = selectTrends(TRENDS, '7days', '', '', TODAY);
    expect(dates(rows)).toStrictEqual([
      '2026-05-19',
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
    ]);
  });

  test('지난 30일도 오늘 포함 30일이다 — 31일째는 빠진다', () => {
    const edge: TrendPoint[] = [
      { view_date: '2026-04-25', view_count: 1 }, // 31일째
      { view_date: '2026-04-26', view_count: 1 }, // 30일째
    ];
    expect(dates(selectTrends(edge, '30days', '', '', TODAY))).toStrictEqual([
      '2026-04-26',
    ]);
  });

  test('같은 글의 지난 7일 합이 개요의 7d 합계와 같다', () => {
    const post: PostStatDetail = {
      slug: 'p',
      title: 'p',
      date: '2026-01-01',
      totalViews: 11,
      todayViews: 1,
      trends: TRENDS,
      status: 'published',
      scheduledDate: null,
    };
    const filtered = selectTrends(TRENDS, '7days', '', '', TODAY);
    const overview = computeAnalyticsOverview([post], '7d', TODAY, {
      timezone: { isoOffset: '+00:00' },
      now: new Date('2026-05-25T00:00:00Z'),
    });

    expect(filtered.reduce((acc, t) => acc + t.view_count, 0)).toBe(
      overview.total,
    );
  });

  test('직접선택은 시작·끝 날짜를 포함해 자른다', () => {
    const rows = selectTrends(
      TRENDS,
      'custom',
      '2026-05-16',
      '2026-05-18',
      TODAY,
    );
    expect(dates(rows)).toStrictEqual([
      '2026-05-16',
      '2026-05-17',
      '2026-05-18',
    ]);
  });
});

describe('useDateFilter', () => {
  test('최근 30일에 데이터가 없으면 전체로 물러난다', () => {
    const old: TrendPoint[] = [{ view_date: '2026-01-01', view_count: 3 }];
    const { result } = renderHook(() => useDateFilter(old, TODAY));

    expect(result.current.autoFellBackToAll).toBe(true);
    expect(dates(result.current.filteredTrends)).toStrictEqual(['2026-01-01']);
  });

  test('30일째 날의 데이터는 최근 30일로 본다', () => {
    const edge: TrendPoint[] = [{ view_date: '2026-04-26', view_count: 3 }];
    const { result } = renderHook(() => useDateFilter(edge, TODAY));

    expect(result.current.autoFellBackToAll).toBe(false);
    expect(dates(result.current.filteredTrends)).toStrictEqual(['2026-04-26']);
  });
});
