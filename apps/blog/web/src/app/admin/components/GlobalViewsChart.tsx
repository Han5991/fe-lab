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
        bg: 'ink.25',
        borderWidth: '1px',
        borderColor: 'ink.border',
        rounded: 'lg',
        p: '6',
      })}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: '6',
          flexWrap: 'wrap',
          gap: '3',
        })}
      >
        <h2 className={css({ fontSize: 'base', fontWeight: 'bold', color: 'ink.950' })}>
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

      <div className={css({ h: '320px', w: 'full' })}>
        {formattedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                axisLine={{ stroke: 'oklch(87% 0.018 250)' }}
                tickLine={false}
                tick={{ fill: 'oklch(62% 0.02 250)', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(62% 0.02 250)', fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: 'oklch(87% 0.018 250)', strokeWidth: 1, strokeDasharray: '4 4' }}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid oklch(87% 0.018 250)',
                  background: 'oklch(99% 0.005 250)',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'oklch(40% 0.025 250)', marginBottom: '2px' }}
              />
              <Line
                type="monotone"
                dataKey="views"
                stroke="oklch(53% 0.22 255)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'oklch(53% 0.22 255)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'oklch(47% 0.24 255)', strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className={css({
              display: 'flex',
              h: 'full',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'ink.500',
              fontSize: 'sm',
            })}
          >
            해당 기간에 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
