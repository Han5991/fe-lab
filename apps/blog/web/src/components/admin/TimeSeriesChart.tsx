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
import { CHART_MOTION, chartReveal } from './chartMotion';

interface TimeSeriesChartProps {
  data: { date: string; value: number }[];
  /** 차트 칸의 높이(px) — 부르는 쪽이 정한다. 대시보드는 차트 청크를 기다리는 골격도 같은 값으로 그린다. */
  height: number;
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

export const TimeSeriesChart = ({ data, height }: TimeSeriesChartProps) => {
  // 기간(첫 날과 길이)이 바뀌면 선·면 층만 새로 마운트해 CSS 와이프(`chartReveal`)가 다시 돈다 — 같은 기간의
  // 새로고침은 키가 그대로라 다시 그리지 않는다. 축은 마운트를 유지한다.
  const rangeKey = `${data[0]?.date ?? ''}:${data.length}`;
  return (
    <div className={css(chartReveal, { w: 'full' })} style={{ height }}>
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
            // 30일·90일이면 날짜 눈금이 칸보다 많다 — 겹치지 않는 N을 골라 N일마다 하나씩, 마지막
            // 날(오늘)을 남긴다. 기본값(preserveEnd)은 글자 폭(9/30·10/10)에 따라 건너뛰는 칸 수가
            // 줄마다 달라 눈금 간격이 고르지 않다(실측 — 9/26·9/28·9/30 다음 10/1~10/8은 매일).
            interval="equidistantPreserveEnd"
            minTickGap={16}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            // 조회수는 정수다 — 값이 작으면(최대 1~2) 0.25·0.5 같은 눈금이 생긴다.
            allowDecimals={false}
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
            key={rangeKey}
            type="monotone"
            dataKey="value"
            stroke={token('colors.spot.600')}
            strokeWidth={2}
            fill={token('colors.spot.600')}
            fillOpacity={0.15}
            dot={false}
            {...CHART_MOTION}
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
