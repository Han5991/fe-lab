import { isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { css } from '@design-system/ui-lib/css';

import {
  markdownChildren,
  optionalString,
} from '../post/markdown/signatureProps';
import {
  DiagramEdge,
  DiagramFrame,
  DiagramLabel,
  DiagramNode,
} from './primitives';
import { DIAGRAMS, isDiagramName } from './registry';
import {
  layoutDiagram,
  type DiagramDirection,
  type DiagramEdgeSpec,
  type DiagramFlow,
  type DiagramNodeSpec,
  type DiagramShape,
  type DiagramTone,
} from './layout';

/**
 * `<diagram>` / `<diagram-node>` / `<diagram-edge>` — 코드 없이 그리는 다이어그램.
 *
 * 다이어그램을 붙일 때마다 좌표를 손으로 박은 컴포넌트를 새로 만들면, 글 하나에
 * 그림 하나씩 파일이 늘고 저자는 SVG 좌표계를 알아야 한다. 흔한 모양(좌→우 체인,
 * 팬아웃)은 노드 이름만 나열하면 나와야 한다.
 *
 * ```html
 * <diagram label="배포 파이프라인" caption="↻ 실패 시 자동 롤백">
 *   <diagram-node id="push" title="git push" desc="main 병합"></diagram-node>
 *   <diagram-node id="ecs" title="ECS 배포" desc="blue/green 전환" tone="accent"></diagram-node>
 *   <diagram-edge from="push" to="ecs" emphasis="true"></diagram-edge>
 * </diagram>
 * ```
 *
 * 자동 레이아웃으로 안 되는 그림(분기·회귀·중첩)은 손으로 그린 컴포넌트를
 * `registry.ts` 에 등록하고 `<diagram name="deploy-pipeline">` 으로 부른다.
 *
 * 본문은 MDX가 아니라 react-markdown + rehype-raw라 **모든 속성이 문자열**이고,
 * 태그 사이 개행이 공백 텍스트 노드와 `<p>` 래퍼를 만든다. 파싱은 전부
 * `signatureProps` 헬퍼에 맡겨 `<callout>` / `<timeline>` 과 같은 규칙을 쓴다.
 */

// ── 선언 태그 ───────────────────────────────────────────────────────────────

export interface DiagramNodeTagProps {
  /** `<diagram-edge from/to>` 가 참조한다. 생략하면 순번으로 자동 부여. */
  id?: string;
  title?: string | undefined;
  /** 핸드오프 §4: 5단어 이내. */
  desc?: string | undefined;
  /** `gray`(구조) | `accent`(핵심 경로). 그 외 값은 gray로 떨어진다. */
  tone?: string | undefined;
  /** `box`(rx 8) | `pill`(rx height/2). */
  shape?: string;
  children?: ReactNode;
}

/**
 * 노드 선언. 자기 자신은 아무것도 그리지 않는다 — 좌표는 형제 노드를 전부 알아야
 * 정해지므로 부모 `<diagram>` 이 모아서 계산한다. 단독으로 쓰이면 조용히 사라진다.
 */
export function DiagramNodeTag(_props: DiagramNodeTagProps): null {
  return null;
}

export interface DiagramEdgeTagProps {
  from?: string;
  to?: string;
  /** `sync`(실선) | `async`(점선). 핸드오프 §4. */
  flow?: string;
  /** 핵심 경로 강조. raw HTML이라 `"true"` 문자열과 빈 속성 모두 받는다. */
  emphasis?: string | boolean;
  arrow?: string | boolean;
  children?: ReactNode;
}

/** 엣지 선언. `DiagramNodeTag` 와 같은 이유로 렌더는 부모가 한다. */
export function DiagramEdgeTag(_props: DiagramEdgeTagProps): null {
  return null;
}

// ── 컨테이너 ────────────────────────────────────────────────────────────────

export interface DiagramProps {
  /** `role="img"` 의 aria-label. 없으면 장식으로 보고 접근성 트리에서 감춘다. */
  label?: string | undefined;
  /** 다이어그램 아래 중앙 주석(레퍼런스의 "↻ 실패 시 자동 롤백"). */
  caption?: string;
  /** `row`(좌→우 체인, 기본) | `fan`(첫 노드에서 팬아웃). */
  direction?: string;
  /** `registry.ts` 에 등록된 이름. 있으면 children 대신 그 컴포넌트를 그린다. */
  name?: string;
  children?: ReactNode;
}

// 마크다운 블록 리듬은 callout/timeline과 맞춘다.
const block = css({ my: '6' });

const missing = css({
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

export function Diagram({
  label,
  caption,
  direction,
  name,
  children,
}: DiagramProps) {
  if (name !== undefined) {
    return <NamedDiagram name={name} label={label} />;
  }

  const { nodes, edges } = collectSpecs(children);
  // 노드가 없으면 빈 프레임만 남아 본문에 여백이 생긴다. 아무것도 안 그린다.
  //
  // 다만 조용히 사라지면 저자가 원인을 못 찾는다. 가장 흔한 원인이
  // self-closing 태그다 — `<diagram-node />`로 쓰면 HTML 파서가 void 요소로
  // 보지 않아 뒤따르는 형제가 전부 그 안에 중첩되고, 최상위 노드가 0개가 된다.
  if (nodes.length === 0) {
    if (process.env.NODE_ENV === 'development' && children) {
      console.warn(
        '[diagram] <diagram-node>를 찾지 못해 아무것도 그리지 않았습니다. ' +
          'self-closing 태그(`<diagram-node />`)를 쓰면 다음 형제가 안으로 ' +
          '중첩되어 무시됩니다 — 닫는 태그를 쓰세요.',
      );
    }
    return null;
  }

  const layout = layoutDiagram(nodes, edges, {
    direction: toDirection(direction),
    hasCaption: Boolean(caption),
  });

  return (
    <div className={block}>
      {/* 자동 레이아웃은 viewBox 폭이 노드 텍스트에 따라 달라진다. 고유 크기를 넘겨
          칼럼을 채우는 대신 실제 크기로 그린다 — 그래야 글자가 항상 12px이다. */}
      <DiagramFrame
        viewBox={layout.viewBox}
        width={layout.width}
        height={layout.height}
        label={label}
      >
        {/* 엣지를 먼저 깔아야 노드 사각형이 선 끝을 덮는다. */}
        {layout.edges.map(edge => (
          <DiagramEdge
            key={edge.key}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            flow={edge.flow}
            emphasis={edge.emphasis}
            arrow={edge.arrow}
          />
        ))}
        {layout.nodes.map(node => (
          <DiagramNode
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={node.rx}
            tone={node.tone}
            title={node.title}
            subtitle={node.desc}
          />
        ))}
        {caption && layout.caption && (
          <DiagramLabel x={layout.caption.x} y={layout.caption.y}>
            {caption}
          </DiagramLabel>
        )}
      </DiagramFrame>
    </div>
  );
}

/**
 * 등록되지 않은 이름은 **글을 죽이지 않는다**. 프로덕션에서는 조용히 비우고,
 * 개발 중에만 눈에 띄는 블록으로 알린다 — 오타를 배포 전에 잡는 건
 * `lint:posts`(`unknown-hero-diagram`)의 몫이고, 여기는 마지막 안전망이다.
 */
function NamedDiagram({
  name,
  label,
}: {
  name: string;
  label?: string | undefined;
}) {
  // `getDiagram(name)`이 아니라 맵을 직접 인덱싱한다 — react-hooks/static-components는
  // "함수 호출로 얻은 컴포넌트"를 렌더 중 생성으로 보고 막는다(PostHero와 같은 이유).
  const Registered = isDiagramName(name) ? DIAGRAMS[name] : undefined;

  if (Registered) {
    return (
      <div className={block}>
        <Registered label={label} />
      </div>
    );
  }

  // 개발 환경에서만 경고 박스를 보인다. 형제 분기들과 `HiddenPostBadge`가 모두
  // "development일 때만"이라는 허용목록을 쓰는데 여기만 "production이 아니면"
  // 이었다 — NODE_ENV가 test 같은 제3의 값일 때 이 분기만 디버그 UI를 흘렸다.
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div role="status" className={missing}>
      등록되지 않은 다이어그램: {name}
    </div>
  );
}

// ── 파싱 ────────────────────────────────────────────────────────────────────

function collectSpecs(children: ReactNode): {
  nodes: DiagramNodeSpec[];
  edges: DiagramEdgeSpec[];
} {
  const nodes: DiagramNodeSpec[] = [];
  const edges: DiagramEdgeSpec[] = [];
  const usedIds = new Set<string>();

  for (const child of markdownChildren(children)) {
    if (isTag(child, DiagramNodeTag)) {
      const { id, title, desc, tone, shape } = child.props;
      nodes.push({
        // id는 edge 참조용이라 문서상 필수지만, 빠졌다고 노드를 버리면 그림이
        // 통째로 어긋난다. 순번으로 채워 두고 자동 연결에 태운다.
        id: uniqueId(optionalString(id) ?? `node-${nodes.length}`, usedIds),
        title: optionalString(title),
        desc: optionalString(desc),
        tone: toTone(tone),
        shape: toShape(shape),
      });
      continue;
    }

    if (isTag(child, DiagramEdgeTag)) {
      const { from, to, flow, emphasis, arrow } = child.props;
      const fromId = optionalString(from);
      const toId = optionalString(to);
      // 한쪽 끝이 없는 엣지는 좌표를 만들 수 없다. 여기서 버리면 layout의
      // "해석 불가 엣지" 경고에도 안 잡히므로(배열에 들어가지도 않는다) 같은
      // 조용한 무시가 다른 경로로 남는다 — 여기서 따로 알린다.
      if (!fromId || !toId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(
            `[diagram] <diagram-edge>의 from/to가 비어 무시했습니다: ` +
              `from=${fromId ?? '(없음)'}, to=${toId ?? '(없음)'}`,
          );
        }
        continue;
      }

      edges.push({
        from: fromId,
        to: toId,
        flow: toFlow(flow),
        emphasis: toFlag(emphasis, false),
        arrow: toFlag(arrow, true),
      });
    }
  }

  return { nodes, edges };
}

/**
 * 노드 id를 다이어그램 안에서 유일하게 만든다.
 *
 * 노드를 복사해 붙이고 id 고치는 걸 잊는 건 가장 흔한 실수다. 그대로 두면 React가
 * 같은 key를 두 번 만나 콘솔 에러를 내고(렌더 결과도 보장되지 않는다), 엣지가
 * 가리키는 노드도 "나중에 선언된 쪽"으로 슬며시 바뀐다. **먼저 선언한 노드가 이름을
 * 지키고** 뒤엣것이 접미사를 받게 해서, 엣지가 글에 쓰인 순서대로 해석되게 한다.
 */
function uniqueId(candidate: string, used: Set<string>): string {
  let id = candidate;
  for (let suffix = 2; used.has(id); suffix += 1) id = `${candidate}-${suffix}`;
  used.add(id);
  return id;
}

function isTag<P>(
  node: ReactNode,
  component: (props: P) => null,
): node is ReactElement<P> {
  return isValidElement(node) && node.type === component;
}

function toTone(value: unknown): DiagramTone {
  // `teal`은 포인트색이 액센트이던 시절의 이름이다. 이미 발행된 글의 마크다운에
  // 남아 있어 계속 받아준다 — 새 글은 `accent`를 쓰고, 문서에도 그쪽만 적는다.
  return value === 'accent' || value === 'teal' ? 'accent' : 'gray';
}

function toShape(value: unknown): DiagramShape {
  return value === 'pill' ? 'pill' : 'box';
}

function toFlow(value: unknown): DiagramFlow {
  return value === 'async' ? 'async' : 'sync';
}

function toDirection(value: unknown): DiagramDirection {
  return value === 'fan' ? 'fan' : 'row';
}

const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const FALSY = new Set(['false', '0', 'no', 'off']);

/**
 * 불리언 prop을 문자열/빈속성/실제 불리언 세 경로에서 받아낸다.
 *
 * raw HTML에서는 `emphasis="true"`, JSX에서는 `emphasis`, hast가 값 없는 속성을
 * 살려 보내면 `emphasis=""` 로 온다. 뜻을 알 수 없는 값은 기본값으로 되돌린다 —
 * 오타를 강조로 오해해 엉뚱한 선이 액센트로 칠해지는 게 더 나쁘다.
 */
function toFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (TRUTHY.has(normalized)) return true;
  if (FALSY.has(normalized)) return false;
  return fallback;
}
