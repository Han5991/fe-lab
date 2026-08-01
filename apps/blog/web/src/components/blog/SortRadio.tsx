'use client';

import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';

export type SortKey = 'recent' | 'popular' | 'shortest';

interface SortRadioProps {
  value: SortKey;
  onChange: (v: SortKey) => void;
}

const OPTIONS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: '최신순' },
  { id: 'popular', label: '인기순' },
  { id: 'shortest', label: '짧은 글부터' },
];

export const SortRadio = ({ value, onChange }: SortRadioProps) => {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta">정렬</Label>
      <ul
        role="radiogroup"
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          display: 'inline-flex',
          alignItems: 'stretch',
          bg: 'paper.100',
          borderWidth: '[1px]',
          borderStyle: 'solid',
          borderColor: 'ink.border',
          rounded: '[6px]',
          overflow: 'hidden',
        })}
      >
        {OPTIONS.map((opt, i) => {
          const isActive = value === opt.id;
          return (
            <li
              key={opt.id}
              className={css({
                display: 'flex',
                borderLeftWidth: i === 0 ? '[0]' : '[1px]',
                borderLeftStyle: 'solid',
                borderLeftColor: 'ink.border',
              })}
            >
              <button
                role="radio"
                aria-checked={isActive}
                type="button"
                onClick={() => onChange(opt.id)}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  px: '[12px]',
                  py: '[5px]',
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                  bg: isActive ? 'paper.300' : 'transparent',
                  color: isActive ? 'ink.950' : 'ink.600',
                  transition: '[color 0.15s, background 0.15s]',
                  cursor: 'pointer',
                  _hover: {
                    color: 'ink.950',
                    bg: isActive ? 'paper.300' : 'paper.200',
                  },
                })}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
