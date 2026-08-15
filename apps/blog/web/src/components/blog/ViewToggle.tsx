'use client';

import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';
import { segmentedItem } from './segmented';

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
              className={segmentedItem({ kind: 'tab', active: isActive })}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
