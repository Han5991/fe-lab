import type { AreaProps, BarProps } from 'recharts';
import { css } from '@blog/styled-system/css';

/**
 * admin 차트(Recharts)의 움직임 — 그리기 애니메이션은 끄고, 차트가 그려질 때 CSS가 투명도만 올린다.
 *
 * - Recharts 내장 애니메이션(선 드러남·막대 자람·데이터 보간)은 끈다. 데이터가 도착해도 그 시간만큼 차트가
 *   덜 그려진 채로 남아 화면이 다 보이기까지의 시간에 그대로 더해졌다(로컬 실측 — 550ms 그리기를 이 등장으로
 *   바꾸자 글 통계 패널의 차트 완성이 1.70 → 1.33s). 시간을 숫자로 받아 모션 토큰의 사본을 테스트로 잠가야
 *   했던 것도 함께 사라진다.
 * - 데이터가 바뀌면(집계 기간·글별 기간) 새 모양으로 곧바로 바뀐다 — 대시보드의 기간 변경 View Transition은
 *   지표 값 줄만 움직이고 차트를 스냅샷에 담지 않는다(`DashboardScreen`의 `changeRange`).
 */
export const CHART_MOTION = {
  isAnimationActive: false,
} as const satisfies Pick<
  AreaProps<unknown, unknown> & BarProps<unknown, unknown>,
  'isAnimationActive'
>;

/**
 * 차트의 등장 — 차트 칸(`ResponsiveContainer`를 감싼 요소)에 주면 그려진 차트가 투명도 0에서 오른다.
 * 거리 없이 제자리에서 나타나는 것이라 패널을 닫고 드러나는 '고른 글 없음'과 같은 keyframes
 * (`admin-fade-in`)·fastMax·standard다.
 *
 * - 칸이 아니라 안쪽 Recharts 래퍼(`.recharts-wrapper`)에 건다. `ResponsiveContainer`는 제 상자를 잰 뒤에야
 *   차트를 그리고, 데이터가 드러나는 View Transition이 끝날 때까지 React가 그 커밋을 미룬다 — 칸은 차트보다
 *   250~450ms 먼저 빈 채로 서 있어서(실측) 칸에 걸면 차트가 그려지기 전에 끝난다. 래퍼는 그려질 때 생긴다.
 * - 카드 진입처럼 마운트 때 한 번 도는 keyframes라 다시 렌더해도(기간을 바꿔도) 돌지 않는다 —
 *   `@starting-style`은 상호작용으로 삽입되는 요소에만 쓴다(AGENTS.md §9). 움직임 줄이기는 시간 토큰이
 *   처리한다.
 */
export const chartReveal = css.raw({
  '& .recharts-wrapper': {
    animationName: 'admin-fade-in',
    animationDuration: 'fastMax',
    animationTimingFunction: 'standard',
  },
});
