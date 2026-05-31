import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from './lib/constants';
import { parseScheduledDateKST, getKSTDateISO } from './lib/dates';
import { getAllPosts } from './domain/post/service';
import { encodePostSlug } from './domain/post/utils';
import type { PostSummary } from './domain/post/types';

// 시리즈별 고가치 포스트는 우선순위 높게 설정.
// 테스트에서 self-describing 패턴으로 참조하기 위해 export.
export const HIGH_PRIORITY_SERIES = new Set([
  'bundler',
  'typescript',
  'open-source',
]);
export const HIGH_PRIORITY_SLUGS = new Set([
  'ai-opensource-contribution',
  'nodejs-contribution',
  'nextjs-contributor',
  'first-open-source-contribution',
]);

export function getPostPriority(post: {
  slug: string;
  series?: string;
}): string {
  if (HIGH_PRIORITY_SLUGS.has(post.slug)) return '0.8';
  if (post.series && HIGH_PRIORITY_SERIES.has(post.series)) return '0.75';
  return '0.6';
}

export type SitemapPost = Pick<
  PostSummary,
  'slug' | 'series' | 'date' | 'updatedAt'
>;

/**
 * sitemap.xml 본문을 생성합니다. (정적 페이지 + 포스트 목록)
 * `today`/`siteUrl`을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 */
export function buildSitemapXml(
  posts: SitemapPost[],
  today: string,
  siteUrl: string = SITE_URL,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/posts/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/about/</loc>
    <lastmod>${today}</lastmod>
    <priority>0.7</priority>
  </url>
  ${posts
    .map(post => {
      // 'YYYY-MM-DD' 형식을 KST 자정으로 파싱한 뒤, KST 기준 날짜 문자열로 추출합니다.
      // UTC 자정으로 파싱하면 `toISOString().split('T')[0]`가 전날 날짜를 반환할 수 있습니다.
      // (예: '2025-12-31' → UTC 자정 파싱 → toISOString() '2025-12-30T15:00:00Z' → '2025-12-30')
      // getKSTDateISO()는 KST 기준 달력 날짜를 정확히 반환합니다.
      const lastmod = post.updatedAt
        ? getKSTDateISO(parseScheduledDateKST(post.updatedAt))
        : post.date
          ? getKSTDateISO(parseScheduledDateKST(post.date))
          : today;
      return `
  <url>
    <loc>${siteUrl}/posts/${encodePostSlug(post.slug)}/</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${getPostPriority(post)}</priority>
  </url>`;
    })
    .join('')}
</urlset>`;
}

// 스크립트로 직접 실행될 때만 파일 쓰기. (테스트에서 import 시에는 실행 안 됨)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const publicDir = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'public',
  );
  const posts = getAllPosts();
  // KST 기준 오늘 날짜. `new Date().toISOString()`은 UTC라 KST 00:00~09:00 빌드 시
  // 하루 밀린 lastmod를 만들 수 있어 getKSTDateISO()를 사용한다.
  const today = getKSTDateISO();
  const sitemap = buildSitemapXml(posts, today);
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully!');
}
