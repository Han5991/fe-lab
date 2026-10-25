/** 글별 추이의 "지난 N일" 필터는 개요(overview)의 N일과 같은 창(오늘 포함 N일)이다. */
import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { computeAnalyticsOverview } from '@/src/domain/analytics/overview';
import type { PostStatDetail, TrendPoint } from '@/src/domain/analytics';
import {
  selectDailySeries,
  selectTrends,
  useDateFilter,
} from './DateRangeControls';

const TODAY = '2026-05-25';

/** 05-15 ~ 05-25, 하루 1회씩 — 날짜로 어느 창에 들었는지 바로 읽힌다. */
const TRENDS: TrendPoint[] = Array.from({ length: 11 }, (_, i) => ({
  view_date: `2026-05-${String(15 + i).padStart(2, '0')}`,
  view_count: 1,
}));

const dates = (rows: TrendPoint[]) => rows.map(r => r.view_date);

describe('selectTrends', () => {
  test.each([
    ['7days', '2026-05-19', '2026-05-18'],
    ['30days', '2026-04-26', '2026-04-25'],
  ] as const)(
    '%s는 오늘을 포함한 N일이다 — N+1일째는 빠진다',
    (filter, firstDay, dayBefore) => {
      const rows: TrendPoint[] = [dayBefore, firstDay, TODAY].map(d => ({
        view_date: d,
        view_count: 1,
      }));
      expect(dates(selectTrends(rows, filter, '', '', TODAY))).toStrictEqual([
        firstDay,
        TODAY,
      ]);
    },
  );

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
  test.each([
    ['최근 30일에 데이터가 없으면 전체로 물러난다', '2026-01-01', true],
    ['30일째 날의 데이터는 최근 30일로 본다', '2026-04-26', false],
  ])('%s', (_name, day, fellBack) => {
    const rows: TrendPoint[] = [{ view_date: day, view_count: 3 }];
    const { result } = renderHook(() => useDateFilter(rows, TODAY));

    expect(result.current.autoFellBackToAll).toBe(fellBack);
    expect(dates(result.current.filteredTrends)).toStrictEqual([day]);
  });
});

// RPC는 조회가 있던 날만 준다 — 그 행만 이으면 차트의 x축이 날짜 간격을 잃고 선이 0에 닿지 않는다.
describe('selectDailySeries', () => {
  const sparse: TrendPoint[] = [
    { view_date: '2026-05-20', view_count: 1 },
    { view_date: '2026-05-23', view_count: 4 },
  ];

  test('최근 N일은 창의 날마다 한 칸이고, 조회가 없던 날은 0이다', () => {
    const rows = selectDailySeries(sparse, '7days', '', TODAY);

    expect(rows).toStrictEqual([
      { view_date: '2026-05-19', view_count: 0 },
      { view_date: '2026-05-20', view_count: 1 },
      { view_date: '2026-05-21', view_count: 0 },
      { view_date: '2026-05-22', view_count: 0 },
      { view_date: '2026-05-23', view_count: 4 },
      { view_date: '2026-05-24', view_count: 0 },
      { view_date: '2026-05-25', view_count: 0 },
    ]);
  });

  test('전체는 첫 조회일부터 오늘까지다', () => {
    expect(dates(selectDailySeries(sparse, 'all', '', TODAY))).toStrictEqual([
      '2026-05-20',
      '2026-05-21',
      '2026-05-22',
      '2026-05-23',
      '2026-05-24',
      '2026-05-25',
    ]);
  });

  test('직접선택은 고른 끝까지이고, 끝이 오늘보다 늦으면 오늘까지다', () => {
    expect(
      dates(selectDailySeries(sparse, 'custom', '2026-05-22', TODAY)),
    ).toStrictEqual(['2026-05-20', '2026-05-21', '2026-05-22']);
    expect(
      selectDailySeries(sparse, 'custom', '2999-01-01', TODAY).at(-1),
    ).toStrictEqual({ view_date: TODAY, view_count: 0 });
  });

  test('기간에 조회가 하루도 없으면 빈 배열이다(차트 대신 안내)', () => {
    expect(selectDailySeries([], '7days', '', TODAY)).toStrictEqual([]);
  });
});

describe('useDateFilter — 직접선택', () => {
  test('시작이 끝보다 늦으면 기간이 비었다고 따로 알린다', () => {
    const { result } = renderHook(() => useDateFilter(TRENDS, TODAY));

    act(() => {
      result.current.setFilterType('custom');
      result.current.setStartDate('2026-05-20');
      result.current.setEndDate('2026-05-18');
    });
    expect(result.current.invalidRange).toBe(true);
    expect(result.current.dailyTrends).toStrictEqual([]);

    act(() => result.current.setEndDate('2026-05-21'));
    expect(result.current.invalidRange).toBe(false);
    expect(dates(result.current.dailyTrends)).toStrictEqual([
      '2026-05-20',
      '2026-05-21',
    ]);
  });
});
