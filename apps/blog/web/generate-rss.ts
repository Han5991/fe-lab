import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './lib/constants';
import { getAllPosts } from './domain/post/service';
import { encodePostSlug } from './domain/post/utils';
import type { PostSummary } from './domain/post/types';

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export type RssPost = Pick<PostSummary, 'slug' | 'title' | 'date' | 'excerpt'>;

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
      <pubDate>${post.date ? new Date(post.date).toUTCString() : now.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const posts = getAllPosts();
  const rss = buildRssXml(posts);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rss);
  console.log('RSS feed generated successfully!');
}
