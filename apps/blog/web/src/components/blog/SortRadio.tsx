'use client';

import { css } from '@blog/styled-system/css';
import { ARCHIVE_SORT_KEYS, type ArchiveSortKey } from '@blog/content/client';
import { SegmentedRadioGroup } from './SegmentedRadioGroup';

interface SortRadioProps {
  value: ArchiveSortKey;
  onChange: (v: ArchiveSortKey) => void;
}

/** 정렬 키별 라벨 — `satisfies`라 패키지에 키가 늘면 여기서 컴파일이 막힌다. */
const SORT_LABEL = {
  recent: '최신순',
  popular: '인기순',
  shortest: '짧은 글부터',
} as const satisfies Record<ArchiveSortKey, string>;

const OPTIONS = ARCHIVE_SORT_KEYS.map(id => ({ id, label: SORT_LABEL[id] }));

const group = css({
  display: 'inline-flex',
  alignItems: 'stretch',
  bg: 'paper.100',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.border',
  rounded: 'element',
  overflow: 'hidden',
});

const divider = css({
  borderLeftWidth: 'hairline',
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
