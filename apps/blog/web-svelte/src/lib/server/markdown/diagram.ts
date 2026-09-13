import { h } from 'hastscript';
import {
  ARROW_HEAD_PATH,
  arrowHeadTransform,
  captionText,
  diagramBlock as block,
  diagramFrame as frame,
  edgeDashed,
  edgeRoot,
  nodeShape,
  nodeSubtitle,
  nodeTitle,
} from '../../shared/diagramStyles';
import type { Element, ElementContent } from 'hast';
import {
  layoutDiagram,
  type DiagramDirection,
  type DiagramEdgeSpec,
  type DiagramFlow,
  type DiagramNodeSpec,
  type DiagramTone,
} from '@blog/diagram';
import { css } from '../../../../styled-system/css';

/**
 * `<diagram>` / `<diagram-node>` / `<diagram-edge>` → SVG.
 *
 * **좌표는 한 줄도 여기서 계산하지 않는다.** `@blog/diagram`이 두 앱이 공유하는
 * 레이아웃 엔진이고, 이 파일은 그 결과를 SVG 요소와 토큰 클래스에 잇는 일만
 * 한다. 원래 그 엔진은 `apps/blog/web` 안에 있었는데 의존이 타입 하나뿐이라
 * 패키지로 나올 수 있었다 — 같은 원고가 두 사이트에서 **픽셀 단위로 같은
 * 그림**이 되는 이유다. 여기서 좌표를 다시 짰다면 그 보장이 없다.
 *
 * 원고에서 가장 많이 쓰이는 태그다(70편에서 `diagram-node` 11 · `diagram-edge`
 * 5 · `diagram` 3회). 나머지 커스텀 태그와 달리 **실제 글로 동등성을 확인할 수
 * 있다.**
 *
 * `name="…"` 레지스트리 다이어그램은 아직 없다 — 등록된 그림이 하나뿐이고
 * (`deploy-pipeline`) 그건 손으로 그린 React 컴포넌트다. 이름을 주면 자리표시자
 * 대신 **children 렌더로 떨어진다**(이름만 주고 children이 없으면 아무것도
 * 그리지 않는다). 조용히 사라지는 것이 아니라 `lint:posts`가 이미 미등록
 * 이름을 막고 있다.
 */

// ── 스타일 ───────────────────────────────────────────────────────────────────
//
// 생김새는 `lib/shared/diagramStyles.ts`가 단일 출처다 — frontmatter `hero:`
// 슬롯의 Svelte 컴포넌트가 같은 값을 쓴다. 이 모듈은 `lib/server/` 아래라
// 화면에서 import할 수 없어서 스타일만 밖으로 뺐다.

// ── 속성 읽기 ────────────────────────────────────────────────────────────────

