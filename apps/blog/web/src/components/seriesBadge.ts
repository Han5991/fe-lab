import { css } from '@blog/styled-system/css';

/**
 * 시리즈 배지(레퍼런스 `.badge`) — 글 상세 머리·/series가 같은 모양을 쓴다.
 *
 * 중립 배지다: 잉크 틴트(accent.muted) 위 잉크 글자(accent.solid), 14.87 / 11.41:1.
 * 안에 `2/5` 같은 숫자가 있어도 sans다 — 레퍼런스 `.badge`가 font-family를 지정하지 않아
 * sans로 렌더된다. 숫자가 있다고 mono로 바꾸지 말 것.
 *
 * 로컬 변주는 호출부에서 `css(seriesBadgeRaw, { ...override })`로 덧씌운다(cx는 충돌하는
 * 원자 클래스를 병합하지 않는다 — postRow.ts와 같은 규칙).
 */
export const seriesBadgeRaw = css.raw({
  display: 'inline-block',
  fontFamily: 'sans',
  fontSize: '[12px]',
  color: 'accent.solid',
  bg: 'accent.muted',
  rounded: 'full',
  px: '[9px]',
  py: '[2px]',
});
export const seriesBadge = css(seriesBadgeRaw);
