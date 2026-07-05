'use client';

import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';

export type ViewMode = 'list' | 'cards';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'list', label: '리스트' },
  { id: 'cards', label: '카드' },
];

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta">뷰</Label>
      <div
        role="tablist"
        className={css({
          display: 'flex',
          borderWidth: '[1px]',
          borderColor: 'ink.border',
          rounded: '[6px]',
          overflow: 'hidden',
        })}
      >
        {OPTIONS.map(opt => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(opt.id)}
              className={css({
                flex: '1',
                px: '[12px]',
                py: '[5px]',
                fontFamily: 'mono',
                fontSize: 'xs',
                letterSpacing: 'wide',
                textTransform: 'uppercase',
                bg: isActive ? 'paper.300' : 'transparent',
                color: isActive ? 'ink.950' : 'ink.600',
                cursor: 'pointer',
                transition: '[all 0.15s]',
                _hover: !isActive
                  ? { color: 'ink.900', bg: 'paper.200' }
                  : undefined,
              })}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
