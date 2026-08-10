import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  SITE_URL,
  SITE_NAME,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
} from '../lib/constants';

/**
 * 빌드 산출물(`out/`)의 HTML을 파싱해 SEO 계약을 검사합니다.
 *
 * `lint:posts`는 **원문**(frontmatter/마크다운)을 보고, 이 스크립트는 **최종 HTML**을
 * 봅니다. 둘은 서로를 대신하지 못합니다 — 2026-08 감사에서 나온 문제들(h1 2개,
 * description 완전 중복, og:site_name 두 종류, og:locale 누락)은 전부 원문이 아니라
 * 렌더 결과에서만 보이는 것이었습니다.
 *
 * 사용: `pnpm build` 이후 `npx tsx scripts/check-seo.ts`
 *       (검사 대상 디렉토리를 인자로 줄 수 있습니다: `... scripts/check-seo.ts out`)
 */

export interface SeoViolation {
  page: string;
  rule: string;
  message: string;
}

/** `<title>`, meta, link 등 검사에 필요한 것만 추린 페이지 정보 */
export interface PageSeo {
  title: string | null;
  description: string | null;
  canonical: string | null;
  ogSiteName: string | null;
  ogLocale: string | null;
  ogType: string | null;
  h1Count: number;
  imagesMissingAlt: number;
  robotsNoindex: boolean;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** `<meta name|property="x" content="y">` — 속성 순서가 뒤바뀌어도 잡도록 두 방향 모두 검사 */
function metaContent(html: string, key: string): string | null {
  const attr = `(?:name|property)="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`;
  const forward = new RegExp(`<meta[^>]*${attr}[^>]*\\scontent="([^"]*)"`, 'i');
  const backward = new RegExp(
    `<meta[^>]*\\scontent="([^"]*)"[^>]*${attr}`,
    'i',
  );
  const m = html.match(forward) ?? html.match(backward);
  return m ? decodeEntities(m[1]) : null;
}

/**
 * `<body>` 안의 h1 개수. `<head>`의 JSON-LD 문자열에 들어 있는 "h1"(speakable의
 * cssSelector)을 세지 않도록 body만 잘라서 봅니다.
 */
function countH1(html: string): number {
  const bodyStart = html.search(/<body[^>]*>/i);
  const body = bodyStart >= 0 ? html.slice(bodyStart) : html;
  return (body.match(/<h1[\s>]/gi) ?? []).length;
}

/**
 * `<img …>` — 따옴표 안의 `>`(예: `alt="22분 > 8분"`)에서 끊기지 않도록
 * 속성 값을 통째로 건너뜁니다.
 */
const HTML_IMAGE = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

/**
 * alt 속성이 **아예 없는** `<img>` 개수.
 *
 * `alt=""`는 세지 않습니다 — 장식용 이미지의 올바른 마크업입니다. 실제로 홈의
 * FeaturedPost는 제목 바로 옆에 놓인 썸네일이라 의도적으로 `alt=""`를 씁니다.
 * 이걸 위반으로 잡으면 손수 썸네일을 지정한 글이 최신 글이 되는 순간, 글쓴이가
 * frontmatter로는 고칠 수도 없는 이유로 배포가 막힙니다.
 *
 * 마크다운의 `![](…)`(빈 alt)는 거의 항상 실수라 `lint:posts`가 원문에서 따로
 * 잡습니다 — 로컬이 더 엄격한 건 안전한 방향입니다(그 반대가 문제).
 */
function countImagesMissingAlt(html: string): number {
  const imgs = html.match(HTML_IMAGE) ?? [];
  return imgs.filter(tag => !/\salt\s*=/i.test(tag)).length;
}

export function parsePageSeo(html: string): PageSeo {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalMatch =
    html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) ??
    html.match(/<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i);
  const robots = metaContent(html, 'robots');
  return {
    title: titleMatch ? decodeEntities(titleMatch[1]).trim() : null,
    description: metaContent(html, 'description'),
    canonical: canonicalMatch ? decodeEntities(canonicalMatch[1]) : null,
    ogSiteName: metaContent(html, 'og:site_name'),
    ogLocale: metaContent(html, 'og:locale'),
    ogType: metaContent(html, 'og:type'),
    h1Count: countH1(html),
    imagesMissingAlt: countImagesMissingAlt(html),
    robotsNoindex: Boolean(robots && /noindex/i.test(robots)),
  };
}

/** `out/` 안의 페이지 경로(`/posts/foo/`) → HTML */
export function collectPages(outDir: string): Map<string, string> {
  const pages = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === 'index.html') {
        const rel = relative(outDir, full).split(sep).slice(0, -1).join('/');
        pages.set(rel ? `/${rel}/` : '/', readFileSync(full, 'utf8'));
      }
    }
  };
  walk(outDir);
  return pages;
}

