'use client';

import { useId } from 'react';
import { css, cx } from '@design-system/ui-lib/css';
import { Label } from './Label';
import { moveRadioByArrow, segmentedItem } from './segmented';

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
const IDS = OPTIONS.map(o => o.id);

const divider = css({
  borderLeftWidth: '[1px]',
  borderLeftStyle: 'solid',
  borderLeftColor: 'ink.border',
});

/**
 * 정렬 라디오 그룹. 그룹은 `div`다 — 예전엔 `<ul role="radiogroup">`이라
 * 역할이 바뀐 목록 아래 `<li>`가 부모 없는 목록 항목으로 남았다(axe listitem,
 * aria-required-children). 그룹 이름은 "정렬" 라벨이 준다(패널이 데스크톱·모바일
 * 시트 두 곳에 렌더되므로 id는 useId).
 */
export const SortRadio = ({ value, onChange }: SortRadioProps) => {
  const labelId = useId();
  return (
    <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
      <Label tone="meta" id={labelId}>
        정렬
      </Label>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className={css({
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
            <button
              key={opt.id}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              type="button"
              onClick={() => onChange(opt.id)}
              onKeyDown={e => moveRadioByArrow(e, IDS, onChange)}
              className={cx(
                segmentedItem({ kind: 'radio', active: isActive }),
                i > 0 && divider,
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
