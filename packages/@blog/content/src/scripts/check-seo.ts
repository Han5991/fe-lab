import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { SITE_URL, SITE_NAME } from '../shared/constants.ts';
import { CONTENT } from '../shared/contentConfig.ts';
import { decodeUrlSafe } from '../shared/url.ts';
import { CONTENT_PATHS } from '../shared/contentPaths.ts';

// SEO 임계값은 설정 표면에서 — validate-posts --strict와 같은 출처를 본다.
const {
  titleMaxLength: SEO_TITLE_MAX_LENGTH,
  descriptionMinLength: SEO_DESCRIPTION_MIN_LENGTH,
  descriptionMaxLength: SEO_DESCRIPTION_MAX_LENGTH,
} = CONTENT.seo;
import { ARTIFACTS, type ArtifactRelation } from './artifacts.ts';

/**
 * 빌드 산출물(`out/`)의 HTML을 파싱해 SEO 계약을 검사합니다.
 *
 * `lint:posts`는 **원문**(frontmatter/마크다운)을 보고, 이 스크립트는 **최종 HTML**을
 * 봅니다. 둘은 서로를 대신하지 못합니다 — 2026-08 감사에서 나온 문제들(h1 2개,
 * description 완전 중복, og:site_name 두 종류, og:locale 누락)은 전부 원문이 아니라
 * 렌더 결과에서만 보이는 것이었습니다.
 *
 * HTML 페이지 검사 외에, 파생 산출물(sitemap·rss·llms·검색 인덱스·og 이미지)의
 * 글 집합 정합성은 `scripts/artifacts.ts`의 레지스트리를 **순회**하며 검사합니다
 * — 산출물이 늘면 레지스트리에 항목을 더하는 것으로 검사가 자동으로 붙습니다.
 *
 * 사용: `pnpm build` 이후 `blog-content check-seo`
 *       (검사 대상 디렉토리를 인자로 줄 수 있습니다: `blog-content check-seo out`)
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
  // 두 패턴 모두 1번 캡처 그룹이 매치에 항상 참여한다.
  const content = (html.match(forward) ?? html.match(backward))?.[1];
  return content === undefined ? null : decodeEntities(content);
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

/**
 * `<a href="/…">` — 사이트 내부 링크의 href. 절대 URL(`https://`)·프로토콜
 * 상대(`//`)·해시·mailto는 제외한다. `&amp;`만 풀면 된다 — href 안에서 실제로
 * 이스케이프되는 문자는 그것뿐이다(`archivePath`의 `?tag=a&series=b`).
 */
const HTML_ANCHOR = /<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
export function collectInternalLinks(html: string): string[] {
  const links: string[] = [];
  for (const tag of html.match(HTML_ANCHOR) ?? []) {
    // 패턴의 1번 캡처 그룹은 매치에 항상 참여한다.
    const raw = tag.match(/\shref="([^"]*)"/i)?.[1];
    if (raw === undefined) continue;
    const href = raw.replace(/&amp;/g, '&');
    if (href.startsWith('/') && !href.startsWith('//')) links.push(href);
  }
  return links;
}

