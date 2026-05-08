import { css } from '@design-system/ui-lib/css';
import { Label } from '@/src/components/blog/Label';
import { Sparkline } from '@/src/components/blog/Sparkline';

interface KpiCardProps {
  num: string;
  label: string;
  delta?: number;
  small?: string;
  series?: number[];
}

export const KpiCard = ({ num, label, delta, small, series }: KpiCardProps) => {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta">{label}</Label>
      <div
        className={css({
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '3',
        })}
      >
        <span
          className={css({
            fontFamily: 'serif',
            fontSize: { base: '4xl', md: '5xl' },
            fontWeight: '600',
            lineHeight: '1',
            letterSpacing: '-0.02em',
            color: 'ink.950',
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {num}
        </span>
        {series && series.length > 0 && (
          <Sparkline
            data={series}
            w={80}
            h={32}
            color="oklch(40% 0.022 60)"
            fill="oklch(40% 0.022 60)"
          />
        )}
      </div>
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '2',
        })}
      >
        {delta !== undefined && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color: delta >= 0 ? 'moss.600' : 'marker.600',
              letterSpacing: '0.04em',
            })}
          >
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
          </span>
        )}
        {small && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: '2xs',
              color: 'ink.500',
            })}
          >
            {small}
          </span>
        )}
      </div>
    </div>
  );
};
