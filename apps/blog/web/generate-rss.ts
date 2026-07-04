import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './lib/constants';
import { parseScheduledDateKST } from './lib/dates';
import { getAllPosts } from './domain/post/service';
import { encodePostSlug } from './domain/post/utils';
import type { PostSummary } from './domain/post/types';

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

/**
 * 마크다운 본문을 피드용 HTML로 렌더링합니다.
 * 사이트 렌더링과 동일한 스택(remark-gfm + rehype-raw)을 사용하되,
 * 피드 리더는 사이트 origin을 모르므로 상대 URL을 절대 URL로 변환합니다.
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
        urlTransform: (url: string) => {
          if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url;
          if (url.startsWith('/')) return `${siteUrl}${url}`;
          const cleaned = url.replace(/^\.\//, '');
          return relativeDir
            ? `${siteUrl}/posts/${relativeDir}/${cleaned}`
            : `${siteUrl}/${cleaned}`;
        },
      },
      content,
    ),
  );
}

/** CDATA 종료 시퀀스(`]]>`)가 본문에 있어도 깨지지 않도록 분할 래핑 */
export function wrapCdata(html: string): string {
  return `<![CDATA[${html.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

export interface RssBuildOptions {
  siteUrl?: string;
  siteName?: string;
  siteDescription?: string;
  /** lastBuildDate / pubDate fallback 시 사용 — 테스트에서 결정성 확보용 */
  now?: Date;
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
  } = options;

  const rssItems = posts
    .map(
      post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/posts/${encodePostSlug(post.slug)}/</link>
      <guid isPermaLink="true">${siteUrl}/posts/${encodePostSlug(post.slug)}/</guid>
      <pubDate>${post.date ? parseScheduledDateKST(post.date).toUTCString() : now.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}${post.content ? `\n      <content:encoded>${wrapCdata(renderContentHtml(post.content, siteUrl, post.relativeDir))}</content:encoded>` : ''}
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
  const publicDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'public',
  );
  const posts = getAllPosts();
  const rss = buildRssXml(posts);
  fs.writeFileSync(path.join(publicDir, 'rss.xml'), rss);
  console.log('RSS feed generated successfully!');
}
