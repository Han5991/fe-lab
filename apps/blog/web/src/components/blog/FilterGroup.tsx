'use client';

import { css } from '@design-system/ui-lib/css';
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
  multi?: boolean;
}

export const FilterGroup = ({
  label,
  items,
  active,
  onToggle,
}: FilterGroupProps) => {
  if (items.length === 0) return null;
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta" className={css({ display: 'block', mb: '1' })}>
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
                className={css({
                  width: 'full',
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '2',
                  px: '2',
                  py: '1',
                  fontFamily: 'mono',
                  fontSize: 'xs',
                  letterSpacing: 'mono',
                  textAlign: 'left',
                  color: isActive ? 'ink.950' : 'ink.700',
                  borderLeftWidth: '[2px]',
                  borderLeftColor: isActive ? 'ink.950' : 'transparent',
                  bg: isActive ? 'paper.100' : 'transparent',
                  transition: '[all 0.15s]',
                  cursor: 'pointer',
                  _hover: { color: 'ink.950', bg: 'paper.100' },
                })}
              >
                <span>{item.label}</span>
                <span
                  className={css({
                    color: isActive ? 'ink.500' : 'ink.400',
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
