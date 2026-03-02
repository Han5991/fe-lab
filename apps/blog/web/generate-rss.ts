import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from './lib/constants';

// generate-rss.mjs는 Node/ESM 환경에서 실행되므로 domain/post/service를 직접 import
// tsconfig의 paths가 적용되지 않아 상대경로로 import
// 단, Next.js 빌드 없이 실행되므로 app 코드 대신 lib/posts.ts를 컴파일된 경로로 참조하거나
// gray-matter + post-visibility.mjs를 사용해야 합니다.
// 현재 아키텍처(mjs 스크립트)에서는 TypeScript를 직접 import 할 수 없어
// lib/post-visibility.mjs를 계속 사용합니다 (domain/visibility.ts의 동일 로직 유지).
import matter from 'gray-matter';
import { isPostVisible } from './lib/post-visibility.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');

/** 인코딩된 slug를 반환합니다 */
function toEncodedSlug(rawSlug) {
  return rawSlug
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('/');
}

function getAllPosts(dirPath, currentPath = '') {
  const items = fs.readdirSync(dirPath);
  let posts = [];

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      posts = posts.concat(getAllPosts(fullPath, path.join(currentPath, item)));
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      if (!isPostVisible(data)) continue;

      const fileName = item.replace(/\.(md|mdx)$/, '');
      const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;
      let slug = (data.slug || rawSlug).trim().replace(/^\//, '');

      posts.push({
        title: data.title || fileName,
        slug: toEncodedSlug(slug),
        date: data.date ? new Date(data.date) : new Date(),
        excerpt: data.excerpt || '',
      });
    }
  }
  return posts;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const posts = getAllPosts(POSTS_DIR).sort((a, b) => b.date - a.date);

const rssItems = posts
  .map(
    post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/posts/${post.slug}/</link>
      <guid isPermaLink="true">${SITE_URL}/posts/${post.slug}/</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}
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
