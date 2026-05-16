'use client';

import { useMemo, useState } from 'react';
import { css } from '@design-system/ui-lib/css';

export type FilterType = 'all' | '7days' | '30days' | 'custom';

export function useDateFilter(
  trends: { view_date: string; view_count: number }[],
) {
  const [filterType, setFilterType] = useState<FilterType>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 사용자가 선택한 30일에 데이터가 없으면 결과를 'all'로 자동 fallback.
  // filterType state는 그대로 두고 effective 값만 derived로 계산해 setState-in-effect 회피.
  const { effectiveFilterType, autoFellBackToAll } = useMemo<{
    effectiveFilterType: FilterType;
    autoFellBackToAll: boolean;
  }>(() => {
    if (filterType !== '30days' || !trends || trends.length === 0) {
      return { effectiveFilterType: filterType, autoFellBackToAll: false };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(today.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const hasRecent = trends.some(t => t.view_date >= cutoffStr);
    return hasRecent
      ? { effectiveFilterType: '30days', autoFellBackToAll: false }
      : { effectiveFilterType: 'all', autoFellBackToAll: true };
  }, [trends, filterType]);

  const filteredTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    const sorted = [...trends].sort((a, b) =>
      a.view_date.localeCompare(b.view_date),
    );

    if (effectiveFilterType === 'all') return sorted;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cutoffDate = new Date(0);

    if (effectiveFilterType === '7days') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 7);
    } else if (effectiveFilterType === '30days') {
      cutoffDate = new Date(today);
      cutoffDate.setDate(today.getDate() - 30);
    } else if (effectiveFilterType === 'custom') {
      return sorted.filter(t => {
        if (startDate && t.view_date < startDate) return false;
        if (endDate && t.view_date > endDate) return false;
        return true;
      });
    }

    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    return sorted.filter(t => t.view_date >= cutoffStr);
  }, [trends, effectiveFilterType, startDate, endDate]);

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
        onChange={e => setFilterType(e.target.value as FilterType)}
        className={inputClass}
      >
        <option value="30days">지난 30일</option>
        <option value="7days">지난 7일</option>
        <option value="all">전체</option>
        <option value="custom">직접선택</option>
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
