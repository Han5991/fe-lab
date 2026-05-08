'use client';

import { css } from '@design-system/ui-lib/css';

export type AnalyticsRange = '7d' | '30d' | '90d';

interface AnalyticsRangeSelectProps {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}

const OPTIONS: { id: AnalyticsRange; label: string }[] = [
  { id: '7d', label: '7일' },
  { id: '30d', label: '30일' },
  { id: '90d', label: '90일' },
];

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
            className={css({
              px: '4',
              py: '1.5',
              fontFamily: 'mono',
              fontSize: 'xs',
              letterSpacing: 'monoLg',
              rounded: 'sm',
              bg: active ? 'ink.950' : 'transparent',
              color: active ? 'paper.50' : 'ink.600',
              cursor: 'pointer',
              transition: '[all 0.15s]',
              _hover: !active ? { color: 'ink.950' } : undefined,
            })}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
