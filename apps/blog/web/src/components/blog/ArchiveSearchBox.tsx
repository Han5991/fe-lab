'use client';

import type { Ref } from 'react';
import { Search } from 'lucide-react';
import { css, cx } from '@blog/styled-system/css';
import { pressButton } from '@/src/components/interaction';

interface ArchiveSearchBoxProps {
  /** 지금 검색어 — 상태는 쓰는 쪽(글 목록)이 든다 */
  value: string;
  /** 글자마다 */
  onChange: (q: string) => void;
  /** "지우기" */
  onClear: () => void;
  /** 입력을 떠날 때 — 쓰는 쪽이 미뤄 둔 URL 쓰기를 바로 낸다 */
  onBlur: () => void;
  /** 버튼이 사라지는 동작 뒤 초점을 돌려받을 입력 */
  inputRef: Ref<HTMLInputElement>;
}

// 상자 전체가 label이라 아이콘·여백을 눌러도 입력에 초점이 간다(첫 labelable 자손이 입력이다).
const box = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  h: '10',
  px: '3.5',
  rounded: 'element',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.borderStrong',
  bg: 'paper.50',
  cursor: 'text',
  transition: 'colors',
  _focusWithin: { borderColor: 'accent.solid' },
});

const icon = css({ color: 'ink.700', flexShrink: '0' });

const input = cx(
  'peer',
  css({
    flex: '1',
    minW: '0',
    bg: 'transparent',
    border: '[none]',
    outline: '[none]',
    textStyle: 'body',
    color: 'ink.950',
    _placeholder: { color: 'ink.500' },
  }),
);

// 늘 그리고, 입력이 비어 플레이스홀더가 보이는 동안은 CSS가 숨긴다. 글자만 있는 버튼이라 면은 없어도
// 누름은 `pressButton`이다.
const clear = css(pressButton, {
  textStyle: 'supporting',
  color: 'ink.700',
  flexShrink: '0',
  cursor: 'pointer',
  _hover: { color: 'ink.950' },
  _peerPlaceholderShown: { display: 'none' },
});

/** 글 목록 검색 상자 — 제목·요약·태그를 거른다(본문은 아니다). 표현만 하고 상태는 쓰는 쪽이 든다. */
export const ArchiveSearchBox = ({
  value,
  onChange,
  onClear,
  onBlur,
  inputRef,
}: ArchiveSearchBoxProps) => (
  <label className={box}>
    <Search aria-hidden size={16} className={icon} />
    <input
      ref={inputRef}
      type="search"
      aria-label="글 검색"
      placeholder="제목, 요약, 태그 검색…"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className={input}
    />
    {/* 버튼은 interactive content라 눌러도 label 활성화(입력 초점)가 일어나지 않는다. */}
    <button type="button" onClick={onClear} className={clear}>
      지우기
    </button>
  </label>
);
