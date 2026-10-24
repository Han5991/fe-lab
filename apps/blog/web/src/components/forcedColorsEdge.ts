import { css } from '@blog/styled-system/css';

/**
 * 면으로만 갈리는 상자(글자 버튼·칩)의 **투명 hairline** — 강제 색상 모드(Windows 고대비)용이다. 그
 * 모드는 면을 지우고 보더만 시스템 색으로 칠하므로, 보더가 없으면 상자가 맨 글자(링크처럼 보인다)로
 * 남는다. 평소에는 투명이라 보이지 않고, 높이(`h`)가 보더를 포함하므로 크기도 그대로다.
 *
 * 레시피(`actionButton`·`chip`)는 cva `base`에 펼친다. 글리프가 남는 아이콘 버튼에는 두지 않는다.
 */
export const forcedColorsEdge = css.raw({
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'transparent',
});
