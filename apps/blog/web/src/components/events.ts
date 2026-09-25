import type { MouseEvent } from 'react';

/** 수정자 키나 주 버튼 밖의 클릭 — 새 탭·새 창으로 여는 것이라 가로채지 않는다. */
export const isModifiedClick = (e: MouseEvent): boolean =>
  e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
