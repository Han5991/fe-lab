/**
 * 본문 파이프라인의 배선 자체를 잠근다 — 개별 컴포넌트 동작은 각자의
 * 테스트가 보고, 여기는 **매핑·플러그인·블록 판정이 같은 실물을 공유하는지**만
 * 본다. 매핑과 `BLOCK_MARKDOWN_COMPONENTS`가 서로 다른 바인딩을 들면
 * identity 판정이 어긋나 `<p><div>` 무효 중첩(hydration mismatch)으로 나타난다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { rehypeCodeMeta } from '@/src/components/post/codeMeta';
import { PostBody, POST_REHYPE_PLUGINS, buildPostComponents } from './PostBody';
import { BLOCK_MARKDOWN_COMPONENTS } from './markdownBlocks';

vi.mock('mermaid', () => ({ default: {} }));

/**
 * 서버가 실제로 내보내는 HTML 문자열. DOM(`render`)으로 보면 파서가 무효 중첩을
 * 이미 고쳐 놓은 뒤라(`<p>` 조기 종료) 하이드레이션을 깨는 원문을 볼 수 없다.
 */
const serverHtml = (content: string) =>
  renderToStaticMarkup(<PostBody content={content} relativeDir="dir" />);

/** 서버 HTML을 파싱한 문서 — 개수·속성은 여기서 센다. */
const parsed = (html: string) =>
  new DOMParser().parseFromString(html, 'text/html');

