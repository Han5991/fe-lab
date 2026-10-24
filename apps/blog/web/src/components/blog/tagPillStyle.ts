import { css } from '@blog/styled-system/css';

// 글 목록의 태그(토픽) 칩 스타일 — 그리드 카드(PostGridCard)의 태그와 적용 중인
// 필터 칩(ActiveFilters)이 쓴다. 목록 계열 컴포넌트마다 손으로 복붙하던
// 동일 블록을 한 곳으로 모은다. 미세한 변주(hover, fontFamily)는 호출부에서
// `css(tagPillStyle, { ...override })`로 덧씌운다 — css()는 스타일 객체를 병합한다.
export const tagPillStyle = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  px: '[10px]',
  py: '[2px]',
  rounded: 'full',
  bg: 'paper.200',
  color: 'ink.700',
  fontSize: 'xs',
  fontWeight: 'medium',
  lineHeight: 'flat',
});
