import { css } from '@blog/styled-system/css';

import { pressTextBox } from './interaction';

/**
 * 화면의 워드마크 — 사이트 헤더(홈 링크)·푸터(글자)와 admin 셸·로그인 카드가 같은 표기를 쓴다.
 * 표기만 도메인이고, metadata·JSON-LD의 사이트명(`SITE_NAME`, Frontend Lab)은 검색 색인 보호를
 * 위해 그대로 둔다.
 */
export const WORDMARK = 'sangwook.dev';

/**
 * 헤더·관리자 바의 워드마크 링크 — 두 셸이 같은 스타일을 쓰는 단일 출처다(각자 사본을 들고 있었다).
 * 글자는 mono 15px medium 본문 잉크이고, hover에는 투명도 0.7이다. 누름은 `pressTextBox`이고, 이 hover도 그
 * 프리셋의 전환을 타서 들고 날 때 release다(이유는 `interaction.ts`의 `pressText` 주석). 배치(admin은 좁은
 * 화면에서 숨긴다)는 쓰는 쪽이 `css(wordmarkLink, { … })`로 병합한다.
 */
export const wordmarkLink = css.raw(pressTextBox, {
  display: 'inline-flex',
  alignItems: 'center',
  minH: '8',
  fontFamily: 'mono',
  fontWeight: 'medium',
  fontSize: '[15px]',
  color: 'ink.950',
  whiteSpace: 'nowrap',
  _hover: { opacity: '0.7' },
});
