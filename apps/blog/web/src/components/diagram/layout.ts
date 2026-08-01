/**
 * 선언형 다이어그램의 자동 레이아웃 — 좌표 계산만 하는 순수 모듈.
 *
 * `<diagram>` 은 마크다운에서 노드 이름만 나열하면 그림이 나와야 한다. 그런데
 * SVG는 좌표를 요구하고, 서버 렌더라 `getComputedTextLength()` 같은 실측 수단이
 * 없다. 그래서 **글자 종류별 평균 자폭**으로 텍스트 폭을 근사해 노드 크기를 잡는다.
 * 근사가 몇 px 어긋나도 노드 안쪽 여백(24px×2)이 흡수한다.
 *
 * React와 분리해 둔 이유는 좌표가 이 다이어그램 시스템에서 가장 틀리기 쉬운
 * 부분이라서다 — 렌더 없이 숫자만 테스트할 수 있어야 한다.
 */

export type DiagramTone = 'gray' | 'teal';
export type DiagramShape = 'box' | 'pill';
export type DiagramFlow = 'sync' | 'async';
export type DiagramDirection = 'row' | 'fan';

export interface DiagramNodeSpec {
  /** `<diagram-edge from/to>` 가 참조하는 키. */
  id: string;
  title?: string;
  /** 핸드오프 §4: 5단어 이내. */
  desc?: string;
  tone: DiagramTone;
  shape: DiagramShape;
}

export interface DiagramEdgeSpec {
  from: string;
  to: string;
  flow: DiagramFlow;
  emphasis: boolean;
  arrow: boolean;
}

export interface PlacedNode extends DiagramNodeSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export interface PlacedEdge {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  flow: DiagramFlow;
  emphasis: boolean;
  arrow: boolean;
}

export interface DiagramLayout {
  viewBox: string;
  width: number;
  height: number;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  /** caption을 요청했을 때만 채워진다. `<text>` 의 baseline 좌표다. */
  caption?: { x: number; y: number };
}

// ── 상수 ────────────────────────────────────────────────────────────────────
//
// 전부 SVG user unit = px. 값은 `design/design-reference.html` 의 배포 파이프라인
// SVG(`0 0 640 122`)에서 역산했다.

/** primitives.tsx 의 `nodeTitle` — 12px/600. */
const TITLE_FONT_SIZE = 12;
/** primitives.tsx 의 `nodeSubtitle` — fontSize 토큰 `xs` = 11px. */
const DESC_FONT_SIZE = 11;

/** 한글·CJK는 정사각에 가깝고, 라틴/숫자는 그 절반쯤이다. */
const WIDE_CHAR_RATIO = 1;
const NARROW_CHAR_RATIO = 0.58;

const NODE_PADDING_X = 24;
const NODE_MIN_WIDTH = 88;
const NODE_MAX_WIDTH = 200;
const NODE_HEIGHT = 50;
/** 핸드오프 §4 기본 라운드. `shape="pill"` 이면 height/2 로 덮어쓴다. */
const NODE_RADIUS = 8;

/** 레퍼런스의 노드 간격(132 → 160). 엣지 하나가 들어갈 만큼만 띄운다. */
const GAP_X = 28;
/** fan의 세로 간격 — ParallelThumb(29 → 36)과 같은 값. */
const GAP_Y = 7;

const MARGIN_X = 24;
const MARGIN_Y = 27;

/** 콘텐츠 바닥 → caption baseline. 레퍼런스 77 → 104. */
const CAPTION_OFFSET = 27;
/** caption baseline 아래로 남기는 여백. 레퍼런스 104 → 122. */
const CAPTION_BOTTOM = 18;

/**
 * "한 칸을 통째로 차지하는" 글자 범위.
 * 한글 자모·완성형, CJK 통합한자, 가나, 전각 기호까지 묶는다
 * (U+1100–11FF, U+2E80–9FFF, U+A960–A97F, U+AC00–D7FF, U+F900–FAFF,
 * U+FE30–FE4F, U+FF00–FF60, U+FFE0–FFE6).
 */
const WIDE_CHAR = /[ᄀ-ᇿ⺀-鿿ꥠ-꥿가-퟿豈-﫿︰-﹏＀-｠￠-￦]/;

// ── 텍스트 폭 추정 ──────────────────────────────────────────────────────────

