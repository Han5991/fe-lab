import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * 코드 펜스의 **메타 문자열**을 `data-*` 속성으로 옮긴다.
 *
 * 마크다운에서 ```` ```ts title="lib/foo.ts" ```` 처럼 언어 뒤에 붙이는 부분을
 * mdast는 `code.meta`로 들고 있고, `mdast-util-to-hast`가 그걸 `<code>` 요소의
 * `data.meta`에 넣어 준다(properties가 아니다 — className만 properties로 간다).
 *
 * 그런데 `data`는 **`rehype-raw`를 통과하지 못한다.** rehype-raw는 트리를
 * HTML로 직렬화한 뒤 다시 파싱하는데, 그 왕복에서 살아남는 건 실제 속성뿐이라
 * `data.meta`는 조용히 사라진다. 그래서 이 플러그인은 rehype-raw보다 **먼저**
 * 돌면서 메타를 속성으로 옮겨 놓는다.
 *
 * React 판(`src/components/post/codeMeta.ts`)이 같은 이유로 같은 일을 한다 —
 * 파이프라인이 갈려도 이 왕복 문제는 똑같이 생긴다.
 */

export interface CodeMeta {
  /** 상단 바에 띄울 파일명. */
  title?: string;
  /** `<code-tabs>` 안에서 이 블록이 갖는 탭 이름. */
  tab?: string;
}

/**
 * `title="lib/foo.ts" tab="npm"` 꼴에서 우리가 쓰는 키만 뽑는다.
 *
 * 따옴표 없는 값(`tab=npm`)도 받는다 — 파일 경로처럼 공백이 들어갈 수 있는
 * 값은 따옴표가 필요하지만, 탭 이름은 대개 한 단어라 따옴표를 빠뜨리기 쉽다.
 * 모르는 키는 무시한다(라인 하이라이트 같은 문법이 나중에 들어와도 여기서
 * 걸려 넘어지지 않는다).
 */
export function parseCodeMeta(meta: string): CodeMeta {
  const read = (key: string) =>
    new RegExp(`(?:^|\\s)${key}=(?:"([^"]*)"|'([^']*)'|([^\\s]+))`).exec(
      meta,
    ) ?? undefined;

  const pick = (m: RegExpExecArray | undefined) =>
    m ? (m[1] ?? m[2] ?? m[3]) : undefined;

  const out: CodeMeta = {};
  const title = pick(read('title'));
  const tab = pick(read('tab'));
  if (title !== undefined && title.length > 0) out.title = title;
  if (tab !== undefined && tab.length > 0) out.tab = tab;
  return out;
}

/** `rehype-raw`보다 **먼저** 돌아야 한다. */
export function codeMeta() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'code') return;
      const raw = (node.data as { meta?: unknown } | undefined)?.meta;
      if (typeof raw !== 'string' || raw.length === 0) return;
      const { title, tab } = parseCodeMeta(raw);
      // HAST는 `data-*`를 camelCase 키로 든다(`dataTitle`). 하이픈 키로 넣으면
      // 직렬화는 되지만 rehype-raw가 다시 파싱하며 camelCase로 바꿔 놓아,
      // 읽는 쪽이 하이픈 키를 찾으면 조용히 못 만난다 — 실제로 그랬다.
      if (title !== undefined) node.properties['dataTitle'] = title;
      if (tab !== undefined) node.properties['dataTab'] = tab;
    });
  };
}
