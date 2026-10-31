import { css } from '@blog/styled-system/css';

/**
 * 제목 안 인라인 코드의 글자 크기 — 둘러싼 제목 글자의 0.9배. 본문 제목(PostBody)과 차례 항목(TocTitle)이
 * 함께 쓴다. strictTokens 밖 값이라 대괄호로 적는다(`prefer-token`은 fontSizes를 검사하지 않는다).
 */
export const HEADING_CODE_FONT_SIZE = '[0.9em]';

/**
 * 인라인 코드 칩의 면 — 본문의 인라인 코드(CodeBlock)와 차례 항목 안 코드 조각이 같은 칩으로 보이게
 * 한 곳에 둔다. 크기는 자리마다 다르다(본문 문단 안은 고정 14px, 제목·차례 안은 `HEADING_CODE_FONT_SIZE`).
 */
export const inlineCodeChip = css.raw({
  bg: 'paper.100',
  // 색은 둘러싼 글(본문·인용·표·차례)을 따른다.
  color: 'inherit',
  px: '1.5',
  py: '0.5',
  // 인라인 코드는 글줄 안의 작은 요소라 inner 자리다(Astryx Code·Kbd와 같다).
  rounded: 'inner',
  fontFamily: 'mono',
  fontWeight: 'normal',
  overflowWrap: 'anywhere',
});
