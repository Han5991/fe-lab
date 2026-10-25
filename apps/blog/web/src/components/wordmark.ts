import { css } from '@blog/styled-system/css';

/**
 * 화면의 워드마크 — 사이트 헤더(홈 링크)·푸터(글자)와 admin 셸·로그인 카드가 같은 표기를 쓴다.
 * 표기만 도메인이고, metadata·JSON-LD의 사이트명(`SITE_NAME`, Frontend Lab)은 검색 색인 보호를
 * 위해 그대로 둔다.
 */
export const WORDMARK = 'sangwook.dev';

/**
 * 헤더·관리자 바의 워드마크 링크 — 두 셸이 같은 스타일을 쓰는 단일 출처다(각자 사본을 들고 있었다).
 * 글자는 mono 15px medium 본문 잉크이고, hover에는 흐려진다(텍스트 링크라 크기는 그대로다). 배치(admin은
 * 좁은 화면에서 숨긴다)는 쓰는 쪽이 `css(wordmarkLink, { … })`로 병합한다.
 */
export const wordmarkLink = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  minH: '8',
  fontFamily: 'mono',
  fontWeight: 'medium',
  fontSize: '[15px]',
  color: 'ink.950',
  whiteSpace: 'nowrap',
  transition: 'opacity',
  _hover: { opacity: '0.7' },
});
