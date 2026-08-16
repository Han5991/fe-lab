import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
} from '../../lib/shared/constants';
import { resolvePostAssetUrl } from '../../domain/post/assetUrl';
import { parseScheduledDateKST } from '../../lib/shared/dates';
import { postUrl, type PostSummary } from '@/domain/post';
import { POST_SETS } from '../artifacts';
import { HEADING_COMPONENTS } from '@/src/components/post/markdownHeadings';

/**
 * @internal RSS 본문에 들어가는 raw text 전용 XML 이스케이프.
 *           모듈 외부에서는 사용을 권장하지 않으며 (entity awareness 없음 — 이미
 *           escape된 문자열을 다시 이중 인코딩함), 테스트에서 동작 잠금 목적으로만 export.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type RssPost = Pick<
  PostSummary,
  'slug' | 'title' | 'date' | 'excerpt'
> & {
  /** 마크다운 원문 — 있으면 content:encoded로 전문을 HTML 렌더링해 포함 */
  content?: string;
  /** 상대 경로 이미지(`./img.png`)를 절대 URL로 바꿀 때 쓰는 포스트 디렉토리 */
  relativeDir?: string;
};

// 모르는 type 값은 info로 렌더한다 — 폴백을 같은 객체로 공유해 둘이 어긋날 수 없게.
const CALLOUT_INFO = { icon: 'ℹ️', label: 'Info' };
const CALLOUT_META: Record<string, { icon: string; label: string }> = {
  info: CALLOUT_INFO,
  tip: { icon: '💡', label: 'Tip' },
  warning: { icon: '⚠️', label: 'Warning' },
  danger: { icon: '🚨', label: 'Danger' },
};

/**
 * 피드 리더에는 사이트의 스타일드 컴포넌트가 없으므로 커스텀 마크다운 헬퍼를
 * 의미가 통하는 표준 HTML로 매핑한다 (사이트 쪽 매핑: PostClient.tsx의
 * callout → Callout, file-tree → FileTree). figure는 표준 HTML이라 매핑 불필요.
 */
const FEED_COMPONENTS = {
  // 본문 h1 → h2 강등. 사이트 본문과 **같은 매핑**을 공유한다 — 한쪽만 적용하면
  // 피드 리더에서만 h1이 살아남는다(markdownHeadings.tsx 참고).
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

/** CDATA 종료 시퀀스(`]]>`)가 본문에 있어도 깨지지 않도록 분할 래핑 */
export function wrapCdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

/** content:encoded 전문을 포함할 최신 글 개수 — 피드 크기 무한 증가 방지 */
const DEFAULT_FULL_CONTENT_LIMIT = 20;

interface RssBuildOptions {
  siteUrl?: string;
  siteName?: string;
  siteDescription?: string;
  /** lastBuildDate / pubDate fallback 시 사용 — 테스트에서 결정성 확보용 */
  now?: Date;
  /**
   * content:encoded를 포함할 앞쪽 아이템 수 (posts는 최신순 정렬 가정 —
   * getAllPosts가 sortByDateDesc로 보장). 이후 글은 excerpt만 포함.
   */
  fullContentLimit?: number;
}

/**
 * RSS XML을 생성합니다.
 * 옵션을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 */
export function buildRssXml(
  posts: RssPost[],
  options: RssBuildOptions = {},
): string {
  const {
    siteUrl = SITE_URL,
    siteName = SITE_NAME,
    siteDescription = SITE_DESCRIPTION,
    now = new Date(),
    fullContentLimit = DEFAULT_FULL_CONTENT_LIMIT,
  } = options;

  const rssItems = posts
    .map(
      (post, index) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl(post.slug, siteUrl)}</link>
      <guid isPermaLink="true">${postUrl(post.slug, siteUrl)}</guid>
      <pubDate>${post.date ? parseScheduledDateKST(post.date).toUTCString() : now.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}${post.content && index < fullContentLimit ? `\n      <content:encoded>${wrapCdata(renderContentHtml(post.content, siteUrl, post.relativeDir))}</content:encoded>` : ''}
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${siteName} | ${siteDescription.split('。')[0]}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription}</description>
    <language>ko</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // scripts/render/ 아래 두 단계 위가 앱 루트다.
  const publicDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'public',
  );
  // 레지스트리 선언(postSet: 'visible', exact)과 같은 셀렉터.
  const posts = POST_SETS.visible();
  const rss = buildRssXml(posts);
  fs.writeFileSync(path.join(publicDir, 'rss.xml'), rss);
  console.log('RSS feed generated successfully!');
}
