import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { isPostVisible } from './lib/post-visibility.mjs';
import { SITE_URL } from './lib/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_DIR = path.join(__dirname, '..', 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');

/** 인코딩된 slug를 반환합니다 */
function toEncodedSlug(rawSlug: string): string {
  return rawSlug
    .split('/')
    .map((part: string) => encodeURIComponent(part))
    .join('/');
}

function getAllPostSlugs(
  dirPath: string,
  currentPath: string = '',
): { slug: string; date: string }[] {
  const items = fs.readdirSync(dirPath);
  let slugs: { slug: string; date: string }[] = [];

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      slugs = slugs.concat(
        getAllPostSlugs(fullPath, path.join(currentPath, item)),
      );
    } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      if (!isPostVisible(data)) continue;

      const fileName = item.replace(/\.(md|mdx)$/, '');
      const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;
      let slug = (data.slug || rawSlug).trim().replace(/^\//, '');

      const date = data.date
        ? new Date(data.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      slugs.push({ slug: toEncodedSlug(slug), date });
    }
  }
  return slugs;
}

const posts = getAllPostSlugs(POSTS_DIR);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/posts/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
  ${posts
    .map(
      post => `
  <url>
    <loc>${SITE_URL}/posts/${post.slug}/</loc>
    <lastmod>${post.date}</lastmod>
    <priority>0.6</priority>
  </url>`,
    )
    .join('')}
</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
console.log('Sitemap generated successfully!');
