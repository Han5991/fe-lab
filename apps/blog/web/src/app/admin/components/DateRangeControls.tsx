'use client';

import { TIMEZONE } from '@/content.values.mts';
import { useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { getKSTDateISO } from '@blog/content';
import type { TrendPoint } from '@/src/domain/analytics';
// admin 배럴은 supabase 클라이언트를 바인딩하므로 순수 leaf를 연다.
import { trailingWindowStartISO } from '@/src/domain/analytics/windows';

export type FilterType = 'all' | '7days' | '30days' | 'custom';

/** 최근 N일 필터의 일수 — 창은 오늘을 포함한 N일이다(개요의 7d·30d와 같다). */
const TRAILING_DAYS = { '7days': 7, '30days': 30 } as const;

/**
 * select에 그릴 옵션 — 키가 곧 value, 값이 라벨이고 순서가 화면 순서다.
 * `satisfies Record<FilterType, string>`이라 유니온에 없는 키를 넣거나 있는 키를
 * 빠뜨리면 컴파일이 막힌다. 렌더와 아래 판정이 같은 레코드를 읽으므로,
 * 화면에 있는 옵션인데 상태로는 못 올라가는 조합이 생길 수 없다.
 */
const FILTER_LABELS = {
  '30days': '지난 30일',
  '7days': '지난 7일',
  all: '전체',
  custom: '직접선택',
} as const satisfies Record<FilterType, string>;

/** select의 value는 그냥 string이다 — 등록된 옵션일 때만 FilterType으로 다룬다. */
function isFilterType(value: string): value is FilterType {
  return Object.hasOwn(FILTER_LABELS, value);
}

/**
 * 정렬 + 기간 필터. `todayISO`는 KST 오늘이다 — view_date가 KST 날짜라 브라우저
 * 로컬 TZ로 잡으면 비-KST 환경에서 하루 밀린다.
 */
export function selectTrends(
  trends: TrendPoint[],
  effectiveFilterType: FilterType,
  startDate: string,
  endDate: string,
  todayISO: string,
): TrendPoint[] {
  if (!trends || trends.length === 0) return [];

  const sorted = [...trends].sort((a, b) =>
    a.view_date.localeCompare(b.view_date),
  );

  if (effectiveFilterType === 'all') return sorted;

  if (effectiveFilterType === 'custom') {
    return sorted.filter(t => {
      if (startDate && t.view_date < startDate) return false;
      if (endDate && t.view_date > endDate) return false;
      return true;
    });
  }

  const start = trailingWindowStartISO(
    todayISO,
    TRAILING_DAYS[effectiveFilterType],
  );
  return sorted.filter(t => t.view_date >= start);
}

/** @param todayISO KST 오늘(생략하면 지금) — 행이 많은 목록은 한 번 계산해 넘긴다. */
export function useDateFilter(
  trends: TrendPoint[],
  todayISO: string = getKSTDateISO(TIMEZONE),
) {
  const [filterType, setFilterType] = useState<FilterType>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 30일에 데이터가 없으면 'all'로 물러난다 — 상태는 두고 유효값만 파생한다.
  // 창의 첫날은 한 번만 구한다(행마다 구하면 Intl.DateTimeFormat이 행 수만큼 생긴다).
  const canFallBack = filterType === '30days' && trends.length > 0;
  const last30Start = trailingWindowStartISO(todayISO, TRAILING_DAYS['30days']);
  const autoFellBackToAll =
    canFallBack && !trends.some(t => t.view_date >= last30Start);
  const effectiveFilterType: FilterType = autoFellBackToAll
    ? 'all'
    : filterType;

  const filteredTrends = selectTrends(
    trends,
    effectiveFilterType,
    startDate,
    endDate,
    todayISO,
  );

  return {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
    autoFellBackToAll,
  };
}

const inputClass = css({
  py: '1.5',
  px: '2',
  borderWidth: '[1px]',
  borderColor: 'ink.border',
  rounded: 'md',
  fontSize: 'xs',
  bg: 'ink.25',
  color: 'ink.950',
  cursor: 'pointer',
  _focus: { outline: 'none', borderColor: 'ink.950' },
});

interface DateRangeControlsProps {
  filterType: FilterType;
  setFilterType: (val: FilterType) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
}

export function DateRangeControls({
  filterType,
  setFilterType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: DateRangeControlsProps) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        flexWrap: 'wrap',
      })}
    >
      <select
        value={filterType}
        onChange={e => {
          const next = e.target.value;
          if (isFilterType(next)) setFilterType(next);
        }}
        className={inputClass}
      >
        {Object.entries(FILTER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {filterType === 'custom' && (
        <div
          className={css({ display: 'flex', alignItems: 'center', gap: '1' })}
        >
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={inputClass}
          />
          <span className={css({ color: 'ink.500', fontSize: 'xs' })}>—</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      )}
    </div>
  );
}
