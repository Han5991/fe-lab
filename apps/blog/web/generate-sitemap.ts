import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from './lib/constants';
import { getAllPosts } from './domain/post/service';
import { toEncodedSlug } from './scripts/utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const posts = getAllPosts();
const today = new Date().toISOString().split('T')[0];

// 시리즈별 고가치 포스트는 우선순위 높게 설정
const HIGH_PRIORITY_SERIES = new Set(['bundler', 'typescript', 'open-source']);
const HIGH_PRIORITY_SLUGS = new Set([
  'ai-opensource-contribution',
  'nodejs-contribution',
  'nextjs-contributor',
  'first-open-source-contribution',
]);

function getPostPriority(post: { slug: string; series?: string }): string {
  if (HIGH_PRIORITY_SLUGS.has(post.slug)) return '0.8';
  if (post.series && HIGH_PRIORITY_SERIES.has(post.series)) return '0.75';
  return '0.6';
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/posts/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>
  ${posts
    .map(post => {
      const lastmod = post.updatedAt
        ? new Date(post.updatedAt).toISOString().split('T')[0]
        : post.date
          ? new Date(post.date).toISOString().split('T')[0]
          : today;
      return `
  <url>
    <loc>${SITE_URL}/posts/${toEncodedSlug(post.slug)}/</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${getPostPriority(post)}</priority>
  </url>`;
    })
    .join('')}
</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
console.log('Sitemap generated successfully!');
