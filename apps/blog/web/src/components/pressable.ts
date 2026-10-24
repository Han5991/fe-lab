import { css } from '@blog/styled-system/css';

/**
 * 누름 피드백 — 마우스로 누르는 동안 버튼이 98%로 줄어든다(Astryx Button의 `pressable`).
 * 행동 버튼(`actionButton`)과 아이콘 버튼이 `css(pressable, { … })`로 합친다.
 *
 * - 전환은 `common`(색·투명도·transform)이라 hover 색과 누름이 같은 시간(fast)을 탄다.
 *   쓰는 쪽이 `transition`을 다시 적으면 transform이 빠져 누름이 뚝 끊긴다.
 * - 거친 포인터(터치)에서는 끈다 — 터치의 `:active`는 누름이 아니라 손가락이 닿은 순간에
 *   칠해지고 스크롤 뒤까지 남는다(Astryx와 같은 판단).
 * - 움직임 줄이기는 시간 토큰이 맡는다(fast가 0.01ms가 된다).
 */
export const pressable = css.raw({
  transition: 'common',
  _active: { transform: 'scale(0.98)' },
  _pointerCoarse: { _active: { transform: 'none' } },
});
