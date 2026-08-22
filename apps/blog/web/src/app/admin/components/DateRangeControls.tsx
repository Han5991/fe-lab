'use client';

import { TIMEZONE } from '@/content.values.mts';
import { useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { getKSTCutoffDate } from '@blog/content';
import type { TrendPoint } from '@/domain/analytics';

type FilterType = 'all' | '7days' | '30days' | 'custom';

// getKSTCutoffDate는 단위 테스트 커버를 위해 @blog/content(shared/dates)로 이동.
// 호환을 위해 같은 이름으로 재노출 — 다른 컴포넌트에서 직접 import해도 동작.
export { getKSTCutoffDate };

/**
 * 정렬 + 기간 필터. 훅 밖의 순수 함수라 렌더와 무관하게 읽히고,
 * 메모이제이션은 React Compiler가 호출 단위로 처리합니다.
 */
function selectTrends(
  trends: TrendPoint[],
  effectiveFilterType: FilterType,
  startDate: string,
  endDate: string,
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

  // RPC가 KST view_date를 반환하므로 cutoff도 KST 기준으로 계산합니다.
  // 브라우저 로컬 TZ에서 new Date() + toISOString()을 쓰면 비-KST 환경에서 1일 shift.
  if (effectiveFilterType === '7days' || effectiveFilterType === '30days') {
    const cutoffStr = getKSTCutoffDate(TIMEZONE, effectiveFilterType);
    return sorted.filter(t => t.view_date >= cutoffStr);
  }

  return sorted;
}

export function useDateFilter(trends: TrendPoint[]) {
  const [filterType, setFilterType] = useState<FilterType>('30days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // 사용자가 선택한 30일에 데이터가 없으면 결과를 'all'로 자동 fallback.
  // filterType state는 그대로 두고 effective 값만 derived로 계산해 setState-in-effect 회피.
  //
  // RPC가 KST view_date를 반환하므로, cutoff도 KST 기준으로 계산해야 일치합니다.
  // 브라우저 로컬 TZ에서 new Date() + toISOString()을 쓰면 비-KST 환경에서 1일 shift.
  const canFallBack = filterType === '30days' && trends && trends.length > 0;
  const autoFellBackToAll = Boolean(
    canFallBack &&
    !trends.some(t => t.view_date >= getKSTCutoffDate(TIMEZONE, '30days')),
  );
  const effectiveFilterType: FilterType = autoFellBackToAll
    ? 'all'
    : filterType;

  const filteredTrends = selectTrends(
    trends,
    effectiveFilterType,
    startDate,
    endDate,
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
