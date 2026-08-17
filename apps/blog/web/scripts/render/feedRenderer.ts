/**
 * RSS `content:encoded`용 마크다운 → HTML 렌더러 — **React 스택은 여기까지만**.
 *
 * buildRssXml(generate-rss.ts)은 이 함수를 `renderContent` 옵션으로 주입받는다.
 * 예전에는 generate-rss.ts가 react-dom/server와 app의 markdownHeadings까지 직접
 * import해서, RSS 빌더를 import하는 모든 곳(테스트 포함)이 React를 끌고 왔고
 * 레이어 경계(render-build → app)에 예외가 필요했다. 렌더러를 분리하고 헤딩
 * 강등은 공유 데이터(lib/shared/markdownHeadings.ts)에서 파생하므로 예외가
 * 필요 없다.
 */
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { resolvePostAssetUrl } from '../../domain/post/assetUrl';
import { HEADING_TAG_MAP } from '../../lib/shared/markdownHeadings';

// 모르는 type 값은 info로 렌더한다 — 폴백을 같은 객체로 공유해 둘이 어긋날 수 없게.
const CALLOUT_INFO = { icon: 'ℹ️', label: 'Info' };
const CALLOUT_META: Record<string, { icon: string; label: string }> = {
  info: CALLOUT_INFO,
  tip: { icon: '💡', label: 'Tip' },
  warning: { icon: '⚠️', label: 'Warning' },
  danger: { icon: '🚨', label: 'Danger' },
};

/**
 * 본문 헤딩 강등 — 사이트 본문(markdownHeadings.tsx)과 **같은 매핑**
 * (HEADING_TAG_MAP)에서 파생한다. 한쪽만 적용하면 피드 리더에서만 h1이
 * 살아남는다. rehype-slug가 붙인 id는 props로 그대로 넘어간다.
 */
function demotedHeading(tag: string) {
  return ({
    node: _node,
    ...props
  }: {
    node?: unknown;
    children?: ReactNode;
  }) => createElement(tag, props);
}

const HEADING_COMPONENTS = Object.fromEntries(
  Object.entries(HEADING_TAG_MAP).map(([from, to]) => [
    from,
    demotedHeading(to),
  ]),
);

/**
 * 피드 리더에는 사이트의 스타일드 컴포넌트가 없으므로 커스텀 마크다운 헬퍼를
 * 의미가 통하는 표준 HTML로 매핑한다 (사이트 쪽 매핑: PostClient.tsx의
 * callout → Callout, file-tree → FileTree). figure는 표준 HTML이라 매핑 불필요.
 */
const FEED_COMPONENTS = {
  ...HEADING_COMPONENTS,
  callout: (props: { type?: string; title?: string; children?: ReactNode }) => {
    const meta = CALLOUT_META[props.type ?? ''] ?? CALLOUT_INFO;
    return createElement(
      'blockquote',
      null,
      createElement(
        'p',
        null,
        createElement(
          'strong',
          null,
          `${meta.icon} ${props.title ?? meta.label}`,
        ),
      ),
      props.children,
    );
  },
  'file-tree': (props: { children?: ReactNode }) =>
    createElement('pre', null, props.children),
} as unknown as Components;

/**
 * 마크다운 본문을 피드용 HTML로 렌더링합니다.
 * 사이트 렌더링과 동일한 스택(remark-gfm + rehype-raw)을 사용하되,
 * 피드 리더는 사이트 origin을 모르므로 상대 URL을 절대 URL로 변환합니다.
 * 경로 해석은 사이트(MarkdownImage)와 공유하는 resolvePostAssetUrl 사용.
 */
export function renderContentHtml(
  content: string,
  siteUrl: string,
  relativeDir?: string,
): string {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [rehypeRaw],
        components: FEED_COMPONENTS,
        urlTransform: (url: string) => {
          // react-markdown 기본 sanitizer를 먼저 적용해 javascript: 등
          // 위험 프로토콜 차단을 유지한다 (커스텀 transform은 기본값을 대체하므로
          // 생략하면 sanitize가 사라짐 — defense in depth).
          const safe = defaultUrlTransform(url);
          if (!safe) return safe;
          const resolved = resolvePostAssetUrl(safe, relativeDir);
          // 사이트 상대 경로(/posts/... 등)만 절대 URL로 승격.
          // protocol-relative(//)는 이미 절대 URL이므로 제외.
          return resolved.startsWith('/') && !resolved.startsWith('//')
            ? `${siteUrl}${resolved}`
            : resolved;
        },
      },
      content,
    ),
  );
}
