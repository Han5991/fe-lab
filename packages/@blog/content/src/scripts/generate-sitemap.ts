import fs from 'node:fs';
import path from 'node:path';
import type {
  SiteConfig,
  SitemapConfig,
  TimezoneConfig,
} from '../shared/contentConfig.ts';
import { parseScheduledDateKST, getKSTDateISO } from '../shared/dates.ts';
import { archiveUrl, postUrl, type PostSummary } from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
import type { ContentContext } from './context.ts';

/**
 * 고가치 주제의 글은 우선순위를 높게 설정. 목록은 **언제나 인자로 온다**
 * (기본값 없음) — 어떤 주제가 중요한지는 그 사이트의 편집 판단이고, 패키지가
 * 기본 목록을 들면 남의 사이트 글 slug가 여기 남는다. 소유자는 앱의
 * `content.values.mts`(`SITEMAP_PRIORITY`)다.
 *
 * **시리즈가 아니라 폴더 기준이다.** 이 저장소의 `typescript` 폴더에는
 * `_series.yml`이 없어서 시리즈가 아니고, `post.series`로 비교하면 그 글의
 * 우선순위가 조용히 0.6으로 떨어진다. 우선순위는 "이 주제가 중요한가"의
 * 문제라 연재 여부와 무관하므로, 물리적 폴더(`relativeDir`)를 본다.
 */
export function getPostPriority(
  post: {
    slug: string;
    relativeDir?: string;
  },
  sitemap: SitemapConfig,
): string {
  if (sitemap.highPrioritySlugs.includes(post.slug)) return '0.8';
  if (
    post.relativeDir &&
    sitemap.highPriorityFolders.includes(post.relativeDir)
  ) {
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
 * getKSTDateISO()는 설정 타임존 기준 달력 날짜를 정확히 반환합니다.
 */
function resolvePostLastmod(
  post: SitemapPost,
  fallback: string,
  timezone: TimezoneConfig,
): string {
  return post.updatedAt
    ? getKSTDateISO(timezone, parseScheduledDateKST(timezone, post.updatedAt))
    : post.date
      ? getKSTDateISO(timezone, parseScheduledDateKST(timezone, post.date))
      : fallback;
}

/**
 * sitemap.xml 본문을 생성합니다. (정적 페이지 + 포스트 목록)
 * `today`/`siteUrl`을 주입받아 결정성을 확보합니다 (테스트에서 재현 가능하도록).
 *
 * **언제나 나가는 정적 URL은 `/`와 `/posts/` 둘뿐입니다** — 패키지가 소유한 라우트
 * 모양(`post/urls.ts`의 `POSTS_PATH`)이라 어떤 사이트에서도 같기 때문입니다. 그
 * 사이트에만 있는 페이지(`/about/` 같은)는 `sitemap.staticPages`로 소비자가
 * 선언합니다 — 예전에는 `/about/`이 이 XML에 리터럴로 박혀 있어서, about 페이지가
 * 없는 소비자도 없는 URL을 색인에 내보냈습니다.
 *
 * 정적 URL의 lastmod는 빌드 날짜가 아니라 **가장 최근 글의 날짜**입니다. 매일 cron으로
 * 빌드되는 사이트에서 빌드 날짜를 넣으면 콘텐츠가 그대로인 날에도 lastmod가 전진하고,
 * Google은 그런 사이트의 lastmod 신호를 통째로 무시합니다. 글이 아니라 자동으로 알 수
 * 있는 수정 시각이 없는 페이지는 `staticPages`의 `lastmod`로 값을 직접 줍니다 —
 * 비워 두면 그 URL만 신호가 없는 상태가 됩니다.
 */
export function buildSitemapXml(
  posts: SitemapPost[],
  today: string,
  site: Pick<SiteConfig, 'url'>,
  timezone: TimezoneConfig,
  sitemap: SitemapConfig,
): string {
  const siteUrl = site.url;
  const entries = posts.map(post => ({
    post,
    lastmod: resolvePostLastmod(post, today, timezone),
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
  </url>${sitemap.staticPages
    .map(
      page => `
  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${page.lastmod ?? latestContentDate}</lastmod>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join('')}
  ${entries
    .map(
      ({ post, lastmod }) => `
  <url>
    <loc>${postUrl(post.slug, siteUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <priority>${getPostPriority(post, sitemap)}</priority>
  </url>`,
    )
    .join('')}
</urlset>`;
}

export function main(ctx: ContentContext) {
  const publicDir = ctx.content.paths.publicDir;
  // 글 집합은 레지스트리(artifacts.ts)에 선언된 셀렉터를 쓴다 — sitemap은
  // 대조 기준(reference)이라 visible을 exact로 담아야 한다.
  const posts = resolvePostSet(ctx.content, 'visible');
  // KST 기준 오늘 날짜. `new Date().toISOString()`은 UTC라 KST 00:00~09:00 빌드 시
  // 하루 밀린 lastmod를 만들 수 있어 getKSTDateISO()를 사용한다.
  const today = getKSTDateISO(ctx.content.config.timezone);
  const sitemap = buildSitemapXml(
    posts,
    today,
    ctx.content.config.site,
    ctx.content.config.timezone,
    ctx.content.config.sitemap,
  );
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log('Sitemap generated successfully!');
}
