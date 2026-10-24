import type { CSSProperties } from 'react';
import { css, cva } from '@blog/styled-system/css';
import { VIEW_TRANSITION } from '@/src/shared/viewTransitions';
import { iconButton } from '../iconButton';

/**
 * admin 화면이 함께 쓰는 면·배지·표 모양 — 승인 admin 목업(Astryx Card·Badge·Table)의 블로그 판.
 * 수치의 근거는 blog-design-system 스킬의 "admin" 절이다.
 */

/**
 * 카드 머리(제목·지표 라벨)의 헤딩 단계 — 페이지 h1 바로 아래면 h2, 절(h2) 안이면 h3.
 * 카드(`AdminCard`)와 지표 카드(`MetricCard`)가 함께 받는다.
 */
export type CardHeadingLevel = 'h2' | 'h3';

/**
 * 카드·패널 면 — Astryx Card. 바닥(`surface.base`)보다 한 단계 밝은 `surface.raised`에 hairline,
 * `container` 라운드, 안쪽 16. 흐름 안의 면이라 그림자는 없다(AGENTS.md §9).
 */
export const adminCard = css.raw({
  bg: 'surface.raised',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
  rounded: 'container',
  p: '4',
});

/**
 * 진입 — 데이터가 처음 그려질 때(스켈레톤이 걷힌 뒤) 카드·덩어리가 8px 아래에서 떠오른다. keyframes·
 * 시간·곡선이 들어오는 페이지와 같다(`page-enter`, medium·standard). 함께 그려지는 것들은
 * `enterOrderStyle`로 받은 순서마다 `durations.stagger`씩 늦게 출발해 위에서 아래로 차례로 선다.
 *
 * - 마운트될 때 한 번 돈다 — 집계 기간을 바꿔도 카드는 다시 마운트되지 않아 반복되지 않는다.
 * - 공개 페이지에는 목록 진입을 넣지 않는다(blog-design-system 스킬 모션 절 — 하드 로드의 LCP·가시성
 *   검사). admin 화면은 가드와 데이터를 기다린 뒤에만 그려져, 이 진입은 첫 페인트가 아니라
 *   스켈레톤 다음 장면이다.
 * - 유한 애니메이션이라 e2e axe 도우미가 끝날 때까지 기다린다. 움직임 줄이기에서는 시간·간격 토큰이
 *   0.01ms가 되어 곧바로 선다.
 */
export const enterMotion = css.raw({
  animationName: VIEW_TRANSITION.pageEnter,
  animationDuration: 'medium',
  animationTimingFunction: 'standard',
  animationFillMode: 'both',
  animationDelay: '[calc(var(--enter-order, 0) * token(durations.stagger))]',
});

/** 진입 순서 — `enterMotion`을 단 요소의 style로 준다(0이 먼저 선다). */
export const enterOrderStyle = (
  order: number,
): CSSProperties & Record<`--${string}`, string> => ({
  '--enter-order': String(order),
});

/**
 * 높이 20의 pill 배지 — Astryx neutral Badge(`paper.200` 면, 12/20 500). 관리자 바·로그인 카드의
 * `Admin` 표식, 글 상태, 태그가 쓴다. 상태 배지는 글자색만 덧씌운다(`postState.ts`의 `statusTone`).
 */
export const pillBadge = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  h: '5',
  px: '2',
  rounded: 'full',
  bg: 'paper.200',
  color: 'ink.950',
  textStyle: 'supporting',
  fontWeight: 'medium',
  whiteSpace: 'nowrap',
  flexShrink: '0',
});

/**
 * 카드 안 표를 카드 가장자리까지 붙인다(Astryx Table의 카드 블리드) — 카드 안쪽 16만큼 좌우·아래로
 * 내민다. 표의 첫·끝 칸이 그 16을 안쪽 여백으로 돌려받는다(`adminCell`).
 */
export const cardTableBleed = css({ mx: '-4', mb: '-4' });

/** 표 — Astryx BaseTable(고정 레이아웃, 보더 겹침). 열 폭은 머리 칸이 정한다. */
export const adminTable = css({
  w: 'full',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
});

/** 마지막 줄은 아래 구분선이 없다(Astryx TableCell). */
export const adminTableBody = css({
  '& > tr:last-child > td': { borderBottomWidth: 'none' },
});

