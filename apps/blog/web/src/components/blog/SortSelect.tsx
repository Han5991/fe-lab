'use client';

import { ChevronDown } from 'lucide-react';
import { css } from '@blog/styled-system/css';
import { ARCHIVE_SORT_KEYS, type ArchiveSortKey } from '@blog/content/client';

import { forcedColorsEdge } from '@/src/components/forcedColorsEdge';

interface SortSelectProps {
  value: ArchiveSortKey;
  onChange: (v: ArchiveSortKey) => void;
}

/** 정렬 키별 라벨 — `satisfies`라 패키지에 키가 늘면 여기서 컴파일이 막힌다. */
export const SORT_LABEL = {
  recent: '최신순',
  popular: '인기순',
  shortest: '짧은 글부터',
} as const satisfies Record<ArchiveSortKey, string>;

// select와 chevron을 한 칸에 겹친다 — chevron은 오른쪽 끝·세로 가운데에 놓이고 클릭을 select로 흘린다.
const root = css({ display: 'inline-grid', alignItems: 'center' });

// 폭은 고른 옵션의 글자에 맞춘다(`field-sizing`, 미지원 엔진은 가장 긴 옵션 폭). 오른쪽 안쪽 28은
// chevron 자리 — 보더까지 글자 + 42로 목업의 버튼(12 + 글자 + 4 + 16 + 10)과 같은 폭이다.
const select = css(forcedColorsEdge, {
  gridArea: '1 / 1',
  appearance: 'none',
  fieldSizing: 'content',
  h: '8',
  pl: '3',
  pr: '7',
  rounded: 'full',
  bg: 'transparent',
  color: 'ink.950',
  textStyle: 'label',
  cursor: 'pointer',
  transition: 'colors',
  _hover: { bg: 'paper.100' },
});

const chevron = css({
  gridArea: '1 / 1',
  justifySelf: 'end',
  // grid 칸의 기본 정렬(stretch)은 svg를 칸 위 끝에 붙인다.
  alignSelf: 'center',
  mr: '2.5',
  pointerEvents: 'none',
});

/**
 * 정렬 — 네이티브 select. 옵션 목록·키보드·스크린리더 읽기는 브라우저 몫이고, 보이는 모양은 칩
 * 높이의 pill이다. 이름은 보이는 라벨 없이 `aria-label`로 준다(admin 기간 선택과 같다).
 */
export const SortSelect = ({ value, onChange }: SortSelectProps) => (
  <div className={root}>
    <select
      aria-label="정렬"
      name="sort"
      value={value}
      onChange={e => {
        const next = ARCHIVE_SORT_KEYS.find(key => key === e.target.value);
        if (next) onChange(next);
      }}
      className={select}
    >
      {ARCHIVE_SORT_KEYS.map(key => (
        <option key={key} value={key}>
          {SORT_LABEL[key]}
        </option>
      ))}
    </select>
    <ChevronDown aria-hidden size={16} className={chevron} />
  </div>
);
