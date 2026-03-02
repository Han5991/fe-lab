import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './lib/constants';
import { getAllPosts } from './domain/post/service';
import { toEncodedSlug } from './scripts/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const posts = getAllPosts();

const rssItems = posts
  .map(
    post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/posts/${toEncodedSlug(post.slug)}/</link>
      <guid isPermaLink="true">${SITE_URL}/posts/${toEncodedSlug(post.slug)}/</guid>
      <pubDate>${post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`,
  )
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} | ${SITE_DESCRIPTION.split('。')[0]}</title>
    <link>${SITE_URL}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rss);
console.log('RSS feed generated successfully!');
