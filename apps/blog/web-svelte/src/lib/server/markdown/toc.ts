import { visit } from 'unist-util-visit';
import type { Element, ElementContent, Root } from 'hast';

import type { TocItem } from '../../shared/tocTypes.ts';

export type { TocItem };

const HEADINGS = new Set(['h2', 'h3', 'h4']);

/**
 * 헤딩의 글자만 뽑는다. 헤딩 안에는 인라인 코드·강조·링크가 섞여 들어오므로
 * 자식을 재귀로 이어 붙인다(`hast-util-to-string`과 같은 일 — 그 패키지를
 * 더하지 않은 것은 이 여덟 줄이 전부이기 때문이다).
 */
function textOf(node: Element): string {
  const parts: string[] = [];
  const walk = (children: ElementContent[]) => {
    for (const child of children) {
      if (child.type === 'text') parts.push(child.value);
      else if (child.type === 'element') walk(child.children);
    }
  };
  walk(node.children);
  return parts.join('');
}

/**
 * 본문 헤딩을 모으는 수집 플러그인.
 *
 * **`rehypeSlug` 뒤에 꽂아야 한다** — 그 전에는 id가 아직 없어서 전부 걸러진다.
 *
 * React 판은 이걸 못 한다. `react-markdown`이 런타임에 렌더하므로 차례는
 * 브라우저에서 `#post-content`를 `querySelectorAll`로 훑어 만든다. 여기서는
 * HTML이 빌드 타임에 완성되니 그때 같이 뽑는다 — 차례가 프리렌더된 HTML에
 * 들어가고, 헤딩을 읽으려고 클라이언트가 DOM을 뒤질 일이 없다.
 */
export function collectToc(out: TocItem[]) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (!HEADINGS.has(node.tagName)) return;
      const id = node.properties.id;
      if (typeof id !== 'string' || id.length === 0) return;
      out.push({
        id,
        text: textOf(node),
        level: Number(node.tagName.slice(1)),
      });
    });
  };
}
