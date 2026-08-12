/**
 * 코드 펜스의 **메타 문자열**을 컴포넌트까지 실어 나르는 통로.
 *
 * 마크다운에서 ```` ```ts title="lib/foo.ts" ```` 처럼 언어 뒤에 붙이는 부분을
 * mdast는 `code.meta`로 들고 있고, mdast-util-to-hast는 그걸 `<code>` 요소의
 * `data.meta`에 넣어준다(properties가 아니다 — className만 properties로 간다).
 *
 * 그런데 `data`는 **rehype-raw를 통과하지 못한다.** rehype-raw는 트리를 HTML로
 * 직렬화한 뒤 다시 파싱하는데, 그 왕복에서 살아남는 건 실제 속성뿐이라
 * `data.meta`는 조용히 사라진다. 그래서 이 플러그인은 rehype-raw보다 **먼저**
 * 돌면서 메타를 `data-*` 속성으로 옮겨 놓는다. 속성이 되면 직렬화·재파싱을
 * 지나도 남고, react-markdown이 그대로 컴포넌트 props로 넘겨준다.
 */

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  data?: { meta?: unknown };
  children?: HastNode[];
}

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
 * 모르는 키는 무시한다(레퍼런스의 `{1,3}` 라인 하이라이트 같은 문법이 나중에
 * 들어와도 여기서 걸려 넘어지지 않는다).
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
  if (title) out.title = title;
  if (tab) out.tab = tab;
  return out;
}

/**
 * `<code>`의 `data.meta`를 `data-title` / `data-tab` 속성으로 승격한다.
 *
 * **rehypeRaw보다 앞에 두어야 한다.** 순서가 바뀌면 메타가 이미 유실된
 * 트리를 보게 되어 아무 일도 일어나지 않는다(그리고 조용히 실패한다 —
 * 파일명이 그냥 안 보일 뿐이라 알아채기 어렵다).
 */
export function rehypeCodeMeta() {
  return (tree: HastNode) => {
    const visit = (node: HastNode) => {
      if (node.tagName === 'code' && typeof node.data?.meta === 'string') {
        const { title, tab } = parseCodeMeta(node.data.meta);
        node.properties ??= {};
        if (title) node.properties['data-title'] = title;
        if (tab) node.properties['data-tab'] = tab;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
