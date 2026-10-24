'use client';

import { css, cva } from '@blog/styled-system/css';
import {
  ANALYTICS_RANGES,
  RANGE_DAYS,
  type AnalyticsRange,
} from '@/src/domain/analytics';

interface AnalyticsRangeSelectProps {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

/** 기간의 화면 이름(`7일`) — 일수에서 만든다. 탭과 대시보드 머리글이 함께 쓴다. */
export const rangeLabel = (range: AnalyticsRange) => `${RANGE_DAYS[range]}일`;

const rangeTab = cva({
  base: {
    px: '4',
    py: '1.5',
    fontFamily: 'mono',
    fontSize: 'xs',
    letterSpacing: 'monoLg',
    rounded: 'inner',
    cursor: 'pointer',
    transition: 'colors',
  },
  variants: {
    active: {
      // 선택 세그먼트는 잉크 면(Astryx 선택 표식이 accent) — 차례·코드 탭과 같은 이름이다.
      true: { bg: 'accent.solid', color: 'accent.onSolid' },
      false: {
        bg: 'transparent',
        color: 'ink.600',
        _hover: { color: 'ink.950' },
      },
    },
  },
  defaultVariants: { active: false },
});

export const AnalyticsRangeSelect = ({
  value,
  onChange,
}: AnalyticsRangeSelectProps) => {
  return (
    <div
      role="tablist"
      className={css({
        display: 'flex',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        rounded: 'element',
        bg: 'paper.100',
        p: '0.5',
      })}
    >
      {ANALYTICS_RANGES.map(range => {
        const active = value === range;
        return (
          <button
            key={range}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(range)}
            className={rangeTab({ active })}
          >
            {rangeLabel(range)}
          </button>
        );
      })}
    </div>
  );
};
