import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://blog.sangwook.dev';
const POSTS_DIR = path.join(__dirname, '..', 'posts');
const PUBLIC_DIR = path.join(__dirname, 'public');

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

      // lib/posts.ts와 동일하게 slug 처리 (변환 로직 제거)
      let slug = (data.slug || rawSlug).trim();

      // 맨 앞에 /가 있으면 제거 (URL 결합 시 이중 슬래시 방지)
      if (slug.startsWith('/')) {
        slug = slug.substring(1);
      }

      // XML 내에서 안전하게 사용할 수 있도록 인코딩 (한글, 특수문자 등)
      // 이미 인코딩된 상태일 수도 있으니 체크 필요하지만, 보통 원본 문자열임.
      // sitemap spec은 UTF-8을 지원하므로 한글 그대로 넣어도 되지만,
      // URL로 쓰일 때는 인코딩하는 것이 안전함. 하지만 Next.js 기본 동작이나 구글은 UTF-8 URL도 잘 처리함.
      // 여기서는 템플릿 리터럴에서 그대로 사용하되, 생성된 결과물 확인 필요.
      // 안전하게 가려면 encodeURI 사용.
      slug = slug.split('/').map(part => encodeURIComponent(part)).join('/');

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
