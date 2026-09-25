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