/**
 * 머리·본문 칸 — Astryx TableHeaderCell·TableCell. 머리는 `h4`(14/20 600) 보조 잉크, 본문은
 * `body`. 줄 사이 hairline. 첫·끝 칸은 카드 안쪽(16)만큼 들인다. 숫자 열(`align: end`)은 오른쪽
 * 정렬에 고정폭 숫자다.
 */
export const adminCell = cva({
  base: {
    px: '3',
    textAlign: 'start',
    verticalAlign: 'middle',
    borderBottomWidth: 'hairline',
    borderColor: 'ink.border',
    _first: { pl: '4' },
    _last: { pr: '4' },
  },
  variants: {
    kind: {
      head: { py: '2', textStyle: 'h4', color: 'ink.700' },
      body: { py: '2.5', textStyle: 'body', color: 'ink.950' },
    },
    align: {
      start: {},
      end: { textAlign: 'end', fontVariantNumeric: 'tabular-nums' },
    },
  },
  defaultVariants: { kind: 'body', align: 'start' },
});

/** 한 줄로 자르는 제목 — 표의 제목 칸·카드 머리. */
export const truncate = css.raw({
  display: 'block',
  minW: '0',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

/** 독립 링크 — 목록 제목처럼 hover 밑줄로만 가른다(blog-design-system 스킬 "색으로 갈리지 않는 자리"). */
export const rowLink = css.raw({
  color: 'ink.950',
  _hover: { textDecorationLine: 'underline' },
});

/**
 * 가로 막대 한 줄의 트랙과 채움 — 태그 분포·누적 비중·요일 분포(Astryx ProgressBar, 높이 8 pill).
 *
 * 채움은 트랙 폭 그대로이고 값만큼 왼쪽으로 밀려 있다(`barShare` — 인라인 transform). 폭(`width: N%`)
 * 대신 transform으로 길이를 내는 이유는 움직임이다: 처음 그려질 때 트랙 왼쪽 밖에서 자기 자리까지
 * 자라고(`admin-bar-grow`, mediumMax·standard), 값이 바뀌면 그 자리로 미끄러진다 —
 * 둘 다 레이아웃 없이 합성만 돈다. 트랙의 `overflow: hidden`과 pill 라운드가 밀려난 쪽을 잘라 왼쪽
 * 끝도 둥글게 보인다(폭으로 그리던 때와 같은 모양).
 */
export const barTrack = css({
  display: 'block',
  h: '2',
  rounded: 'full',
  bg: 'paper.200',
  overflow: 'hidden',
});

/** 채움의 길이 — 트랙 대비 비율(0~1)만큼만 보이게 채움을 왼쪽으로 민다. */
export const barShare = (ratio: number): CSSProperties => ({
  transform: `translateX(${(ratio - 1) * 100}%)`,
});

export const barFill = cva({
  base: {
    display: 'block',
    w: 'full',
    h: 'full',
    rounded: 'full',
    transition: 'transform',
    transitionDuration: 'mediumMax',
    animationName: 'admin-bar-grow',
    animationDuration: 'mediumMax',
    animationTimingFunction: 'standard',
    animationFillMode: 'both',
  },
  variants: {
    tone: {
      // 데이터 색 — admin 차트와 같은 spot.600(blog-preset.ts의 spot 주석).
      data: { bg: 'spot.600' },
      // 강조하지 않는 막대 — 1위만 데이터 색으로 세우는 분포(태그)의 나머지.
      muted: { bg: 'ink.400' },
      // 누적 비중 — Astryx ProgressBar 채움은 accent(잉크)다.
      ink: { bg: 'accent.solid' },
    },
  },
  defaultVariants: { tone: 'data' },
});

/**
 * 카드·패널 위의 작은 아이콘 버튼(28) — 패널 닫기, 목록의 새 탭 링크. ghost의 hover 면(paper.100)은
 * 다크 카드(`surface.raised` = paper.100)와 같은 색이라 한 단계 위(paper.200)로 올린다. 아이콘만
 * 있는 단서라 글리프는 비텍스트 대비 3:1을 넘는 보조 잉크다(WCAG 1.4.11). 클래스 문자열이라 다른
 * 스타일과 합치지 않는다(`headerIconButton`과 같은 이유).
 */
export const panelIconButton = css(
  iconButton.raw({ tone: 'ghost', size: 'sm' }),
  {
    color: 'ink.700',
    _hover: { bg: 'paper.200', color: 'ink.950' },
  },
);