// 내용 모델이 flow인 태그. `<p>` 안에 열리면 브라우저가 `<p>`를 먼저 닫아
// 서버 트리와 DOM이 갈린다(hydration mismatch).
const FLOW_ONLY = new Set([
  'div',
  'figure',
  'figcaption',
  'pre',
  'p',
  'ul',
  'ol',
  'table',
  'blockquote',
  'section',
  'details',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);
const VOID = new Set(['img', 'br', 'hr', 'input', 'wbr', 'source', 'col']);

/**
 * 원문 HTML에서 `<p>`(또는 `<pre>`) 안에 flow 요소가 열리는 자리를 찾는다.
 * 파서를 거치면 사라지는 문제라 태그 문자열을 직접 훑는다.
 */
function invalidNesting(html: string): string[] {
  const stack: string[] = [];
  const found: string[] = [];
  for (const [tag, closing, name, selfClosing] of html.matchAll(
    /<(\/?)([a-z][a-z0-9-]*)[^>]*?(\/?)>/g,
  )) {
    if (closing) {
      const at = stack.lastIndexOf(name);
      if (at !== -1) stack.length = at;
      continue;
    }
    const inside = stack.findLast(open => open === 'p' || open === 'pre');
    if (inside && FLOW_ONLY.has(name)) found.push(`<${inside}> ⊃ ${tag}`);
    if (!VOID.has(name) && !selfClosing) stack.push(name);
  }
  return found;
}

describe('파이프라인 배선', () => {
  test('rehype 순서는 codeMeta → raw → slug다', () => {
    // 순서가 뒤집히면 펜스 메타가 조용히 사라진다(codeMeta.test.tsx의 대조군).
    expect(POST_REHYPE_PLUGINS).toEqual([
      rehypeCodeMeta,
      rehypeRaw,
      rehypeSlug,
    ]);
  });

  test('블록 판정 Set ↔ 매핑의 블록 컨테이너 태그가 정확히 일치한다', () => {
    const components = buildPostComponents('dir') ?? {};
    // 블록 커스텀 태그(컨테이너와 그 자식 태그)의 단일 목록. 새 블록 태그를 매핑에 더할 때는
    // markdownBlocks.ts의 Set과 이 목록을 **함께** 늘린다 — 매핑에만 더하면
    // p 매퍼가 <p>를 유지해 <p><div> 무효 중첩(hydration mismatch)으로 새고,
    // Set에만 더하면 아래 완전 일치가 깨져 여기서 잡힌다.
    const blockTags = [
      'callout',
      'code-tabs',
      'diagram',
      'diagram-edge',
      'diagram-node',
      'dialogue',
      'figure',
      'file-tree',
      'metric',
      'metrics',
      'msg',
      'step',
      'timeline',
    ] as const;
    const mappedBlocks = new Set(
      blockTags.map(tag => (components as Record<string, unknown>)[tag]),
    );
    expect(mappedBlocks).toEqual(BLOCK_MARKDOWN_COMPONENTS);
  });
});

describe('PostBody 렌더', () => {
  test('#post-content 안에서 h1은 h2로 강등되고 slug id가 붙는다', () => {
    const { container } = render(
      <PostBody content={'# 첫 단원\n\n본문'} relativeDir="dir" />,
    );

    const root = container.querySelector('#post-content');
    expect(root).not.toBeNull();
    expect(root?.querySelector('h1')).toBeNull();
    expect(root?.querySelector('h2')?.id).toBe('첫-단원');
  });

  test('블록 컴포넌트가 <p>로 감싸이지 않는다', () => {
    const { container } = render(
      <PostBody
        content={'<callout type="info">안내</callout>'}
        relativeDir="dir"
      />,
    );

    expect(container.querySelector('p')).toBeNull();
  });
});

// 커스텀 태그 안에 빈 줄을 두면, 빈 줄 뒤의 `<step …>…</step>`·
// `<diagram-node …></diagram-node>`는 HTML 블록이 아니라 **인라인 HTML을 품은
// 문단**이 된다(여는 태그 뒤에 다른 내용이 이어지므로 CommonMark HTML 블록 7의
// 조건을 못 채운다). 그래서 자식이 매핑된 p 요소 한 겹에 싸여 온다.
describe('커스텀 태그 안의 빈 줄', () => {
  test('<diagram>: 빈 줄 뒤의 노드·엣지도 전부 그린다', () => {
    const html = serverHtml(
      [
        '<diagram label="파이프라인">',
        '<diagram-node id="a" title="A"></diagram-node>',
        '',
        '<diagram-node id="b" title="B"></diagram-node>',
        '<diagram-node id="c" title="C"></diagram-node>',
        '',
        '<diagram-edge from="a" to="c" emphasis="true" flow="async"></diagram-edge>',
        '</diagram>',
      ].join('\n'),
    );
    const doc = parsed(html);

    expect(doc.querySelectorAll('rect')).toHaveLength(3);
    // 명시 엣지가 있으면 자동 체인은 눌린다 — 선은 명시한 하나뿐이다.
    const edges = Array.from(doc.querySelectorAll('[data-flow]'), edge => [
      edge.getAttribute('data-flow'),
      edge.getAttribute('data-emphasis'),
    ]);
    expect(edges).toEqual([['async', 'true']]);
    expect(invalidNesting(html)).toEqual([]);
  });

  test('<diagram>: 태그마다 빈 줄을 둬도 그림이 사라지지 않는다', () => {
    const html = serverHtml(
      [
        '<diagram label="띄엄띄엄">',
        '',
        '<diagram-node id="a" title="A"></diagram-node>',
        '',
        '<diagram-node id="b" title="B"></diagram-node>',
        '',
        '</diagram>',
      ].join('\n'),
    );

    expect(parsed(html).querySelectorAll('rect')).toHaveLength(2);
    expect(invalidNesting(html)).toEqual([]);
  });

  test('<timeline>: 스텝이 전부 나오고 마지막 스텝만 레일이 없다', () => {
    const html = serverHtml(
      [
        '<timeline>',
        '',
        '<step title="시도 1" result="fail">전환 순간 504</step>',
        '',
        '<step title="시도 2" result="success">자동 롤백</step>',
        '',
        '</timeline>',
      ].join('\n'),
    );
    const doc = parsed(html);

    expect(doc.querySelectorAll('[data-result]')).toHaveLength(2);
    expect(doc.querySelectorAll('[data-timeline-rail]')).toHaveLength(1);
    expect(doc.body.textContent).toContain('전환 순간 504');
    expect(invalidNesting(html)).toEqual([]);
  });

  test('<dialogue>: 말풍선이 문단 안에 갇히지 않는다', () => {
    const html = serverHtml(
      [
        '<dialogue>',
        '',
        '<msg from="PM">배포는 언제 하나요?</msg>',
        '',
        '<msg from="me">점심에 합니다.</msg>',
        '',
        '</dialogue>',
      ].join('\n'),
    );

    expect(parsed(html).querySelectorAll('[data-speaker]')).toHaveLength(2);
    expect(invalidNesting(html)).toEqual([]);
  });

  test('<metrics>: 카드 수만큼 칸이 나뉘고 문단에 갇히지 않는다', () => {
    const html = serverHtml(
      [
        '<metrics>',
        '',
        '<metric label="다운타임" value="0초"></metric>',
        '',
        '<metric label="롤백" value="자동" tone="success"></metric>',
        '',
        '</metrics>',
      ].join('\n'),
    );

    expect(parsed(html).querySelectorAll('[data-tone]')).toHaveLength(2);
    expect(invalidNesting(html)).toEqual([]);
  });
});
