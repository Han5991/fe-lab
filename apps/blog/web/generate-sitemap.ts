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
    <loc>${SITE_URL}/posts/${toEncodedSlug(post.slug)}/</loc>
    <lastmod>${post.date ? new Date(post.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.6</priority>
  </url>`,
    )
    .join('')}
</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
console.log('Sitemap generated successfully!');
