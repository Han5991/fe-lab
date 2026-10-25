import { ArrowDown, ArrowUp } from 'lucide-react';
import { css, cva } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import { ViewTransition, type ReactNode } from 'react';
import { Sparkline } from '@/src/components/blog/Sparkline';
import { ADMIN_VIEW_TRANSITION } from '@/src/shared/adminViewTransitions';
import {
  adminCard,
  enterMotion,
  enterOrderStyle,
  type CardHeadingLevel,
} from './adminStyles';

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
  /** 화면에 처음 그려질 때의 진입 순서(`enterMotion` — 0이 먼저 선다). */
  enterOrder: number;
}

// 데이터 색 — admin 차트와 같은 spot.600. 모듈 로드 때 한 번만 푼다(Sparkline과 같은 이유).
const SERIES_COLOR = token('colors.spot.600');

// 값 줄이 바뀔 때 — 이전 줄은 제자리에서 걷히고(out) 새 줄은 떠오른다(rise). 의사 요소가 쪽을 가른다.
const VALUE_SWAP = `${ADMIN_VIEW_TRANSITION.out} ${ADMIN_VIEW_TRANSITION.rise}`;

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
 *
 * 값 줄(값·증감·추세선)은 `<ViewTransition>`이다 — transition으로 값이 바뀌면(집계 기간 세그먼트)
 * 이전 줄이 제자리에서 걷히고 새 줄이 8px 아래에서 떠오른다(`out`·`rise`). 숫자를 세며 올리는
 * 카운트업은 두지 않았다: CSS(`@property` 정수 + `counter()`)로는 `7.8K`·`7,805` 같은 표기를 낼 수
 * 없고(counter는 정수만 찍는다), 의사 요소의 글자는 접근 이름이 아니라 실제 숫자를 한 벌 더 둬야
 * 한다. JS 루프 대신 교체 전환을 골랐다. 처음 그려질 때(마운트)는 교체가 아니라 카드 진입이 맡는다.
 */
export function MetricCard({
  label,
  level: Heading,
  value,
  unit,
  delta,
  series,
  children,
  enterOrder,
}: MetricCardProps) {
  const hasDelta = delta !== undefined && delta !== null;
  return (
    <section
      style={enterOrderStyle(enterOrder)}
      className={css(adminCard, enterMotion, {
        display: 'flex',
        flexDir: 'column',
        gap: '1',
        minW: '0',
      })}
    >
      <Heading className={css({ textStyle: 'label', color: 'ink.700' })}>
        {label}
      </Heading>
      <ViewTransition update={VALUE_SWAP} default="none">
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
      </ViewTransition>
      {children !== undefined && (
        <p className={css({ textStyle: 'supporting', color: 'ink.700' })}>
          {children}
        </p>
      )}
    </section>
  );
}
