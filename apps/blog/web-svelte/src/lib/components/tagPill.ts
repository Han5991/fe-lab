import { css } from '../../../styled-system/css';

/**
 * 글 카드·활성 필터 칩이 공유하는 태그(토픽) 칩 스타일.
 * `apps/blog/web/src/components/blog/tagPillStyle.ts`의 이식이다.
 *
 * 변주는 호출부에서 `css(tagPillRaw, { ...override })`로 덧씌운다 — `cx`는
 * 충돌하는 원자 클래스를 병합하지 않으므로 raw 병합만 쓴다(postRow.ts와 같은 규칙).
 */
export const tagPillRaw = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  px: '[10px]',
  py: '[2px]',
  rounded: '[2rem]',
  bg: 'paper.200',
  color: 'ink.700',
  fontSize: 'xs',
  fontWeight: 'medium',
  lineHeight: 'flat',
});