function attr(node: Element, name: string): string | undefined {
  const value = node.properties[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * raw HTML의 불리언 속성 — `emphasis="true"`도 `emphasis`(값 없음)도 참이다.
 * `rehype-raw`는 값 없는 속성을 `true`로 넘긴다.
 */
function flag(node: Element, name: string, fallback: boolean): boolean {
  const value = node.properties[name];
  if (value === true) return true;
  if (typeof value !== 'string') return fallback;
  if (value === '' || value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** 자식 요소 중 특정 태그만. 태그 사이 개행이 만드는 텍스트 노드를 건너뛴다. */
function childElements(node: Element, tagName: string): Element[] {
  const out: Element[] = [];
  const walk = (children: ElementContent[]) => {
    for (const child of children) {
      if (child.type !== 'element') continue;
      // 마크다운이 커스텀 태그를 <p>로 감싸는 일이 있다 — 한 겹 벗기고 본다.
      if (child.tagName === 'p') walk(child.children);
      else if (child.tagName === tagName) out.push(child);
    }
  };
  walk(node.children);
  return out;
}

// ── 선언 읽기 ────────────────────────────────────────────────────────────────

function readNodes(diagram: Element): DiagramNodeSpec[] {
  const seen = new Set<string>();
  const specs: DiagramNodeSpec[] = [];

  for (const [index, el] of childElements(diagram, 'diagram-node').entries()) {
    // id를 안 주면 순번이 키가 된다. 겹치면 **먼저 선언한 노드가 이긴다** —
    // 레이아웃 엔진도 같은 규칙이라 여기서 미리 걸러도 결과가 같다.
    const raw = attr(el, 'id') ?? `n${index}`;
    if (seen.has(raw)) continue;
    seen.add(raw);

    specs.push({
      id: raw,
      title: attr(el, 'title'),
      desc: attr(el, 'desc'),
      // 옛 `tone="teal"`은 포인트색을 바꾸기 전 이름이다 — 별칭으로 받아준다.
      tone:
        attr(el, 'tone') === 'teal'
          ? 'accent'
          : oneOf(attr(el, 'tone'), ['gray', 'accent'] as const, 'gray'),
      shape: oneOf(attr(el, 'shape'), ['box', 'pill'] as const, 'box'),
    });
  }
  return specs;
}

function readEdges(diagram: Element): DiagramEdgeSpec[] {
  const specs: DiagramEdgeSpec[] = [];
  for (const el of childElements(diagram, 'diagram-edge')) {
    const from = attr(el, 'from');
    const to = attr(el, 'to');
    // from/to가 둘 다 있어야 그려진다. 하나만 있으면 선언이 미완성이다.
    if (from === undefined || to === undefined) continue;
    specs.push({
      from,
      to,
      flow: oneOf(attr(el, 'flow'), ['sync', 'async'] as const, 'sync'),
      emphasis: flag(el, 'emphasis', false),
      arrow: flag(el, 'arrow', true),
    });
  }
  return specs;
}

// ── SVG ──────────────────────────────────────────────────────────────────────

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * 화살촉을 `<marker>` 대신 선 끝에 직접 그린다.
 *
 * 마커는 `url(#id)`로 **문서 전역 id**를 참조해서 한 페이지에 다이어그램이
 * 여러 개 뜨면 id가 중복된다. 정적 export라 렌더 시점에 고유 id를 만들 수단도
 * 마땅치 않다.
 *
 * **모양과 회전 방식까지 React 판(`primitives.tsx`)과 같다.** 처음에는 좌표를
 * 삼각함수로 직접 풀어 `<polyline>`을 그렸는데, 결과는 그럴듯해 보여도 두
 * 산출물이 픽셀 단위로 어긋났다 — 같은 그림이라는 주장이 화살촉에서 깨진다.
 * 고정 path를 끝점으로 옮겨 돌리는 쪽이 짧기도 하다.
 */
function arrowHead(x1: number, y1: number, x2: number, y2: number): Element {
  return h('path', {
    d: ARROW_HEAD_PATH,
    transform: arrowHeadTransform(x1, y1, x2, y2),
  });
}

function nodeGroup(node: {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  tone: DiagramTone;
  title?: string | undefined;
  desc?: string | undefined;
}): Element {
  const centerX = round(node.x + node.width / 2);
  const centerY = round(node.y + node.height / 2);
  const texts: Element[] = [];

  if (node.title) {
    texts.push(
      h(
        'text',
        {
          x: centerX,
          // 부제가 있으면 두 줄이 노드 중앙을 사이에 두고 갈라선다.
          y: node.desc ? centerY - 3 : centerY + 4,
          'text-anchor': 'middle',
          class: nodeTitle,
        },
        [node.title],
      ),
    );
  }
  if (node.desc) {
    texts.push(
      h(
        'text',
        {
          x: centerX,
          y: centerY + 14,
          'text-anchor': 'middle',
          class: nodeSubtitle,
        },
        [node.desc],
      ),
    );
  }

  return h('g', {}, [
    h('rect', {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      rx: node.rx,
      'data-tone': node.tone,
      class: nodeShape[node.tone],
    }),
    ...texts,
  ]);
}

function edgeGroup(edge: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  flow: DiagramFlow;
  emphasis: boolean;
  arrow: boolean;
}): Element {
  return h(
    'g',
    {
      'data-flow': edge.flow,
      'data-emphasis': String(edge.emphasis),
      class: edge.emphasis ? edgeRoot.emphasis : edgeRoot.plain,
    },
    [
      h('line', {
        x1: edge.x1,
        y1: edge.y1,
        x2: edge.x2,
        y2: edge.y2,
        // 점선은 **선에만** 건다 — 화살촉까지 끊기면 모양이 뭉개진다.
        ...(edge.flow === 'async' ? { class: edgeDashed } : {}),
      }),
      ...(edge.arrow ? [arrowHead(edge.x1, edge.y1, edge.x2, edge.y2)] : []),
    ],
  );
}

/** 그림이 될 수 없는 선언 — 자리를 비우지 않고 왜 안 나왔는지 남긴다. */
const missingBox = css({
  my: '6',
  px: '4',
  py: '3',
  rounded: 'control',
  borderWidth: 'hairline',
  borderColor: 'danger.border',
  color: 'danger.text',
  fontFamily: 'mono',
  fontSize: '[12px]',
});

export function transformDiagram(diagram: Element): Element {
  const nodes = readNodes(diagram);
  if (nodes.length === 0) {
    return h('div', { class: missingBox }, [
      '다이어그램에 <diagram-node>가 없습니다.',
    ]);
  }

  const label = attr(diagram, 'label');
  const caption = attr(diagram, 'caption');
  const direction = oneOf(
    attr(diagram, 'direction'),
    ['row', 'fan'] as const satisfies readonly DiagramDirection[],
    'row',
  );

  const layout = layoutDiagram(nodes, readEdges(diagram), {
    direction,
    hasCaption: caption !== undefined,
  });

  const children: Element[] = [
    ...layout.edges.map(edgeGroup),
    ...layout.nodes.map(nodeGroup),
  ];
  if (caption !== undefined && layout.caption) {
    children.push(
      h(
        'text',
        {
          x: layout.caption.x,
          y: layout.caption.y,
          'text-anchor': 'middle',
          class: captionText,
        },
        [caption],
      ),
    );
  }

  return h('div', { class: block }, [
    h(
      'svg',
      {
        viewBox: layout.viewBox,
        width: layout.width,
        height: layout.height,
        // label이 없으면 장식으로 보고 접근성 트리에서 감춘다 —
        // `blog-components` 스킬이 규정한 계약이다.
        ...(label === undefined
          ? { 'aria-hidden': 'true' }
          : { role: 'img', 'aria-label': label }),
        focusable: 'false',
        class: frame,
      },
      children,
    ),
  ]);
}
