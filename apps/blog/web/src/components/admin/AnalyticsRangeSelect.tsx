'use client';

import { css, cva } from '@design-system/ui-lib/css';
import type { AnalyticsRange } from '@/domain/analytics';

interface AnalyticsRangeSelectProps {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

const OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
  { id: '90d', label: '90일' },
];

const rangeTab = cva({
  base: {
    px: '4',
    py: '1.5',
    fontFamily: 'mono',
    fontSize: 'xs',
    letterSpacing: 'monoLg',
    rounded: 'sm',
    cursor: 'pointer',
    transition: '[all 0.15s]',
  },
  variants: {
    active: {
      true: { bg: 'ink.950', color: 'paper.50' },
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
        borderWidth: '[1px]',
        borderColor: 'ink.border',
        rounded: 'md',
        bg: 'paper.100',
        p: '0.5',
      })}
    >
      {OPTIONS.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.id)}
            className={rangeTab({ active })}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
