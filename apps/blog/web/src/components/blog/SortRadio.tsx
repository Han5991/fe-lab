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
          listStyle: 'none',
          p: 0,
          m: 0,
          display: 'flex',
          flexDir: 'column',
          gap: '1px',
        })}
      >
        {OPTIONS.map(opt => {
          const isActive = value === opt.id;
          return (
            <li key={opt.id}>
              <button
                role="radio"
                aria-checked={isActive}
                type="button"
                onClick={() => onChange(opt.id)}
                className={css({
                  width: 'full',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '2',
                  px: '2',
                  py: '1',
                  fontFamily: 'serif',
                  fontSize: 'sm',
                  fontStyle: isActive ? 'italic' : 'normal',
                  textAlign: 'left',
                  color: isActive ? 'marker.600' : 'ink.700',
                  borderLeftWidth: '2px',
                  borderLeftColor: isActive ? 'marker.600' : 'transparent',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  _hover: { color: 'ink.950' },
                })}
              >
                <span aria-hidden="true">{isActive ? '→' : ' '}</span>
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
