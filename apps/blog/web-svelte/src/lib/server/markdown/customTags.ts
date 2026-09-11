import { h } from 'hastscript';
import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import { visit } from 'unist-util-visit';
import { css } from '../../../../styled-system/css';
import { renderFileTree } from './fileTree.ts';

/**
 * 본문의 **커스텀 태그를 스타일이 붙은 HAST로 다시 쓴다.**
 *
 * ## 왜 Svelte 컴포넌트로 매핑하지 않는가
 *
 * React 판은 `react-markdown`의 컴포넌트 맵(`callout: Callout`)으로 태그를
 * 컴포넌트에 잇는다. Svelte에서 같은 구조를 만들려면 HAST 트리를 `load` 데이터로
 * 화면에 넘기고 재귀 컴포넌트가 순회해야 하는데, **SvelteKit은 `load` 데이터를
 * 하이드레이션용으로 HTML에 직렬화한다.** 즉 트리를 통째로 문서에 한 번 더
 * 싣게 되고, 지금 재고 있는 바로 그 HTML 크기가 부풀어 오른다.
 *
 * 이 태그 9종은 전부 **프레젠테이션**이다(상태도 이벤트도 없다). 그러면 빌드
 * 타임에 클래스가 붙은 마크업으로 굽는 편이 정직하다 — 클라이언트 JS가 0이고,
 * 문서에는 결과 HTML만 남는다. 상호작용이 필요한 `<code-tabs>`는 이 파일에
 * 없다(다음 단계).
 *
 * Panda의 `css()`는 빌드 타임 정적 추출이라 여기서 부르는 것으로 충분하다 —
 * `panda.config.ts`의 `include`가 `src/**`를 훑는다.
 *
 * ## 값이 틀려도 글은 죽지 않는다
 *
 * 원고의 속성은 전부 문자열이고 오타가 올 수 있다. 알 수 없는 값은 throw가
 * 아니라 **기본값으로 떨어진다**(React 판과 같은 계약 — `blog-components` 스킬의
 * "잘못된 값은 기본값으로 떨어진다"). 글 하나의 오타로 페이지가 죽는 편이
 * 훨씬 나쁘다.
 */

// ── 스타일 ───────────────────────────────────────────────────────────────────
//
// 색·간격은 전부 `blog-preset` 토큰이다. hex를 옮겨 적지 않는다는 금지선은
// 두 사이트에 똑같이 걸린다.

const CALLOUT_TONES = {
  info: {
    bg: 'callout.info.bg',
    border: 'callout.info.border',
    text: 'callout.info.text',
    icon: 'i',
  },
  tip: {
    bg: 'callout.tip.bg',
    border: 'callout.tip.border',
    text: 'callout.tip.text',
    icon: '+',
  },
  warning: {
    bg: 'callout.warn.bg',
    border: 'callout.warn.border',
    text: 'callout.warn.text',
    icon: '!',
  },
  danger: {
    bg: 'danger.bg',
    border: 'danger.border',
    text: 'danger.text',
    icon: '×',
  },
} as const;

type CalloutType = keyof typeof CALLOUT_TONES;

const calloutSurface = {
  info: css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    my: '6',
    px: '4',
    py: '3.5',
    rounded: 'control',
    borderWidth: 'hairline',
    bg: 'callout.info.bg',
    borderColor: 'callout.info.border',
    color: 'callout.info.text',
  }),
  tip: css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    my: '6',
    px: '4',
    py: '3.5',
    rounded: 'control',
    borderWidth: 'hairline',
    bg: 'callout.tip.bg',
    borderColor: 'callout.tip.border',
    color: 'callout.tip.text',
  }),
  warning: css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    my: '6',
    px: '4',
    py: '3.5',
    rounded: 'control',
    borderWidth: 'hairline',
    bg: 'callout.warn.bg',
    borderColor: 'callout.warn.border',
    color: 'callout.warn.text',
  }),
  danger: css({
    display: 'flex',
    gap: '3',
    alignItems: 'flex-start',
    my: '6',
    px: '4',
    py: '3.5',
    rounded: 'control',
    borderWidth: 'hairline',
    bg: 'danger.bg',
    borderColor: 'danger.border',
    color: 'danger.text',
  }),
} as const satisfies Record<CalloutType, string>;

