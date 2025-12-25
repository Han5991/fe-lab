import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const BASE_URL = 'https://han5991.github.io/fe-lab';
const POSTS_DIR = path.join(process.cwd(), '..', 'posts');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

function getAllPostSlugs(dirPath, currentPath = '') {
  const items = fs.readdirSync(dirPath);
  let slugs = [];

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

      if (data.published !== true) continue;

      const fileName = item.replace(/\.(md|mdx)$/, '');
      const rawSlug = currentPath ? `${currentPath}/${fileName}` : fileName;

      const slug = (data.slug || rawSlug)
        .replace(/\s+/g, '-')
        .replace(/[^\w\-가-힣/]/g, '')
        .toLowerCase();

      const date = data.date
        ? new Date(data.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      slugs.push({ slug, date });
    }
  }
  return slugs;
}

const posts = getAllPostSlugs(POSTS_DIR);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${BASE_URL}/posts/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>
  ${posts
    .map(
      post => `
  <url>
    <loc>${BASE_URL}/posts/${post.slug}/</loc>
    <lastmod>${post.date}</lastmod>
    <priority>0.6</priority>
  </url>`,
    )
    .join('')}
</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
console.log('Sitemap generated successfully!');
