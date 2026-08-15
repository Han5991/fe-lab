import type { ReactNode } from 'react';
import { css, cva, sva } from '@design-system/ui-lib/css';
import type { RecipeVariant } from '@design-system/ui-lib/css';

/**
 * 다이어그램 프리미티브 — 핸드오프 §4 "다이어그램 문법"을 코드로 강제한다.
 *
 * - 노드는 라운드 사각형(rx 8), 스트로크 1px
 * - 실선 = 동기 호출, 점선 = 비동기/데이터 흐름
 * - 색은 회색(구조) + 액센트(핵심 경로) **2색만**
 *
 * 색은 하드코딩하지 않고 Panda `css()` 로 토큰에 연결한다. `fill`/`stroke` 도
 * semanticTokens를 타므로 다크모드가 CSS 변수 교체만으로 자동 전환된다.
 *
 * 이 파일은 훅을 쓰지 않는다 — 홈(`app/page.tsx`)은 서버 컴포넌트라
 * `useId()` 같은 훅을 쓰면 그 자리에서 클라이언트 경계가 생긴다. 장식용 SVG
 * 하나 때문에 정적 페이지에 JS를 얹을 이유가 없다.
 */

// ── 프레임 ──────────────────────────────────────────────────────────────────

const frame = cva({
  base: {
    display: 'block',
    h: 'auto',
    // SVG 안 <text>는 본문 폰트를 따른다(레퍼런스 `svg text{font-family:var(--sans)}`).
    fontFamily: 'sans',
  },
  variants: {
    /**
     * 손으로 그린 다이어그램은 놓일 자리에 맞춰 viewBox를 정하므로(히어로 640, 홈 모티프
     * 210) 칼럼을 꽉 채우는 게 맞다(fill). 반면 **자동 레이아웃 다이어그램의 viewBox
     * 폭은 노드 텍스트 길이의 합**이라 그림마다 다르다. 그걸 매번 칼럼 폭까지 늘리면
     * 같은 글 안에서 노드 둘짜리는 3.9배로 부풀고 일곱짜리는 0.68배로 쪼그라들어,
     * 12px로 못 박아 둔 노드 제목이 실제로는 8~47px로 렌더된다. intrinsic 폭을 주고
     * 칼럼을 상한으로만 쓰면 어떤 그림이든 글자가 12px로 나오고, 칼럼보다 넓을 때만
     * 줄어든다.
     */
    sizing: {
      fill: { w: 'full' },
      intrinsic: { maxW: 'full', mx: 'auto' },
    },
  },
  defaultVariants: { sizing: 'fill' },
});

interface DiagramFrameProps {
  /** 예: `'0 0 640 122'` */
  viewBox: string;
  /**
   * viewBox와 같은 단위의 고유 크기. 주면 그 크기로 그리고 칼럼 폭을 넘을 때만
   * 줄어든다. 생략하면 칼럼을 꽉 채운다(손으로 좌표를 박은 다이어그램의 기본값).
   */
  width?: number;
  height?: number;
  /**
   * 의미 있는 다이어그램이면 설명을 준다 → `role="img"` + `aria-label`.
   * 생략하면 장식으로 보고 `aria-hidden` 처리한다(접근성 규칙: 스펙 §8).
   */
  label?: string;
  children: ReactNode;
}

export function DiagramFrame({
  viewBox,
  width,
  height,
  label,
  children,
}: DiagramFrameProps) {
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      // 장식 SVG가 탭 순서에 끼어드는 IE/Edge 잔재 방지 + 시맨틱 명시
      focusable="false"
      className={frame({ sizing: width === undefined ? 'fill' : 'intrinsic' })}
    >
      {children}
    </svg>
  );
}

// ── 노드 ────────────────────────────────────────────────────────────────────

const node = cva({
  base: { strokeWidth: 'hairline' },
  variants: {
    tone: {
      gray: { fill: 'paper.100', stroke: 'ink.border' },
      accent: { fill: 'accent.50', stroke: 'accent.500' },
    },
  },
  defaultVariants: { tone: 'gray' },
});

/**
 * 노드의 **역할**. 색 이름이 아니다.
 *
 * 원래 `'gray' | 'teal'`이었는데, 포인트색을 틸에서 cyan으로 바꾸자 값 이름이
 * 곧바로 거짓말이 됐다. 이 값이 뜻하는 건 "청록색"이 아니라 "핵심 경로"이므로
 * 팔레트와 무관한 이름으로 바꿨다. 옛 `tone="teal"`은 `declarative.tsx`가
 * 별칭으로 받아준다.
 *
 * 값 목록은 recipe의 variant 키에서 파생된다 — 따로 관리하지 않는다.
 */
export type DiagramTone = RecipeVariant<typeof node>['tone'];

