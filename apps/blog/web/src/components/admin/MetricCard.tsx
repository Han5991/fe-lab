import { ArrowDown, ArrowUp } from 'lucide-react';
import { css, cva } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import type { ReactNode } from 'react';
import { Sparkline } from '@/src/components/blog/Sparkline';
import { adminCard, type CardHeadingLevel } from './adminStyles';

interface MetricCardProps {
  label: string;
  level: CardHeadingLevel;
  value: string;
  /** 값 뒤의 단위(`회`·`개`) — 보조 잉크로 붙는다. */
  unit?: string;
  /**
   * 직전 같은 길이 기간 대비 증감률(0.123 = 12.3%). null은 직전 기간이 0이라 비교할 수 없다는
   * 뜻이고(`domain/analytics/delta.ts`), 그때는 그리지 않는다.
   */
  delta?: number | null;
  /** 값 옆 추세선 — 기간의 일별 값. */
  series?: readonly number[];
  /** 아래 보조 한 줄(supporting). */
  children?: ReactNode;
}

// 데이터 색 — admin 차트와 같은 spot.600. 모듈 로드 때 한 번만 푼다(Sparkline과 같은 이유).
const SERIES_COLOR = token('colors.spot.600');

// 방향 색은 가지마다 변형으로 적는다 — 런타임 값으로 고르는 조회는 CSS로 추출되지 않는다.
const deltaTone = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    textStyle: 'body',
    fontWeight: 'medium',
    fontVariantNumeric: 'tabular-nums',
  },
  variants: {
    direction: {
      up: { color: 'moss.700' },
      down: { color: 'spot.600' },
    },
  },
});

/**
 * 지표 카드 — Astryx MetricCard(승인 목업의 카드): 라벨 14/20 500 보조 잉크, 값 24/32 600 고정폭
 * 숫자, 증감은 화살표 12 + 백분율, 추세선 80×32. 카드 사이·안쪽 간격은 목업 그대로(안쪽 16, 줄 4).
 */
export function MetricCard({
  label,
  level: Heading,
  value,
  unit,
  delta,
  series,
  children,
}: MetricCardProps) {
  const hasDelta = delta !== undefined && delta !== null;
  return (
    <section
      className={css(adminCard, {
        display: 'flex',
        flexDir: 'column',
        gap: '1',
        minW: '0',
      })}
    >
      <Heading className={css({ textStyle: 'label', color: 'ink.700' })}>
        {label}
      </Heading>
      <div
        className={css({
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '3',
        })}
      >
        <p
          className={css({
            display: 'flex',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            columnGap: '2',
          })}
        >
          <span
            className={css({
              textStyle: 'h1',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {value}
            {unit !== undefined && (
              <span
                className={css({
                  textStyle: 'body',
                  color: 'ink.700',
                  ml: '1',
                })}
              >
                {unit}
              </span>
            )}
          </span>
          {hasDelta && (
            <span
              className={deltaTone({ direction: delta >= 0 ? 'up' : 'down' })}
            >
              {delta >= 0 ? (
                <ArrowUp size={12} aria-hidden />
              ) : (
                <ArrowDown size={12} aria-hidden />
              )}
              <span className={css({ srOnly: true })}>
                {delta >= 0 ? '증가' : '감소'}
              </span>
              {Math.abs(delta * 100).toFixed(1)}%
            </span>
          )}
        </p>
        {series !== undefined && series.length > 0 && (
          <Sparkline
            data={series}
            w={80}
            h={32}
            color={SERIES_COLOR}
            fill={SERIES_COLOR}
          />
        )}
      </div>
      {children !== undefined && (
        <p className={css({ textStyle: 'supporting', color: 'ink.700' })}>
          {children}
        </p>
      )}
    </section>
  );
}
