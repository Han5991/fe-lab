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

  const filteredTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    // Sort by date chronologically
    const sorted = [...trends].sort((a, b) =>
      a.view_date.localeCompare(b.view_date),
    );

    if (filterType === 'all') return sorted;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cutoffDate = new Date(0); // far past

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
  };
}

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
        gap: '0.5rem',
        flexWrap: 'wrap',
      })}
    >
      <select
        value={filterType}
        onChange={e => setFilterType(e.target.value as FilterType)}
        className={css({
          p: '0.375rem 0.5rem',
          border: '1px solid #d1d5db',
          rounded: '4px',
          fontSize: '0.875rem',
          bg: 'white',
          color: '#374151',
          cursor: 'pointer',
        })}
      >
        <option value="30days">지난 30일</option>
        <option value="7days">지난 7일</option>
        <option value="all">미선택 (전체)</option>
        <option value="custom">직접선택</option>
      </select>

      {filterType === 'custom' && (
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          })}
        >
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className={css({
              p: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              rounded: '4px',
              fontSize: '0.875rem',
            })}
          />
          <span className={css({ color: '#6b7280' })}>-</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className={css({
              p: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              rounded: '4px',
              fontSize: '0.875rem',
            })}
          />
        </div>
      )}
    </div>
  );
}