// SVG 안 font-size는 user unit이라 viewBox 좌표와 같은 축이다. 타이포 스케일
// 토큰(rem 기반)을 끌어오면 루트 폰트 크기에 따라 도형과 글자 비율이 어긋나므로,
// 레퍼런스 SVG의 px 값을 그대로 박아 둔다.
const nodeTitle = css({
  fontSize: '[12px]',
  fontWeight: 'semibold',
  fill: 'ink.950',
  stroke: '[none]',
});

const nodeSubtitle = css({
  fontSize: 'xs',
  fill: 'ink.600',
  stroke: '[none]',
});

interface DiagramNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 핸드오프 §4 기본값. 작은 장식 노드나 pill 모양일 때만 바꾼다. */
  rx?: number;
  tone?: DiagramTone;
  title?: string;
  /** 5단어 이내(핸드오프 §4). */
  subtitle?: string;
}

export function DiagramNode({
  x,
  y,
  width,
  height,
  rx = 8,
  tone = 'gray',
  title,
  subtitle,
}: DiagramNodeProps) {
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rx}
        data-tone={tone}
        className={node({ tone })}
      />
      {title && (
        <text
          x={centerX}
          // 부제가 있으면 두 줄이 노드 중앙을 사이에 두고 갈라선다.
          y={subtitle ? centerY - 3 : centerY + 4}
          textAnchor="middle"
          className={nodeTitle}
        >
          {title}
        </text>
      )}
      {subtitle && (
        <text
          x={centerX}
          y={centerY + 14}
          textAnchor="middle"
          className={nodeSubtitle}
        >
          {subtitle}
        </text>
      )}
    </g>
  );
}

// ── 엣지 ────────────────────────────────────────────────────────────────────

const edge = sva({
  slots: ['root', 'line'],
  base: {
    root: {
      fill: '[none]',
      strokeWidth: 'hairline',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
  },
  variants: {
    emphasis: {
      false: { root: { stroke: 'ink.600', opacity: '[0.55]' } },
      // 핵심 경로만 액센트. 스트로크는 비텍스트라 accent.500(스펙 §3).
      true: { root: { stroke: 'accent.500' } },
    },
    flow: {
      sync: {},
      async: { line: { strokeDasharray: '[3 3]' } },
    },
  },
  defaultVariants: { emphasis: false, flow: 'sync' },
});

/** 값 목록은 recipe의 variant 키에서 파생된다 — 따로 관리하지 않는다. */
export type DiagramFlow = RecipeVariant<typeof edge>['flow'];

interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DiagramEdgeProps extends Segment {
  /** 실선 = 동기 호출, 점선 = 비동기/데이터 흐름(핸드오프 §4). */
  flow?: DiagramFlow;
  /** 핵심 경로 강조 — 액센트로 칠하고 흐린 처리를 걷는다. */
  emphasis?: boolean;
  arrow?: boolean;
}

export function DiagramEdge({
  x1,
  y1,
  x2,
  y2,
  flow = 'sync',
  emphasis = false,
  arrow = true,
}: DiagramEdgeProps) {
  const classes = edge({ flow, emphasis });

  return (
    <g
      data-flow={flow}
      data-emphasis={emphasis ? 'true' : 'false'}
      className={classes.root}
    >
      {/* 점선은 선(line 슬롯)에만 건다 — 화살촉까지 끊기면 모양이 뭉개진다.
          sync는 빈 슬롯이라 ''가 나오는데, 그대로 넘기면 class=""가 렌더된다. */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={classes.line || undefined}
      />
      {arrow && <ArrowHead x1={x1} y1={y1} x2={x2} y2={y2} />}
    </g>
  );
}

/**
 * 화살촉을 `<marker>` 대신 선 끝에 직접 그린다.
 *
 * 레퍼런스는 `stroke="context-stroke"` 마커를 쓰는데 이 값은 브라우저 지원이 갈린다.
 * 색깔별 마커를 두 개 두는 방법도 있지만, 마커는 `url(#id)` 로 **문서 전역 id**를
 * 참조해서 한 페이지에 다이어그램이 여러 개 뜨면 id가 중복된다(서버 컴포넌트라
 * `useId()` 로 고유화할 수도 없다). 좌표 계산은 선 하나짜리 삼각함수면 끝나므로,
 * id도 마커도 없이 회전시킨 path로 그린다 — 색은 부모 `<g>`의 stroke를 상속한다.
 */
function ArrowHead({ x1, y1, x2, y2 }: Segment) {
  const degrees = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

  return (
    <path
      d="M -4 -2.6 L 0 0 L -4 2.6"
      transform={`translate(${x2} ${y2}) rotate(${degrees})`}
    />
  );
}

// ── 라벨 ────────────────────────────────────────────────────────────────────

const labelSub = css({
  fontSize: 'xs',
  fill: 'ink.600',
  stroke: '[none]',
});

interface DiagramLabelProps {
  x: number;
  y: number;
  children: ReactNode;
}

export function DiagramLabel({ x, y, children }: DiagramLabelProps) {
  return (
    <text x={x} y={y} textAnchor="middle" className={labelSub}>
      {children}
    </text>
  );
}
