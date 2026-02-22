'use client';

import { useAdminDashboardData } from '@/lib/hooks/useAdminViews';
import { css } from '@design-system/ui-lib/css';
import { useDateFilter, DateRangeControls } from './DateRangeControls';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';

export function GlobalViewsChart() {
  const { data } = useAdminDashboardData();

  // Aggregate all trends into a centralized array
  const aggregatedTrends = useMemo(() => {
    const map = new Map<string, number>();
    for (const post of data) {
      for (const t of post.trends) {
        map.set(t.view_date, (map.get(t.view_date) || 0) + t.view_count);
      }
    }
    return Array.from(map.entries()).map(([view_date, view_count]) => ({
      view_date,
      view_count,
    }));
  }, [data]);

  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
  } = useDateFilter(aggregatedTrends);

  const formattedData = filteredTrends.map(d => {
    const date = new Date(d.view_date);
    return {
      name: `${date.getMonth() + 1}/${date.getDate()}`,
      views: d.view_count,
    };
  });

  return (
    <div
      className={css({
        bg: 'white',
        p: '2rem',
        rounded: '8px',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        mb: '2rem',
      })}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        })}
      >
        <h2
          className={css({
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#111827',
          })}
        >
          전체 조회수 추이
        </h2>
        <DateRangeControls
          filterType={filterType}
          setFilterType={setFilterType}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      </div>

      <div className={css({ h: '350px', w: '100%' })}>
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                axisLine={{ stroke: '#e5e7eb' }}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <Tooltip
                cursor={{
                  stroke: '#d1d5db',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: '#6b7280', marginBottom: '0.25rem' }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={css({
              display: 'flex',
              h: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
            })}
          >
            <p>해당 기간에 데이터가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
