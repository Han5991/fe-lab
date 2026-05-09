'use client';

import { css } from '@design-system/ui-lib/css';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { token } from '@design-system/ui-lib/tokens';
import { fmtNum } from '@/lib/format';

interface TimeSeriesChartProps {
  data: { date: string; value: number }[];
  height?: number;
}

interface TooltipPayload {
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0].value ?? 0;
  return (
    <div
      className={css({
        bg: 'ink.950',
        color: 'paper.50',
        px: '3',
        py: '2',
        fontFamily: 'mono',
        fontSize: 'xs',
        letterSpacing: 'mono',
      })}
    >
      <div className={css({ color: 'marker.300', fontSize: '2xs' })}>
        {label}
      </div>
      <div
        className={css({
          fontFamily: 'serif',
          fontStyle: 'italic',
          fontSize: 'lg',
          fontWeight: 'medium',
          mt: '0.5',
        })}
      >
        {fmtNum(value)}{' '}
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: '2xs',
            color: 'ink.300',
          })}
        >
          views
        </span>
      </div>
    </div>
  );
};

export const TimeSeriesChart = ({
  data,
  height = 240,
}: TimeSeriesChartProps) => {
  return (
    <div className={css({ w: 'full' })} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke={token('colors.ink.border')}
            vertical={false}
          />
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
              stroke: token('colors.marker.600'),
              strokeWidth: 1,
              strokeDasharray: '2 3',
            }}
            content={<CustomTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={token('colors.ink.700')}
            strokeWidth={1.5}
            fill={token('colors.marker.300')}
            fillOpacity={0.18}
            dot={false}
            activeDot={{
              r: 4,
              fill: token('colors.marker.300'),
              stroke: token('colors.ink.950'),
              strokeWidth: 1.5,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