/**
 * 폰트 메트릭 없이 텍스트 폭을 근사한다.
 *
 * 정확할 필요는 없다. 이 값은 "노드가 글자를 잘라먹지 않을 만큼 넓은가"를
 * 정하는 데만 쓰이고, 오차는 좌우 패딩이 삼킨다. 코드 포인트 단위로 세서
 * 서로게이트 페어(이모지 등)를 두 글자로 세지 않는다.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of Array.from(text)) {
    units += WIDE_CHAR.test(char) ? WIDE_CHAR_RATIO : NARROW_CHAR_RATIO;
  }
  return units * fontSize;
}

/**
 * 노드 폭 = max(제목 폭, 부제 폭) + 좌우 패딩, 88~200으로 클램프.
 *
 * 최소값은 짧은 노드("ECR")도 파이프라인에서 초라해 보이지 않을 폭이고,
 * 최대값은 640px 폭 안에 노드 서넛이 들어가도록 막아 두는 상한이다.
 * 상한에 걸린 긴 텍스트는 잘리는 대신 삐져나온다 — 그건 글쓴이가 줄일 신호다.
 */
export function estimateNodeWidth(node: {
  title?: string;
  desc?: string;
}): number {
  const titleWidth = node.title
    ? estimateTextWidth(node.title, TITLE_FONT_SIZE)
    : 0;
  const descWidth = node.desc
    ? estimateTextWidth(node.desc, DESC_FONT_SIZE)
    : 0;
  const inner = Math.max(titleWidth, descWidth);

  return clamp(
    Math.round(inner + NODE_PADDING_X * 2),
    NODE_MIN_WIDTH,
    NODE_MAX_WIDTH,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ── 레이아웃 ────────────────────────────────────────────────────────────────

export interface LayoutOptions {
  direction?: DiagramDirection;
  /** caption 자리를 아래에 확보할지. 텍스트 자체는 렌더 쪽이 그린다. */
  hasCaption?: boolean;
}

export function layoutDiagram(
  nodes: DiagramNodeSpec[],
  edges: DiagramEdgeSpec[],
  { direction = 'row', hasCaption = false }: LayoutOptions = {},
): DiagramLayout {
  // fan은 "첫 노드 → 나머지"라 최소 두 개가 필요하다. 하나뿐이면 row와 같다.
  const placed =
    direction === 'fan' && nodes.length > 1 ? placeFan(nodes) : placeRow(nodes);

  const contentRight = placed.reduce(
    (right, node) => Math.max(right, node.x + node.width),
    MARGIN_X,
  );
  const contentBottom = placed.reduce(
    (bottom, node) => Math.max(bottom, node.y + node.height),
    MARGIN_Y,
  );

  const width = contentRight + MARGIN_X;
  const height = hasCaption
    ? contentBottom + CAPTION_OFFSET + CAPTION_BOTTOM
    : contentBottom + MARGIN_Y;

  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    nodes: placed,
    edges: routeEdges(placed, edges, direction),
    caption: hasCaption
      ? { x: Math.round(width / 2), y: contentBottom + CAPTION_OFFSET }
      : undefined,
  };
}

/** 좌 → 우 체인. 모든 노드가 같은 baseline(y=27)에 선다. */
function placeRow(nodes: DiagramNodeSpec[]): PlacedNode[] {
  let cursor = MARGIN_X;

  return nodes.map(node => {
    const width = estimateNodeWidth(node);
    const placed = toPlaced(node, cursor, MARGIN_Y, width);
    cursor += width + GAP_X;
    return placed;
  });
}

/**
 * 첫 노드에서 나머지로 갈라지는 팬아웃(레퍼런스 홈의 ParallelThumb 모양).
 *
 * 오른쪽 열은 폭을 최대값으로 통일한다 — 갈래마다 폭이 들쭉날쭉하면 "같은 층위의
 * 병렬 갈래"라는 뜻이 흐려진다.
 */
function placeFan(nodes: DiagramNodeSpec[]): PlacedNode[] {
  const [source, ...targets] = nodes;

  const sourceWidth = estimateNodeWidth(source);
  const targetWidth = targets.reduce(
    (max, node) => Math.max(max, estimateNodeWidth(node)),
    NODE_MIN_WIDTH,
  );

  const columnHeight =
    targets.length * NODE_HEIGHT + (targets.length - 1) * GAP_Y;
  const targetX = MARGIN_X + sourceWidth + GAP_X;

  return [
    toPlaced(
      source,
      MARGIN_X,
      MARGIN_Y + Math.round((columnHeight - NODE_HEIGHT) / 2),
      sourceWidth,
    ),
    ...targets.map((node, index) =>
      toPlaced(
        node,
        targetX,
        MARGIN_Y + index * (NODE_HEIGHT + GAP_Y),
        targetWidth,
      ),
    ),
  ];
}

function toPlaced(
  node: DiagramNodeSpec,
  x: number,
  y: number,
  width: number,
): PlacedNode {
  return {
    ...node,
    x,
    y,
    width,
    height: NODE_HEIGHT,
    rx: node.shape === 'pill' ? NODE_HEIGHT / 2 : NODE_RADIUS,
  };
}

// ── 엣지 ────────────────────────────────────────────────────────────────────

/**
 * 명시된 엣지가 하나라도 있으면 그것만 그린다.
 *
 * "자동 연결 + 명시 엣지"를 합치면 같은 구간에 선이 두 번 겹치고, 저자가
 * 특정 구간만 점선으로 바꾸려는 순간 실선이 그대로 남는다. 하나라도 적었다는
 * 건 연결 관계를 직접 통제하겠다는 뜻으로 본다.
 */
function routeEdges(
  nodes: PlacedNode[],
  edges: DiagramEdgeSpec[],
  direction: DiagramDirection,
): PlacedEdge[] {
  const specs = edges.length > 0 ? edges : autoEdges(nodes, direction);
  const byId = new Map(nodes.map(node => [node.id, node]));

  return specs.flatMap((spec, index) => {
    const from = byId.get(spec.from);
    const to = byId.get(spec.to);
    // 없는 id를 가리키는 엣지는 조용히 버린다 — 오타 하나로 글이 죽지 않게.
    if (!from || !to || from === to) return [];

    return [
      {
        key: `${spec.from}-${spec.to}-${index}`,
        ...connect(from, to),
        flow: spec.flow,
        emphasis: spec.emphasis,
        arrow: spec.arrow,
      },
    ];
  });
}

function autoEdges(
  nodes: PlacedNode[],
  direction: DiagramDirection,
): DiagramEdgeSpec[] {
  const defaults = { flow: 'sync', emphasis: false, arrow: true } as const;

  if (direction === 'fan' && nodes.length > 1) {
    return nodes
      .slice(1)
      .map(node => ({ from: nodes[0].id, to: node.id, ...defaults }));
  }

  return nodes.slice(0, -1).map((node, index) => ({
    from: node.id,
    to: nodes[index + 1].id,
    ...defaults,
  }));
}

/**
 * 두 노드의 상대 위치를 보고 마주 보는 변끼리 잇는다.
 *
 * row·fan 어느 쪽이든 "오른쪽에 있으면 오른변 → 왼변"이라는 한 규칙으로 풀린다.
 * 좌우로 겹칠 때만 위아래 변으로 떨어뜨린다. 선은 항상 직선이라, 떨어진 노드를
 * 명시적으로 이으면 중간 노드를 가로지른다 — 그런 그림이 필요하면 자동 레이아웃이
 * 아니라 손으로 그린 컴포넌트를 레지스트리에 등록할 때다.
 */
function connect(
  from: PlacedNode,
  to: PlacedNode,
): { x1: number; y1: number; x2: number; y2: number } {
  const fromMidX = from.x + from.width / 2;
  const fromMidY = from.y + from.height / 2;
  const toMidX = to.x + to.width / 2;
  const toMidY = to.y + to.height / 2;

  if (to.x >= from.x + from.width) {
    return { x1: from.x + from.width, y1: fromMidY, x2: to.x, y2: toMidY };
  }
  if (from.x >= to.x + to.width) {
    return { x1: from.x, y1: fromMidY, x2: to.x + to.width, y2: toMidY };
  }
  if (to.y >= from.y) {
    return { x1: fromMidX, y1: from.y + from.height, x2: toMidX, y2: to.y };
  }
  return { x1: fromMidX, y1: from.y, x2: toMidX, y2: to.y + to.height };
}
