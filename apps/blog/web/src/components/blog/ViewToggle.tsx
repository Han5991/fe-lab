'use client';

import { css } from '@design-system/ui-lib/css';
import { SegmentedRadioGroup } from './SegmentedRadioGroup';

export type ViewMode = 'list' | 'cards';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const OPTIONS: { id: ViewMode; label: string }[] = [
  { id: 'list', label: '리스트' },
  { id: 'cards', label: '카드' },
];

const group = css({
  display: 'flex',
  borderWidth: '[1px]',
  borderColor: 'ink.border',
  rounded: '[6px]',
  overflow: 'hidden',
});

/** 목록 표시 방식 — 짝이 되는 tabpanel이 없어 tablist가 아니라 라디오 그룹이다. */
export const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <SegmentedRadioGroup
    label="뷰"
    options={OPTIONS}
    value={value}
    onChange={onChange}
    kind="tab"
    className={group}
  />
);