/**
 * 퍼센트 인코딩을 풀어 URL 비교의 기준을 하나로 맞춥니다.
 * 인코딩이 깨진 문자열(`%`가 홀로 있는 경우 등)은 디코드가 던지므로 원문을 씁니다.
 */
function decodeUrlSafe(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

/**
 * 각 산출물에서 **글 목록에 해당하는 자리**의 URL만 뽑아 포스트 URL로 좁힙니다.
 *
 * 문서 전체에서 정규식으로 긁으면 RSS `content:encoded`의 본문 링크와 이미지 경로
 * (`/posts/feconf/img/…`)까지 딸려 와 "rss에만 있는 글"로 오탐합니다. 그래서
 * 형식마다 목록 위치를 지정해서 읽습니다 — sitemap은 `<loc>`, rss는 `<guid>`,
 * llms.txt는 마크다운 링크의 URL.
 */
function extractPostUrls(text: string, pattern: RegExp): Set<string> {
  const postPrefix = `${SITE_URL}/posts/`;
  return new Set(
    [...text.matchAll(pattern)]
      .map(m => decodeUrlSafe(m[1].trim()))
      // `/posts/` 자체는 아카이브 목록 페이지지 글이 아니다 — sitemap에만 있는 게 정상.
      .filter(url => url.startsWith(postPrefix) && url !== postPrefix),
  );
}

const SITEMAP_LOC = /<loc>([^<]+)<\/loc>/g;
const RSS_GUID = /<guid[^>]*>([^<]+)<\/guid>/g;
const LLMS_LINK = /\]\((https?:\/\/[^)\s]+)\)/g;

export function checkPages(pages: Map<string, string>): SeoViolation[] {
  const violations: SeoViolation[] = [];
  const descriptions = new Map<string, string[]>();
  const siteNames = new Set<string>();

  for (const [page, html] of pages) {
    const seo = parsePageSeo(html);
    const add = (rule: string, message: string) =>
      violations.push({ page, rule, message });

    // noindex 페이지(개인정보처리방침, preview 플레이스홀더)는 검색 대상이 아니다.
    if (seo.robotsNoindex) continue;

    if (seo.h1Count !== 1) {
      add('h1-count', `h1이 ${seo.h1Count}개입니다 (정확히 1개여야 합니다)`);
    }

    if (!seo.title) {
      add('missing-title', '<title>이 없습니다');
    } else if (seo.title.length > SEO_TITLE_MAX_LENGTH) {
      add(
        'title-length',
        `<title>이 ${seo.title.length}자입니다 (${SEO_TITLE_MAX_LENGTH}자 이하): ${seo.title}`,
      );
    }

    if (!seo.description) {
      add('missing-description', 'meta description이 없습니다');
    } else {
      if (seo.description.endsWith('...') || seo.description.endsWith('…')) {
        add(
          'truncated-description',
          'description이 말줄임으로 끝납니다 — 본문 자동 발췌가 그대로 나갔습니다. frontmatter에 excerpt를 적어주세요',
        );
      }
      if (
        seo.description.length < SEO_DESCRIPTION_MIN_LENGTH ||
        seo.description.length > SEO_DESCRIPTION_MAX_LENGTH
      ) {
        add(
          'description-length',
          `description이 ${seo.description.length}자입니다 (${SEO_DESCRIPTION_MIN_LENGTH}~${SEO_DESCRIPTION_MAX_LENGTH}자)`,
        );
      }
      const arr = descriptions.get(seo.description) ?? [];
      arr.push(page);
      descriptions.set(seo.description, arr);
    }

    // canonical은 퍼센트 인코딩된 URL(`/posts/%ED%95%9C%EA%B8%80/`)이고, page는
    // 디스크의 디렉토리 이름 그대로(`/posts/한글/`)다. 디코드해서 비교하지 않으면
    // 한글 slug 글이 하나 생기는 순간 canonical-mismatch로 잡혀 배포가 막힌다 —
    // `--slug` 없이 `new-post`를 쓰면 한글 파일명이 곧 slug가 되므로 흔한 경로다.
    if (!seo.canonical) {
      add('missing-canonical', 'canonical이 없습니다');
    } else if (
      decodeUrlSafe(seo.canonical) !== decodeUrlSafe(`${SITE_URL}${page}`)
    ) {
      add(
        'canonical-mismatch',
        `canonical이 자기 URL과 다릅니다: ${seo.canonical} ≠ ${SITE_URL}${page}`,
      );
    }

    if (!seo.ogSiteName) add('missing-og-site-name', 'og:site_name이 없습니다');
    else siteNames.add(seo.ogSiteName);

    if (!seo.ogLocale) add('missing-og-locale', 'og:locale이 없습니다');
    if (!seo.ogType) add('missing-og-type', 'og:type이 없습니다');

    if (seo.imagesMissingAlt > 0) {
      add(
        'missing-img-alt',
        `alt 없는 <img>가 ${seo.imagesMissingAlt}개입니다`,
      );
    }
  }

  // 도입부가 비슷한 글끼리 description이 글자 단위로 겹치면 중복 콘텐츠 신호가 된다.
  for (const [description, slugs] of descriptions) {
    if (slugs.length < 2) continue;
    violations.push({
      page: slugs.join(', '),
      rule: 'duplicate-description',
      message: `description이 완전히 같습니다: "${description.slice(0, 40)}…"`,
    });
  }

  if (siteNames.size > 1) {
    violations.push({
      page: '(전체)',
      rule: 'inconsistent-og-site-name',
      message: `og:site_name이 ${siteNames.size}종류입니다: ${[...siteNames].join(' / ')} (기대값: ${SITE_NAME})`,
    });
  }

  return violations;
}

