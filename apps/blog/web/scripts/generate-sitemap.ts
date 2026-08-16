import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_URL, ABOUT_PAGE_MODIFIED } from '../lib/shared/constants';
import { CONTENT } from '../lib/shared/contentConfig';
import { CONTENT_PATHS } from '../lib/shared/contentPaths';
import { parseScheduledDateKST, getKSTDateISO } from '../lib/shared/dates';
import { archiveUrl, postUrl, type PostSummary } from '../domain/post';
import { POST_SETS } from './artifacts';

// 고가치 주제 폴더의 글은 우선순위를 높게 설정. 목록은 설정(defineContent의
// sitemap 그룹)에서 오고, 테스트에서 self-describing 패턴으로 참조하기 위해
// Set으로 감싸 export한다.
//
// **시리즈가 아니라 폴더 기준이다.** 목록의 `typescript`에는 `_series.yml`이
// 없어서 시리즈가 아니고, `post.series`로 비교하면 이 글의 우선순위가 조용히
// 0.6으로 떨어진다. 우선순위는 "이 주제가 중요한가"의 문제라 연재 여부와
// 무관하므로, 물리적 폴더(`relativeDir`)를 본다.
export const HIGH_PRIORITY_FOLDERS = new Set(
  CONTENT.sitemap.highPriorityFolders,
);
export const HIGH_PRIORITY_SLUGS = new Set(CONTENT.sitemap.highPrioritySlugs);

export function getPostPriority(post: {
  slug: string;
  relativeDir?: string;
}): string {
  if (HIGH_PRIORITY_SLUGS.has(post.slug)) return '0.8';
  if (post.relativeDir && HIGH_PRIORITY_FOLDERS.has(post.relativeDir)) {
    return '0.75';
  }
  return '0.6';
}

export type SitemapPost = Pick<
  PostSummary,
  'slug' | 'relativeDir' | 'date' | 'updatedAt'
>;

/**
 * 포스트의 lastmod를 KST 기준 'YYYY-MM-DD'로 해석합니다.
 *
 * 'YYYY-MM-DD' 형식을 KST 자정으로 파싱한 뒤, KST 기준 날짜 문자열로 추출합니다.
 * UTC 자정으로 파싱하면 `toISOString().split('T')[0]`가 전날 날짜를 반환할 수 있습니다.
 * (예: '2025-12-31' → UTC 자정 파싱 → toISOString() '2025-12-30T15:00:00Z' → '2025-12-30')
 * getKSTDateISO()는 KST 기준 달력 날짜를 정확히 반환합니다.
 */
function resolvePostLastmod(post: SitemapPost, fallback: string): string {
  return post.updatedAt
    ? getKSTDateISO(parseScheduledDateKST(post.updatedAt))
    : post.date
      ? getKSTDateISO(parseScheduledDateKST(post.date))
      : fallback;
}

/**
 * sitemap.xml 본문을 생성합니다. (정적 페이지 + 포스트 목록)
 * `today`/`siteUrl`을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 *
 * 정적 페이지(`/`, `/posts/`)의 lastmod는 빌드 날짜가 아니라 **가장 최근 글의 날짜**를
 * 씁니다. 이 사이트는 매일 cron으로 빌드되므로 빌드 날짜를 넣으면 콘텐츠가 그대로인
 * 날에도 lastmod가 전진하고, Google은 그런 사이트의 lastmod 신호를 통째로 무시합니다.
 * `/about/`은 글이 아니라 자동으로 알 수 있는 수정 시각이 없어서, 손으로 관리하는
 * `ABOUT_PAGE_MODIFIED` 상수를 씁니다 — JSON-LD `dateModified`와 같은 소스라
 * 두 값이 어긋날 수 없습니다. (여기만 lastmod가 비어 있으면 46개 URL 중 하나만
 * 신호가 없는 상태가 됩니다.)
 */
export function buildSitemapXml(
  posts: SitemapPost[],
  today: string,
  siteUrl: string = SITE_URL,
): string {
  const entries = posts.map(post => ({
    post,
    lastmod: resolvePostLastmod(post, today),
    // date/updatedAt이 둘 다 없는 글의 lastmod는 today로 폴백된 값이라
    // "콘텐츠 날짜"가 아니다. 정적 URL 계산에 섞으면 today가 항상 최댓값이 되어
    // lastmod가 매일 전진하는 원래 버그로 되돌아간다.
    hasOwnDate: Boolean(post.updatedAt ?? post.date),
  }));

  // 'YYYY-MM-DD'는 사전순 비교가 곧 시간순 비교.
  const contentDates = entries
    .filter(entry => entry.hasOwnDate)
    .map(entry => entry.lastmod);
  const latestContentDate = contentDates.length
    ? contentDates.reduce((max, date) => (date > max ? date : max))
    : today;

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${latestContentDate}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${archiveUrl(siteUrl)}</loc>
    <lastmod>${latestContentDate}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/about/</loc>
    <lastmod>${ABOUT_PAGE_MODIFIED}</lastmod>
    <priority>0.7</priority>
  </url>
  ${entries
    .map(
      ({ post, lastmod }) => `
  <url>
    <loc>${postUrl(post.slug, siteUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${getPostPriority(post)}</priority>
  </url>`,
    )
    .join('')}
</urlset>`;
}

// 스크립트로 직접 실행될 때만 파일 쓰기. (테스트에서 import 시에는 실행 안 됨)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const publicDir = CONTENT_PATHS.publicDir;
  // 글 집합은 레지스트리(artifacts.ts)에 선언된 셀렉터를 쓴다 — sitemap은
  // 대조 기준(reference)이라 visible을 exact로 담아야 한다.
  const posts = POST_SETS.visible();
  // KST 기준 오늘 날짜. `new Date().toISOString()`은 UTC라 KST 00:00~09:00 빌드 시
  // 하루 밀린 lastmod를 만들 수 있어 getKSTDateISO()를 사용한다.
  const today = getKSTDateISO();
  const sitemap = buildSitemapXml(posts, today);
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully!');
}
