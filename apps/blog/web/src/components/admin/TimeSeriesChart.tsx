'use client';

import { css } from '@blog/styled-system/css';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipContentProps } from 'recharts';
import { token } from '@blog/styled-system/tokens';
import { fmtNum } from '@blog/content/client';
import { ChartTooltipFrame } from './ChartTooltip';

interface TimeSeriesChartProps {
  data: { date: string; value: number }[];
  height?: number;
}

// 표면은 다른 차트 툴팁과 같은 ChartTooltipFrame이고, 내용만 큰 숫자로 따로 그린다.
// `content`에 함수로 넘겨 props가 Recharts 계약(TooltipContentProps)으로 검사된다.
const CustomTooltip = ({
  active,
  payload,
  label,
  accessibilityLayer,
}: TooltipContentProps) => {
  const first = payload[0];
  if (!active || first === undefined) return null;
  const { value } = first;
  return (
    <ChartTooltipFrame accessibilityLayer={accessibilityLayer}>
      <div
        className={css({
          color: 'ink.950',
          fontFamily: 'mono',
          letterSpacing: 'mono',
        })}
      >
        <div className={css({ color: 'spot.600', fontSize: '2xs' })}>
          {label}
        </div>
        <div
          className={css({
            fontSize: 'lg',
            fontWeight: 'semibold',
            mt: '0.5',
          })}
        >
          {typeof value === 'number' ? fmtNum(value) : value}{' '}
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: '2xs',
              color: 'ink.500',
            })}
          >
            views
          </span>
        </div>
      </div>
    </ChartTooltipFrame>
  );
};

export const TimeSeriesChart = ({
  data,
  height = 240,
}: TimeSeriesChartProps) => {
  return (
    <div className={css({ w: 'full' })} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 16, left: -12, bottom: 0 }}
        >
          {/* 가로 실선만 — Astryx 차트 그리드(1px 보더 색, 실선). */}
          <CartesianGrid stroke={token('colors.ink.border')} vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={{ stroke: token('colors.ink.border') }}
            tickLine={false}
            tick={{
              fill: token('colors.ink.500'),
              fontSize: 11,
              fontFamily: 'var(--font-jetbrains)',
            }}
            dy={8}
            // 30일·90일이면 날짜 눈금이 칸보다 많다 — 겹치는 눈금은 건너뛴다(패널 폭 352에서도 읽힌다).
            minTickGap={16}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{
              fill: token('colors.ink.500'),
              fontSize: 11,
              fontFamily: 'var(--font-jetbrains)',
            }}
            width={48}
          />
          <Tooltip
            cursor={{
              stroke: token('colors.ink.400'),
              strokeWidth: 1,
              strokeDasharray: '2 3',
            }}
            content={CustomTooltip}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={token('colors.spot.600')}
            strokeWidth={2}
            fill={token('colors.spot.600')}
            fillOpacity={0.15}
            dot={false}
            activeDot={{
              r: 4,
              fill: token('colors.spot.600'),
              stroke: token('colors.paper.50'),
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