// 배지는 색을 wrapper에서 상속받고 **보더만** 타입별로 덧입힌다(React 판과 같다).
const badgeBase = {
  flexShrink: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSize: '5',
  mt: '[1px]',
  rounded: 'full',
  borderWidth: 'hairline',
  fontFamily: 'mono',
  fontSize: 'xs',
  lineHeight: 'flat',
} as const;

const calloutBadge = {
  info: css({ ...badgeBase, borderColor: 'callout.info.border' }),
  tip: css({ ...badgeBase, borderColor: 'callout.tip.border' }),
  warning: css({ ...badgeBase, borderColor: 'callout.warn.border' }),
  danger: css({ ...badgeBase, borderColor: 'danger.border' }),
} as const satisfies Record<CalloutType, string>;

const calloutBody = css({
  flex: '1',
  minW: '0',
  '& > *:last-child': { mb: '0' },
});
const calloutTitle = css({
  fontWeight: 'semibold',
  fontSize: '[13px]',
  lineHeight: 'snug',
  mb: '1',
});

const fileTreeBox = css({
  bg: 'paper.100',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
  rounded: 'control',
  px: '5',
  py: '4',
  my: '6',
  fontSize: '[13px]',
  lineHeight: 'proseLoose',
  color: 'ink.700',
  overflow: 'auto',
  fontFamily: 'mono',
});

const figureBox = css({
  my: '8',
  textAlign: 'center',
  '& img': {
    mx: 'auto',
    mt: '0',
    mb: '0',
    rounded: 'control',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
  },
  '& figcaption': {
    mt: '3',
    fontFamily: 'mono',
    fontSize: '[12px]',
    lineHeight: 'relaxed',
    color: 'ink.500',
  },
});

const dialogueBox = css({
  borderLeftWidth: '[2px]',
  borderLeftColor: 'ink.border',
  pl: '4',
  py: '1',
  mb: '[22px]',
  fontFamily: 'sans',
});
const msgRow = {
  me: css({
    display: 'flex',
    gap: '2',
    alignItems: 'flex-start',
    my: '3',
    flexDirection: 'row-reverse',
  }),
  other: css({ display: 'flex', gap: '2', alignItems: 'flex-start', my: '3' }),
} as const;
const msgAvatar = css({
  flexShrink: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSize: '6',
  rounded: 'full',
  borderWidth: 'hairline',
  borderColor: 'ink.border',
  fontFamily: 'mono',
  fontSize: '[11px]',
  color: 'ink.600',
});
const msgBubble = {
  me: css({
    px: '3',
    py: '2',
    rounded: 'control',
    bg: 'accent.50',
    color: 'accent.600',
    fontSize: 'sm',
    '& > *:last-child': { mb: '0' },
  }),
  other: css({
    px: '3',
    py: '2',
    rounded: 'control',
    bg: 'paper.100',
    color: 'ink.900',
    fontSize: 'sm',
    '& > *:last-child': { mb: '0' },
  }),
} as const;