/** sitemap ↔ rss ↔ llms.txt의 포스트 집합이 어긋나지 않는지 */
export function checkFeeds(
  sitemap: string,
  rss: string,
  llms: string,
): SeoViolation[] {
  const violations: SeoViolation[] = [];
  const inSitemap = extractPostUrls(sitemap, SITEMAP_LOC);
  const inRss = extractPostUrls(rss, RSS_GUID);
  const inLlms = extractPostUrls(llms, LLMS_LINK);

  const diff = (a: Set<string>, b: Set<string>) =>
    [...a].filter(url => !b.has(url));

  for (const [name, set] of [
    ['rss.xml', inRss],
    ['llms.txt', inLlms],
  ] as const) {
    const missing = diff(inSitemap, set);
    const extra = diff(set, inSitemap);
    if (missing.length) {
      violations.push({
        page: name,
        rule: 'feed-missing-posts',
        message: `sitemap에 있는데 ${name}에 없는 글 ${missing.length}편: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ' …' : ''}`,
      });
    }
    if (extra.length) {
      violations.push({
        page: name,
        rule: 'feed-extra-posts',
        message: `${name}에만 있는 글 ${extra.length}편: ${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ' …' : ''}`,
      });
    }
  }

  return violations;
}

function main() {
  // resolve: 절대 경로 인자를 그대로 받는다. join이면 cwd 뒤에 이어 붙어
  // `/home/user/proj//abs/path` 같은 없는 경로가 되고 "빌드 산출물이 없습니다"로 오인된다.
  const outDir = resolve(process.cwd(), process.argv[2] ?? 'out');
  if (!existsSync(outDir)) {
    console.error(
      `✖ 빌드 산출물이 없습니다: ${outDir}\n  먼저 \`pnpm build\`를 실행하세요.`,
    );
    process.exit(1);
  }

  const pages = collectPages(outDir);
  const violations = checkPages(pages);

  const read = (name: string) => {
    const path = join(outDir, name);
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  };
  const sitemap = read('sitemap.xml');
  const rss = read('rss.xml');
  const llms = read('llms.txt');
  for (const [name, text] of [
    ['sitemap.xml', sitemap],
    ['rss.xml', rss],
    ['llms.txt', llms],
  ] as const) {
    if (!text) {
      violations.push({
        page: name,
        rule: 'missing-artifact',
        message: `${name}이 산출물에 없습니다`,
      });
    }
  }
  if (sitemap && rss && llms) {
    violations.push(...checkFeeds(sitemap, rss, llms));
  }

  if (violations.length === 0) {
    console.log(`✓ ${pages.size}개 페이지 SEO 검사 통과`);
    process.exit(0);
  }

  console.error(
    `\nSEO 검사 실패: ${pages.size}개 페이지, 위반 ${violations.length}건\n`,
  );
  const grouped = new Map<string, SeoViolation[]>();
  for (const v of violations) {
    const arr = grouped.get(v.page) ?? [];
    arr.push(v);
    grouped.set(v.page, arr);
  }
  for (const [page, items] of grouped) {
    console.error(page);
    for (const v of items) console.error(`  ✖ [${v.rule}] ${v.message}`);
    console.error('');
  }
  process.exit(1);
}

// 스크립트로 직접 실행될 때만 main()을 호출합니다.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
