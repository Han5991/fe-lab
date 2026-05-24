'use client';

import { useMemo, useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { getKSTDateISO, addDaysISO } from '@/lib/dates';

export type FilterType = 'all' | '7days' | '30days' | 'custom';

/**
 * filterType에 대응하는 KST 기준 cutoff 날짜 문자열 (`YYYY-MM-DD`)을 반환합니다.
 * Supabase RPC는 KST로 집계한 view_date를 반환하므로 비교 기준도 KST여야 합니다.
 *
 * @param filterType - 필터 유형 ('7days' | '30days' | 그 외)
 * @param todayKST - 오늘 KST 날짜 (`YYYY-MM-DD`). 미제공 시 현재 시각 기준으로 계산.
 * @returns cutoff 날짜 문자열. 이 날짜 이후(>=)의 데이터를 필터링에 사용합니다.
 *
 * @example
 * // KST 기준 오늘이 '2026-05-25'이고 filterType이 '7days'이면
 * getKSTCutoffDate('7days', '2026-05-25') // → '2026-05-18'
 */
export function getKSTCutoffDate(
  filterType: '7days' | '30days',
  todayKST?: string,
): string {
  const today = todayKST ?? getKSTDateISO();
  if (filterType === '7days') return addDaysISO(today, -7);
  return addDaysISO(today, -30);
}

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
    // RPC가 KST view_date를 반환하므로, cutoff도 KST 기준으로 계산해야 일치합니다.
    // 브라우저 로컬 TZ에서 new Date() + toISOString()을 쓰면 비-KST 환경에서 1일 shift.
    const cutoffStr = getKSTCutoffDate('30days');
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

    if (effectiveFilterType === 'custom') {
      return sorted.filter(t => {
        if (startDate && t.view_date < startDate) return false;
        if (endDate && t.view_date > endDate) return false;
        return true;
      });
    }

    // RPC가 KST view_date를 반환하므로 cutoff도 KST 기준으로 계산합니다.
    // 브라우저 로컬 TZ에서 new Date() + toISOString()을 쓰면 비-KST 환경에서 1일 shift.
    if (effectiveFilterType === '7days' || effectiveFilterType === '30days') {
      const cutoffStr = getKSTCutoffDate(effectiveFilterType);
      return sorted.filter(t => t.view_date >= cutoffStr);
    }

    return sorted;
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
