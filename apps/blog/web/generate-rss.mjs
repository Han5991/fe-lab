import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://blog.sangwook.dev';
const POSTS_DIR = path.join(__dirname, '..', 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');

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

            if (data.published !== true) continue;

            const fileName = item.replace(/\.(md|mdx)$/, '');
            const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

            let slug = (data.slug || rawSlug).trim();
            if (slug.startsWith('/')) {
                slug = slug.substring(1);
            }

            const encodedSlug = slug
                .split('/')
                .map(part => encodeURIComponent(part))
                .join('/');

            const date = data.date
                ? new Date(data.date)
                : new Date();

            posts.push({
                title: data.title || fileName,
                slug: encodedSlug,
                date,
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

const posts = getAllPosts(POSTS_DIR);

// 최신 순으로 정렬
posts.sort((a, b) => b.date - a.date);

const rssItems = posts
    .map(
        post => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/posts/${post.slug}/</link>
      <guid isPermaLink="true">${BASE_URL}/posts/${post.slug}/</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>${post.excerpt ? `\n      <description>${escapeXml(post.excerpt)}</description>` : ''}
    </item>`,
    )
    .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Frontend Lab | 프론트엔드 실험실</title>
    <link>${BASE_URL}</link>
    <description>프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'rss.xml'), rss);
console.log('RSS feed generated successfully!');
