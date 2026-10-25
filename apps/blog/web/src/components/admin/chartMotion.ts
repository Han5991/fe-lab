import type { AreaProps, BarProps } from 'recharts';
import { css } from '@blog/styled-system/css';

/**
 * admin 차트(Recharts)의 움직임 — 그리기 애니메이션은 끄고, 그려진 차트를 CSS가 움직인다(`chartReveal`).
 *
 * - Recharts 내장 애니메이션(선 드러남·막대 자람·데이터 보간)은 끈다. 그 시간은 JS가 모양을 한 프레임씩
 *   다시 계산하는 시간이라 데이터가 도착해도 차트가 덜 그려진 채 남아 화면이 다 보이기까지의 시간에 그대로
 *   더해졌고(로컬 실측 — 550ms 그리기를 투명도 등장으로 바꾸자 글 통계 패널의 차트 완성이 1.70 → 1.33s),
 *   시간을 숫자로 받아 모션 토큰의 사본을 테스트로 잠가야 했다. 같은 드러남을 CSS(`chartReveal`)로 내면
 *   곡선이 standard(앞이 가파르다)라 선이 처음 100ms 안에 절반 넘게, 260ms에 94%가 그려진다.
 * - 같은 층의 데이터가 바뀌면 새 모양으로 곧바로 바뀐다(보간 없음). 기간이 바뀔 땐 `TimeSeriesChart`가
 *   선 층을 새로 마운트해 처음부터 다시 그린다 — 대시보드의 기간 변경 View Transition은 지표 값 줄만
 *   움직이고 차트를 스냅샷에 담지 않는다(`DashboardScreen`의 `changeRange`).
 */
export const CHART_MOTION = {
  isAnimationActive: false,
} as const satisfies Pick<
  AreaProps<unknown, unknown> & BarProps<unknown, unknown>,
  'isAnimationActive'
>;

/**
 * 차트의 등장 — 차트 칸(`ResponsiveContainer`를 감싼 요소)에 주면 차트가 그려질 때 CSS가 움직인다. 선·면은
 * 왼쪽에서 오른쪽으로 그려 나가고(`admin-chart-wipe`), 막대는 바닥에서 자라며(`admin-chart-rise`), 축·격자는
 * 제자리에서 투명도만 오른다(`admin-fade-in`, 패널을 닫고 드러나는 '고른 글 없음'과 같은 것). Recharts
 * 내장 애니메이션(CHART_MOTION으로 끔)이 하던 드러남을 CSS로 되돌린 것이라 JS는 늘지 않는다.
 *
 * - 시간·곡선은 선·막대 모두 mediumMax·standard — 같이 그려지는 가로 막대(`admin-bar-grow`)와 끝이 맞는다.
 *   움직임 줄이기는 시간 토큰(0.01ms)이 처리한다.
 * - 선·면은 `clip-path: inset()`으로 가린다. 대상은 `.recharts-area`(SVG `<g>`)라 기준 상자가 그 그룹의
 *   stroke-box — 곧 선이 실제로 놓인 가로 범위이고, 그래서 와이프가 축 눈금이 아니라 첫 점에서 시작한다.
 *   plot 영역 전체(축 포함)에 걸지 않는 이유다. 위치만 바뀌는 transform과 달리 clip-path는 합성 전용이
 *   아니지만 레이어가 SVG 한 장이고 550ms라 래스터 비용이 작다. 끝 키프레임이 명시적 `inset(0 0 0 0)`인
 *   이유는 `none`으로는 보간되지 않아 도중에 뚝 열리기 때문이다(애니메이션이 끝나면 clip-path는 없다 —
 *   활성 점이 잘리지 않는다).
 * - 막대는 `.recharts-bar-rectangle` 하나하나가 `scaleY(0 → 1)`, 기준은 제 상자 바닥(`transform-box:
 *   fill-box`)이다. 라운드(radius)가 자라는 동안 눌려 보이지만 높이를 보간하던 Recharts 모양과 눈으로
 *   구분되지 않는다.
 * - 래퍼의 투명도 등장은 칸이 아니라 안쪽 Recharts 래퍼(`.recharts-wrapper`)에 건다. `ResponsiveContainer`는
 *   제 상자를 잰 뒤에야 차트를 그리고, 데이터가 드러나는 View Transition이 끝날 때까지 React가 그 커밋을
 *   미룬다 — 칸은 차트보다 250~450ms 먼저 빈 채로 서 있어서(실측) 칸에 걸면 차트가 그려지기 전에 끝난다.
 *   래퍼·선·막대는 그려질 때 생긴다.
 * - 모두 마운트 때 한 번 도는 keyframes라 다시 렌더해도 돌지 않는다 — `@starting-style`은 상호작용으로
 *   삽입되는 요소에만 쓴다(AGENTS.md §9). 기간을 바꿀 때 다시 그리려면 부르는 쪽이 `<Area>`에 기간을
 *   `key`로 줘 층만 새로 마운트한다(`TimeSeriesChart`) — 축은 그대로 두고 선만 다시 그려진다.
 */
export const chartReveal = css.raw({
  '& .recharts-wrapper': {
    animationName: 'admin-fade-in',
    animationDuration: 'fastMax',
    animationTimingFunction: 'standard',
  },
  '& .recharts-area': {
    animationName: 'admin-chart-wipe',
    animationDuration: 'mediumMax',
    animationTimingFunction: 'standard',
  },
  '& .recharts-bar-rectangle': {
    transformBox: 'fill-box',
    transformOrigin: '50% 100%',
    animationName: 'admin-chart-rise',
    animationDuration: 'mediumMax',
    animationTimingFunction: 'standard',
  },
});
