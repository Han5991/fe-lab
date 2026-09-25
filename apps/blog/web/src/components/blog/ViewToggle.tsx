'use client';

import { useId } from 'react';
import { css } from '@design-system/ui-lib/css';
import { Label } from './Label';
import { moveRadioByArrow, segmentedItem } from './segmented';

export type ViewMode = 'list' | 'cards';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'list', label: '리스트' },
  { id: 'cards', label: '카드' },
];
const IDS = OPTIONS.map(o => o.id);

/**
 * 목록 표시 방식 — 둘 중 하나를 고르는 라디오 그룹이다. 예전엔 tablist/tab
 * 역할이었는데 짝이 되는 tabpanel·aria-controls가 없어, 보조기술이 "탭"을 알리고
 * 따라갈 패널이 없는 상태였다(정렬과 같은 단일 선택이라 같은 패턴을 쓴다).
 */
export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  const labelId = useId();
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta" id={labelId}>
        뷰
      </Label>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
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
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => onChange(opt.id)}
              onKeyDown={e => moveRadioByArrow(e, IDS, onChange)}
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
