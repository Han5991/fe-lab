'use client';

import { css, cva } from '@design-system/ui-lib/css';
import { Label } from './Label';

export interface FilterItem {
  id: string;
  label: string;
  count: number;
}

interface FilterGroupProps {
  label: string;
  items: FilterItem[];
  active: string[];
  onToggle: (id: string) => void;
}

const filterItem = cva({
  base: {
    width: 'full',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '[8px]',
    px: '[8px]',
    py: '[4px]',
    rounded: '[6px]',
    fontSize: 'sm',
    textAlign: 'left',
    transition: '[color 0.15s, background-color 0.15s]',
    cursor: 'pointer',
    _hover: { color: 'ink.950', bg: 'paper.200' },
  },
  variants: {
    active: {
      true: { fontWeight: 'semibold', color: 'ink.950', bg: 'paper.200' },
      false: { fontWeight: 'normal', color: 'ink.700', bg: 'transparent' },
    },
  },
  defaultVariants: { active: false },
});

export const FilterGroup = ({
  label,
  items,
  active,
  onToggle,
}: FilterGroupProps) => {
  if (items.length === 0) return null;
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '[6px]' })}>
      <Label tone="meta" className={css({ display: 'block', mb: '[2px]' })}>
        {label}
      </Label>
      <ul
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          display: 'flex',
          flexDir: 'column',
        })}
      >
        {items.map(item => {
          const isActive = active.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onToggle(item.id)}
                aria-pressed={isActive}
                className={filterItem({ active: isActive })}
              >
                <span>{item.label}</span>
                <span
                  className={css({
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minW: '[20px]',
                    px: '[6px]',
                    rounded: '[2rem]',
                    bg: 'paper.300',
                    color: 'ink.600',
                    fontSize: 'xs',
                    fontWeight: 'medium',
                    lineHeight: 'flat',
                    fontVariantNumeric: 'tabular-nums',
                  })}
                >
                  {item.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
