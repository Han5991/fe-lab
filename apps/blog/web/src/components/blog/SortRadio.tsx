'use client';

import { css } from '@design-system/ui-lib/css';
import { SegmentedRadioGroup } from './SegmentedRadioGroup';

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

const group = css({
  display: 'inline-flex',
  alignItems: 'stretch',
  bg: 'paper.100',
  borderWidth: '[1px]',
  borderStyle: 'solid',
  borderColor: 'ink.border',
  rounded: '[6px]',
  overflow: 'hidden',
});

const divider = css({
  borderLeftWidth: '[1px]',
  borderLeftStyle: 'solid',
  borderLeftColor: 'ink.border',
});

/**
 * 정렬 라디오 그룹. 그룹은 `div`다 — `<ul role="radiogroup">`이면 역할이 바뀐
 * 목록 아래 `<li>`가 부모 없는 목록 항목으로 남는다(axe listitem,
 * aria-required-children).
 */
export const SortRadio = ({ value, onChange }: SortRadioProps) => (
  <SegmentedRadioGroup
    label="정렬"
    options={OPTIONS}
    value={value}
    onChange={onChange}
    kind="radio"
    className={group}
    dividerClassName={divider}
  />
);
