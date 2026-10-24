import type { AreaProps, BarProps } from 'recharts';

/**
 * admin 차트(Recharts)의 그리기 움직임 — 처음 그릴 때 선이 왼쪽부터 드러나고 막대가 자라며, 데이터가
 * 바뀌면(집계 기간·글별 기간) 이전 모양에서 새 모양으로 보간한다. Recharts 내장 애니메이션이라 JS가
 * 늘지 않는다.
 *
 * - 시간·곡선은 모션 토큰 `durations.mediumMax`(550ms)·`easings.standard`의 **사본**이다. Recharts는
 *   CSS 변수가 아니라 숫자·곡선 문자열을 받고, src는 경계상 `@blog/preset`을 열지 않는다 —
 *   `chartMotion.test.ts`가 프리셋 값과 같음을 잠근다. mediumMax인 이유: 검색 다이얼로그 등장처럼
 *   화면에서 가장 큰 덩어리가 자리 잡는 단계이고, 같이 그려지는 가로 막대(`admin-bar-grow`)와 끝이 맞는다.
 * - 움직임 줄이기는 Recharts의 `'auto'`가 맡는다 — `prefers-reduced-motion: reduce`면 애니메이션을 끈다
 *   (토큰이 0.01ms가 되는 CSS 쪽과 같은 결과).
 */
export const CHART_MOTION = {
  isAnimationActive: 'auto',
  animationDuration: 550,
  animationEasing: 'cubic-bezier(0.24,1,0.4,1)',
} as const satisfies Pick<
  AreaProps<unknown, unknown> & BarProps<unknown, unknown>,
  'isAnimationActive' | 'animationDuration' | 'animationEasing'
>;
