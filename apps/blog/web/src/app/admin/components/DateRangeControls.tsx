'use client';

import { useEffect, useMemo, useState } from 'react';
import { css } from '@design-system/ui-lib/css';

export type FilterType = 'all' | '7days' | '30days' | 'custom';

export function useDateFilter(
  trends: { view_date: string; view_count: number }[],
) {
  const [filterType, setFilterTypeRaw] = useState<FilterType>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  // 30일 default가 빈 결과를 만들 때 자동으로 'all'로 fallback했는지 표시
  const [autoFellBackToAll, setAutoFellBackToAll] = useState(false);

  const setFilterType = (val: FilterType) => {
    setFilterTypeRaw(val);
    setAutoFellBackToAll(false);
  };

  // 데이터가 있는데 default 30일에 0건 매칭이면 'all'로 1회 자동 전환
  useEffect(() => {
    if (filterType !== '30days') return;
    if (autoFellBackToAll) return;
    if (!trends || trends.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const hasRecent = trends.some(t => t.view_date >= cutoffStr);
    if (!hasRecent) {
      setFilterTypeRaw('all');
      setAutoFellBackToAll(true);
    }
  }, [trends, filterType, autoFellBackToAll]);

  const filteredTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    const sorted = [...trends].sort((a, b) =>
      a.view_date.localeCompare(b.view_date),
    );

    if (filterType === 'all') return sorted;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cutoffDate = new Date(0);

    if (filterType === '7days') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 7);
    } else if (filterType === '30days') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 30);
    } else if (filterType === 'custom') {
      return sorted.filter(t => {
        if (startDate && t.view_date < startDate) return false;
        if (endDate && t.view_date > endDate) return false;
        return true;
      });
    }

    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    return sorted.filter(t => t.view_date >= cutoffStr);
  }, [trends, filterType, startDate, endDate]);

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
  borderWidth: '1px',
  borderColor: 'ink.border',
  rounded: 'md',
  fontSize: 'xs',
  bg: 'ink.25',
  color: 'ink.950',
  cursor: 'pointer',
  _focus: { outline: 'none', borderColor: 'accent.600' },
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
        onChange={e => setFilterType(e.target.value as FilterType)}
        className={inputClass}
      >
        <option value="30days">지난 30일</option>
        <option value="7days">지난 7일</option>
        <option value="all">전체</option>
        <option value="custom">직접선택</option>
      </select>

      {filterType === 'custom' && (
        <div className={css({ display: 'flex', alignItems: 'center', gap: '1' })}>
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