export function parsePageSeo(html: string): PageSeo {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalMatch =
    html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i) ??
    html.match(/<link[^>]*href="([^"]*)"[^>]*rel="canonical"/i);
  const robots = metaContent(html, 'robots');
  // 두 패턴 모두 1번 캡처 그룹은 매치에 항상 참여한다.
  const rawTitle = titleMatch?.[1];
  const rawCanonical = canonicalMatch?.[1];
  return {
    title: rawTitle === undefined ? null : decodeEntities(rawTitle).trim(),
    description: metaContent(html, 'description'),
    canonical: rawCanonical === undefined ? null : decodeEntities(rawCanonical),
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

export function checkPages(pages: Map<string, string>): SeoViolation[] {
  const violations: SeoViolation[] = [];
  const descriptions = new Map<string, string[]>();

  for (const [page, html] of pages) {
    const seo = parsePageSeo(html);
    const add = (rule: string, message: string) =>
      violations.push({ page, rule, message });

    // 내부 링크의 후행 슬래시. `trailingSlash: true` 사이트라 페이지 URL은 전부
    // `/…/`인데, next/link는 마지막 세그먼트에 `.`이 있는 경로를 파일로 보고
    // 슬래시를 벗긴다(next.config.ts의 skipTrailingSlashRedirect 주석). 실제로
    // `/posts/turborepo-next.js-docker`가 그렇게 3개 페이지에 나갔다 — 클릭마다
    // 301을 한 번 더 타고, export 모드 클라이언트 라우터는 `….txt`를 못 찾아
    // MPA 폴백으로 떨어진다. "링크 경로 + `/`"가 실제 페이지로 존재할 때만
    // 잡는다 — `/rss.xml` 같은 파일 링크는 페이지가 아니라 통과한다.
    // noindex 페이지도 본다(내비게이션 문제이지 색인 문제가 아니다).
    for (const href of collectInternalLinks(html)) {
      // split은 항상 1개 이상을 돌려준다.
      const path = href.split(/[?#]/)[0] ?? href;
      if (path.endsWith('/')) continue;
      // page 키는 디스크 이름(디코드), href는 퍼센트 인코딩 — canonical과 같은 이유로 풀어 비교
      if (!pages.has(`${decodeUrlSafe(path)}/`)) continue;
      add(
        'link-trailing-slash',
        `내부 링크에 후행 슬래시가 없습니다: ${href} (페이지는 ${path}/ 에 있습니다)`,
      );
    }

    // noindex 페이지(admin, 개인정보처리방침)는 검색 대상이 아니다.
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

    // 기대값(SITE_NAME)과 직접 비교한다. 페이지끼리만 비교하면, 모든 페이지가
    // 같은 상수를 쓰게 된 지금은 규칙이 영영 발동하지 않는다 — 나중에 누가
    // 상수를 안 쓰고 문자열을 박아도 "다 같으니 통과"가 되어 버린다.
    if (!seo.ogSiteName) {
      add('missing-og-site-name', 'og:site_name이 없습니다');
    } else {
      if (seo.ogSiteName !== SITE_NAME) {
        add(
          'unexpected-og-site-name',
          `og:site_name이 사이트 이름과 다릅니다: ${seo.ogSiteName} ≠ ${SITE_NAME}`,
        );
      }
    }

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

  return violations;
}

/** 레지스트리 항목 하나를 out/에서 읽어 온 결과. `urls: null` = 산출물이 없음 */
export interface CollectedArtifact {
  name: string;
  relation: ArtifactRelation;
  reference?: boolean | undefined;
  urls: Set<string> | null;
}

/** dir 산출물용: 하위 파일들의 상대 경로('/' 구분, Windows sep 정규화) */
function listFilesRecursive(dir: string): string[] {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(relative(dir, full).split(sep).join('/'));
    }
  };
  walk(dir);
  return files;
}

/** ARTIFACTS 레지스트리를 순회하며 각 산출물의 글 URL 집합을 수집합니다. */
export function collectArtifacts(outDir: string): CollectedArtifact[] {
  return ARTIFACTS.map(spec => {
    const target = join(outDir, spec.path);
    const urls = !existsSync(target)
      ? null
      : spec.kind === 'file'
        ? spec.extractUrls(readFileSync(target, 'utf8'))
        : spec.extractUrls(listFilesRecursive(target));
    return {
      name: spec.name,
      relation: spec.relation,
      reference: spec.reference,
      urls,
    };
  });
}

/**
 * 산출물 간 글 집합 정합성 검사.
 *
 * reference(sitemap)의 집합을 기준으로 각 산출물을 `relation`에 따라 대조합니다:
 * exact는 missing+extra 모두, subset은 extra만(덜 담는 게 정상 — og 이미지),
 * superset은 missing만(더 담는 게 정상 — admin 인덱스) 위반으로 봅니다.
 *
 * URL 정규화에서 후행 슬래시는 다루지 않습니다(디코드만) — 한쪽이 슬래시를
 * 빠뜨리면 missing+extra가 동시에 뜨는데, 그건 감출 오탐이 아니라 실제 링크
 * 불일치입니다.
 */
export function checkArtifacts(collected: CollectedArtifact[]): SeoViolation[] {
  const violations: SeoViolation[] = [];
  for (const artifact of collected) {
    if (artifact.urls === null) {
      violations.push({
        page: artifact.name,
        rule: 'missing-artifact',
        message: `${artifact.name}이 산출물에 없습니다`,
      });
    }
  }

  const ref = collected.find(artifact => artifact.reference);
  // 기준이 없으면 대조 자체가 성립하지 않는다 — missing-artifact만 보고하고
  // 끝낸다(기준 부재를 다른 산출물들의 missing-posts 수십 건으로 둔갑시키지 않기).
  if (!ref?.urls) return violations;
  const refUrls = ref.urls;

  const diff = (a: Set<string>, b: Set<string>) =>
    [...a].filter(url => !b.has(url));

  for (const artifact of collected) {
    if (artifact.reference || artifact.urls === null) continue;
    const missing =
      artifact.relation === 'subset' ? [] : diff(refUrls, artifact.urls);
    const extra =
      artifact.relation === 'superset' ? [] : diff(artifact.urls, refUrls);
    if (missing.length) {
      violations.push({
        page: artifact.name,
        rule: 'artifact-missing-posts',
        message: `${ref.name}에 있는데 ${artifact.name}에 없는 글 ${missing.length}편: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ' …' : ''}`,
      });
    }
    if (extra.length) {
      violations.push({
        page: artifact.name,
        rule: 'artifact-extra-posts',
        message: `${artifact.name}에만 있는 글 ${extra.length}편: ${extra.slice(0, 3).join(', ')}${extra.length > 3 ? ' …' : ''}`,
      });
    }
  }

  return violations;
}

export function main(argv: string[]) {
  // 인자를 주면 그 경로를(cwd 기준, resolve라 절대 경로 인자도 그대로 받는다),
  // 없으면 설정의 out 디렉터리를 검사한다.
  const target = argv[0];
  const outDir = target ? resolve(process.cwd(), target) : CONTENT_PATHS.outDir;
  if (!existsSync(outDir)) {
    console.error(
      `✖ 빌드 산출물이 없습니다: ${outDir}\n  먼저 \`pnpm build\`를 실행하세요.`,
    );
    process.exit(1);
  }

  const pages = collectPages(outDir);
  // 라우트 HTML이 하나도 없으면 "위반 0건"이 아니라 **검사를 못 한 것**이다.
  // sitemap/rss/llms는 public/에서 복사되므로 그것만 보고 통과시키면, 페이지가
  // 통째로 안 만들어진 빌드가 조용히 배포된다.
  if (pages.size === 0) {
    console.error(
      `✖ ${outDir} 에 index.html이 하나도 없습니다 — 빌드가 페이지를 만들지 못했습니다.`,
    );
    process.exit(1);
  }
  const violations = checkPages(pages);
  // 파생 산출물은 레지스트리 순회로 — 없으면 missing-artifact, 있으면 글 집합 대조.
  violations.push(...checkArtifacts(collectArtifacts(outDir)));

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
