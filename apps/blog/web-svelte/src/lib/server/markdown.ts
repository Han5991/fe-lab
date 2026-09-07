import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { HEADING_TAG_MAP, resolvePostAssetUrl } from '@blog/content';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * 마크다운 원문 → HTML. **빌드 타임에만 돈다**(prerender).
 *
 * React 판은 `react-markdown`이 런타임에 같은 remark/rehype 파이프라인을 돌린다.
 * 여기서는 정적 export가 전제라 문자열 HTML까지 서버에서 만들고 화면은
 * `{@html}`로 꽂는다 — 파서가 클라이언트 번들에 실리지 않는다. 이것이 이
 * 실험에서 재려는 차이 중 하나다.
 *
 * **커스텀 태그 15종은 아직 살아나지 않는다.** `rehype-raw`가 raw HTML을
 * 노드로 살려 두므로 `<callout>` 같은 태그는 **알 수 없는 요소로 그대로**
 * 통과한다(브라우저가 인라인 요소로 렌더한다 — 내용은 보이되 스타일이 없다).
 * HAST → Svelte 컴포넌트 매핑은 PR 4의 일이다.
 *
 * h1 강등은 `@blog/content`의 `HEADING_TAG_MAP`을 읽는다 — 사이트 본문과 RSS
 * `content:encoded`가 같은 매핑을 공유해야 하므로 여기서 리터럴을 적지 않는다.
 * 페이지의 h1은 글 제목 하나뿐이어야 하고, 그건 `check-seo`가 검사한다.
 */
function demoteHeadings() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const mapped = (HEADING_TAG_MAP as Record<string, string | undefined>)[
        node.tagName
      ];
      if (mapped !== undefined) node.tagName = mapped;
    });
  };
}

/**
 * 본문의 상대 자산 경로를 사이트 경로로 푼다 — `sync-posts`가 미디어를
 * `static/posts/`로 복사하는 것과 짝이다.
 *
 * 해석 규칙은 `@blog/content`의 `resolvePostAssetUrl` 하나뿐이다. 사이트 본문과
 * RSS 전문이 같은 함수를 공유하므로 여기서 정규식을 다시 쓰지 않는다.
 *
 * 안 하면 `<img src="foo.png">`가 페이지 URL 기준으로 풀려
 * `/posts/<slug>/foo.png`를 가리키고, 프리렌더 크롤러가 그 주소를 따라가
 * 404로 빌드를 세운다(실제로 그렇게 잡혔다).
 */
function resolveAssetUrls(relativeDir: string) {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      const attr = node.tagName === 'img' ? 'src' : null;
      if (attr === null) return;
      const value = node.properties[attr];
      if (typeof value !== 'string') return;
      node.properties[attr] = resolvePostAssetUrl(value, relativeDir);
    });
  };
}

const processor = () =>
  unified()
    .use(remarkParse)
    .use(remarkGfm)
    // allowDangerousHtml + rehype-raw: 본문의 raw HTML(커스텀 태그·figure·callout)을
    // 버리지 않고 HAST 노드로 살린다. 원고는 이 저장소가 쓰는 것이라 신뢰 경계 안이다.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(demoteHeadings)
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true });

export function renderMarkdown(markdown: string, relativeDir: string): string {
  return String(
    processor().use(resolveAssetUrls, relativeDir).processSync(markdown),
  );
}