const metricsGrid = css({
  display: 'grid',
  gridTemplateColumns: { base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
  gap: '3',
  my: '6',
});
const metricCard = css({
  borderWidth: 'hairline',
  borderColor: 'ink.border',
  rounded: 'card',
  px: '4',
  py: '3',
});
const metricLabel = css({
  fontSize: '[12px]',
  color: 'ink.500',
  fontFamily: 'mono',
});
const metricValue = {
  default: css({
    mt: '1',
    fontFamily: 'mono',
    fontSize: 'lg',
    color: 'ink.950',
  }),
  success: css({
    mt: '1',
    fontFamily: 'mono',
    fontSize: 'lg',
    color: 'moss.700',
  }),
} as const;

const timelineList = css({
  listStyle: 'none',
  my: '6',
  display: 'grid',
  gap: '4',
  pl: '0',
});
const stepRow = css({ display: 'flex', gap: '3', alignItems: 'flex-start' });
const stepMark = {
  fail: css({
    flexShrink: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSize: '5',
    rounded: 'full',
    borderWidth: 'hairline',
    borderColor: 'danger.border',
    color: 'danger.text',
    fontFamily: 'mono',
    fontSize: 'xs',
  }),
  success: css({
    flexShrink: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSize: '5',
    rounded: 'full',
    borderWidth: 'hairline',
    borderColor: 'moss.600',
    color: 'moss.700',
    fontFamily: 'mono',
    fontSize: 'xs',
  }),
} as const;
const stepTitle = css({
  fontWeight: 'semibold',
  fontSize: '[13px]',
  color: 'ink.950',
});
const stepDesc = css({ mt: '1', fontSize: 'sm', color: 'ink.600' });

// ── 속성 읽기 ────────────────────────────────────────────────────────────────

/** raw HTML 속성은 전부 문자열이다 — 아니면 없는 것으로 본다. */
function attr(node: Element, name: string): string | undefined {
  const value = node.properties[name];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** 아는 값이면 그대로, 아니면 기본값. 오타로 글이 죽지 않게 하는 자리다. */
function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/**
 * `items='[…]'` / `steps='[…]'` JSON을 배열로. 실패하면 `null`을 돌려
 * **children 기반 렌더로 폴백**한다 — 글 하나의 JSON 오타로 페이지가 죽는 것이
 * 훨씬 나쁘다(React 판 `parseItemsProp`과 같은 계약).
 */
function parseItems(raw: string | undefined): Record<string, unknown>[] | null {
  if (raw === undefined) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const items = parsed.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  );
  return items.length > 0 ? items : null;
}

/**
 * 커스텀 태그 사이의 **공백 전용 텍스트 노드**를 걷어내고, 마크다운이 씌운
 * `<p>` 한 겹을 벗긴다.
 *
 * `<timeline>`과 `<step>`을 줄바꿈해서 쓰면 그 사이 개행이 텍스트 노드로
 * 들어와, 필터가 없으면 자식 개수 판정이 통째로 어긋난다(React 판
 * `markdownChildren`이 같은 일을 한다).
 */
function meaningfulChildren(node: Element): ElementContent[] {
  const out: ElementContent[] = [];
  for (const child of node.children) {
    if (child.type === 'text') {
      if (child.value.trim().length === 0) continue;
      out.push(child);
      continue;
    }
    if (child.type === 'element' && child.tagName === 'p') {
      out.push(...meaningfulChildren(child));
      continue;
    }
    out.push(child);
  }
  return out;
}

/** 자식의 텍스트만 이어 붙인다 — `<file-tree>`처럼 본문이 곧 데이터인 태그용. */
function textOf(node: Element): string {
  let out = '';
  visit(node, 'text', (text: Text) => {
    out += text.value;
  });
  return out;
}

/** `from="me"`(또는 나·저·i)면 내 말풍선. */
function isSelf(from: string | undefined): boolean {
  const name = from?.trim().toLowerCase() ?? '';
  return name === 'me' || name === 'i' || name === '나' || name === '저';
}

/**
 * 화자 이니셜 — React 판(`Dialogue.tsx`)의 규칙을 **순서까지** 그대로 옮긴다.
 *
 * `isSelf` 판정이 대문자 약어 판정보다 **먼저**다. `from="I"`는 라틴 대문자
 * 한 글자지만 이니셜이 `I`가 아니라 `나`여야 한다 — 처음에 이 분기를 빠뜨려
 * `from="me"`가 `m`으로 나왔다(테스트가 그 케이스를 안 봐서 조용히 지나갔다).
 *
 * 마지막 폴백이 `Array.from`인 이유는 서로게이트 페어(이모지)를 반 토막 내지
 * 않기 위해서다.
 */
export function avatarInitial(from: string | undefined): string {
  const name = from?.trim() ?? '';
  if (name.length === 0) return '?';
  if (isSelf(from)) return '나';
  if (name.length <= 3 && /^[A-Z]+$/.test(name)) return name;
  return Array.from(name)[0] ?? '?';
}

// ── 태그별 변환 ──────────────────────────────────────────────────────────────

function transformCallout(node: Element): Element {
  const type = oneOf(
    attr(node, 'type'),
    Object.keys(CALLOUT_TONES) as CalloutType[],
    'info',
  );
  const title = attr(node, 'title') ?? type;
  return h('aside', { class: calloutSurface[type] }, [
    h('span', { class: calloutBadge[type], 'aria-hidden': 'true' }, [
      CALLOUT_TONES[type].icon,
    ]),
    h('div', { class: calloutBody }, [
      h('div', { class: calloutTitle }, [title]),
      ...node.children,
    ]),
  ]);
}

function transformFileTree(node: Element): Element {
  return h('pre', { class: fileTreeBox }, [renderFileTree(textOf(node))]);
}

function transformFigure(node: Element): Element {
  return h('figure', { class: figureBox }, node.children);
}

function transformMsg(node: Element): Element {
  const from = attr(node, 'from');
  const key = isSelf(from) ? 'me' : 'other';
  const name = from?.trim();
  return h('div', { class: msgRow[key], 'data-speaker': key }, [
    h(
      'span',
      name
        ? { class: msgAvatar, role: 'img', 'aria-label': `${name} 발언` }
        : { class: msgAvatar },
      [avatarInitial(from)],
    ),
    // 레퍼런스는 말풍선이 span이지만 본문에 <p>가 생길 수 있어 div로 둔다
    // (span > p는 무효 중첩이다).
    h('div', { class: msgBubble[key] }, node.children),
  ]);
}

function transformDialogue(node: Element): Element {
  return h('div', { class: dialogueBox }, meaningfulChildren(node));
}

function metricCardNode(
  label: string,
  value: string,
  tone: 'default' | 'success',
): Element {
  return h('div', { class: metricCard }, [
    h('div', { class: metricLabel }, [label]),
    h('div', { class: metricValue[tone] }, [value]),
  ]);
}

function transformMetric(node: Element): Element {
  return metricCardNode(
    attr(node, 'label') ?? '',
    attr(node, 'value') ?? '',
    oneOf(attr(node, 'tone'), ['default', 'success'] as const, 'default'),
  );
}

function transformMetrics(node: Element): Element {
  const items = parseItems(attr(node, 'items'));
  if (items === null) {
    return h('div', { class: metricsGrid }, meaningfulChildren(node));
  }
  return h(
    'div',
    { class: metricsGrid },
    items.map(item =>
      metricCardNode(
        typeof item['label'] === 'string' ? item['label'] : '',
        typeof item['value'] === 'string' ? item['value'] : '',
        item['tone'] === 'success' ? 'success' : 'default',
      ),
    ),
  );
}

function stepNode(
  title: string,
  desc: string,
  result: 'fail' | 'success',
): Element {
  return h('li', { class: stepRow }, [
    h('span', { class: stepMark[result], 'aria-hidden': 'true' }, [
      result === 'fail' ? '×' : '✓',
    ]),
    h('div', {}, [
      h('div', { class: stepTitle }, [title]),
      ...(desc ? [h('div', { class: stepDesc }, [desc])] : []),
    ]),
  ]);
}

function transformStep(node: Element): Element {
  return stepNode(
    attr(node, 'title') ?? '',
    attr(node, 'desc') ?? '',
    oneOf(attr(node, 'result'), ['fail', 'success'] as const, 'fail'),
  );
}

function transformTimeline(node: Element): Element {
  const items = parseItems(attr(node, 'steps'));
  if (items === null) {
    return h('ul', { class: timelineList }, meaningfulChildren(node));
  }
  return h(
    'ul',
    { class: timelineList },
    items.map(item =>
      stepNode(
        typeof item['title'] === 'string' ? item['title'] : '',
        typeof item['desc'] === 'string' ? item['desc'] : '',
        item['result'] === 'success' ? 'success' : 'fail',
      ),
    ),
  );
}

const TRANSFORMS: Record<string, (node: Element) => Element> = {
  callout: transformCallout,
  'file-tree': transformFileTree,
  figure: transformFigure,
  dialogue: transformDialogue,
  msg: transformMsg,
  metrics: transformMetrics,
  metric: transformMetric,
  timeline: transformTimeline,
  step: transformStep,
};

/** 이 파일이 아는 태그 — 테스트와 커버리지 대조에 쓴다. */
export const HANDLED_TAGS = Object.keys(TRANSFORMS);

/**
 * **후위 순회다** — 자식을 먼저 바꾸고 그 결과를 부모가 들고 간다.
 *
 * 전위로 하면 안 된다. 부모를 새 노드로 교체하는 순간 `hastscript`가 자식
 * 배열을 **복사**해 가므로, 이어지는 순회가 손대는 것은 버려진 옛 배열이다.
 * 실제로 `<dialogue>` 안의 `<msg>`가 통째로 변환되지 않은 채 남았다
 * (테스트가 먼저 잡았다).
 */
function transformTree<T extends RootContent | Root>(node: T): T | Element {
  // Doctype·Comment처럼 children이 없는 노드도 트리에 있다.
  if (node.type === 'element' || node.type === 'root') {
    node.children = node.children.map(child => transformTree(child));
  }
  if (node.type === 'element') {
    const transform = TRANSFORMS[node.tagName];
    if (transform !== undefined) return transform(node);
  }
  return node;
}

export function customTags() {
  return (tree: Root) => {
    transformTree(tree);
  };
}
