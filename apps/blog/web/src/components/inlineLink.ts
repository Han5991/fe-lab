import { css } from '@blog/styled-system/css';

import { pressText } from './interaction';

/**
 * 문장 속 링크 — 글 본문(PostBody의 `a` 매퍼)·정책 페이지·빈 상태 문장이 같은 모양을 쓴다.
 *
 * 링크 색(accent.solid)은 본문 잉크라 둘레 글자와 색으로 갈리지 않는다(본문 ink.900 대비
 * 1.15:1). 그래서 **평소 1px 밑줄이 링크의 표식**이고 hover에서 2px로 굵어진다 — 값을 옮겨 온
 * Astryx docsite의 prose 링크와 같은 문법이다. 굵기(`fontWeight`)로 가르지 않는 이유: axe
 * `link-in-text-block`은 굵기 차이도 구분으로 인정해, 굵기를 남기면 밑줄이 빠져도 검사가 통과한다.
 *
 * 누름은 `pressText`다.
 */
export const inlineLink = css(pressText, {
  color: 'accent.solid',
  textDecorationLine: 'underline',
  textDecorationThickness: '[1px]',
  textUnderlineOffset: '[0.16em]',
  // 넘칠 때만 끊는다 — break-all은 평범한 단어 중간도 잘랐다(긴 URL 링크).
  overflowWrap: 'anywhere',
  _hover: { textDecorationThickness: '[2px]' },
});
