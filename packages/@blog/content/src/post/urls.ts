import { encodePostSlug } from './utils.ts';

/**
 * 글 URL 조합의 **단일 출처**.
 *
 * 예전에는 `/posts/${encodePostSlug(slug)}/` 문자열을 24곳이 각자 조립했습니다.
 * `encodePostSlug`는 공유됐지만 "라우트 모양 + 후행 슬래시 + SITE_URL 결합"은
 * 공유되지 않아서, 실제로 세 곳이 어긋나 있었습니다 —
 * `generate-llms-full.ts`와 `/posts/`의 JSON-LD ItemList는 인코딩을 통째로
 * 빼먹었고(발행 글 slug가 전부 ASCII라 무증상이었을 뿐, `--slug` 없이
 * `new-post`를 쓰면 한글 파일명이 곧 slug가 되므로 언제든 재현된다),
 * `SearchDialog`의 `router.push`는 인코딩도 후행 슬래시도 없었습니다.
 *
 * 세 가지를 여기서만 결정합니다.
 *
 * 1. **입력은 디코드된 slug다.** `encodePostSlug('%20') === '%2520'`이므로
 *    (utils.test.ts가 잠금) 이미 인코딩된 값을 넘기면 이중 인코딩돼 링크가
 *    통째로 404가 됩니다. 라우트에서 오는 slug는 `posts/[...slug]/page.tsx`가
 *    `decodeURIComponent`로 먼저 풀어서 넘기고, Supabase에서 오는 slug는
 *    `post_views`에 저장된 원본(디코드 상태)입니다.
 * 2. **후행 슬래시는 여기서만 붙인다.** `next.config.ts`의 `trailingSlash: true`
 *    때문이고, 다른 곳에서 또 붙이면 한쪽만 고쳐졌을 때 링크가 갈립니다.
 *    붙인 슬래시가 HTML까지 살아남는 건 같은 파일의 `skipTrailingSlashRedirect`
 *    덕입니다 — 그게 없으면 next/link가 `.`이 든 slug(`turborepo-next.js-docker`)
 *    를 파일로 보고 도로 벗깁니다. 산출물은 check-seo `link-trailing-slash`가 봅니다.
 * 3. **상대/절대를 나눈다.** 화면 링크·canonical은 상대(`postPath`), 피드·
 *    JSON-LD는 절대(`postUrl`)입니다. 절대 쪽은 siteUrl을 **반드시** 주입받습니다
 *    — 설정의 origin과 갈라질 기본값을 두지 않기 위해서입니다.
 *
 * **클라이언트 컴포넌트에서는 이 모듈이 fs를 끌지 않는다는 점에 기대세요** —
 * `@blog/content` 배럴은 `export * from './series.ts'`로 모듈 평가 시점에 `node:fs`를
 * 당겨 오지만, 앱의 next.config가 `optimizePackageImports: ['@blog/content']`로
 * 배럴 import를 leaf로 좁혀 클라이언트 번들에 fs가 새지 않게 합니다. 서버 코드는
 * 배럴로 가져와도 됩니다.
 */

/**
 * 글 아카이브 라우트. `/posts/`는 사이트 상수가 아니라 **라우트 모양**이고,
 * 후행 슬래시 규칙을 `postPath`와 한 파일에서 공유해야 두 규칙이 갈리지 않아
 * 여기 둔다.
 */
export const POSTS_PATH = '/posts/';

/**
 * RSS 피드 경로. **설정이 아니라 상수다** — 피드를 만드는 것도, `public/`의 어느
 * 파일이 되는지 정하는 것도 패키지라(`scripts/render/generate-rss.ts`) 소비자가
 * 고를 수 있는 값이 아니다. `/llms-full.txt`와 같은 부류다.
 *
 * 예전에는 `site.rssPath` 설정 항목이었는데, 정작 생성기 셋(rss·llms·llms-full)이
 * `/rss.xml`을 리터럴로 박고 있어서 덮어도 아무 일이 없었다. 앱은 앱대로 같은
 * 리터럴을 따로 들고 `<link rel="alternate">`·히어로·푸터에 썼다 — 갈릴 수 있는
 * 사본이 셋이었다. 지금은 만드는 쪽이 경로도 소유하고 링크는 전부 여기서 온다.
 */
export const RSS_PATH = '/rss.xml';

/** 글 상세의 사이트 내부 경로. `<Link href>`·canonical에 쓴다. */
export function postPath(slug: string): string {
  return `${POSTS_PATH}${encodePostSlug(slug)}/`;
}

/**
 * 글 상세의 절대 URL. 피드·sitemap·JSON-LD처럼 origin이 필요한 곳에 쓴다.
 *
 * `siteUrl`은 인자다 — 기본값을 두면 그 값이 곧 특정 사이트의 하드코딩이고,
 * 실제로 예전에는 설정에서 origin을 덮어도 이 함수만 옛 값을 쓰고 있었다.
 */
export function postUrl(slug: string, siteUrl: string): string {
  return `${siteUrl}${postPath(slug)}`;
}

/** 아카이브 필터 — 없는 키는 쿼리에 넣지 않는다(빈 `?`가 생기지 않도록). */
export interface ArchiveFilters {
  tag?: string;
  series?: string;
  q?: string;
}

/**
 * 아카이브 경로. 필터를 주면 쿼리로 붙인다.
 *
 * 값 인코딩은 `URLSearchParams`가 아니라 `encodeURIComponent`를 씁니다 —
 * 전자는 공백을 `+`로, 후자는 `%20`으로 내보내서 결과가 다르고, 지금 나가는
 * 링크와 그걸 잠근 테스트(PostHeader.test.tsx의 `c%2B%2B%20%26%20rust`)는
 * 후자 형태입니다.
 */
export function archivePath(filters: ArchiveFilters = {}): string {
  const query = (Object.entries(filters) as [string, string | undefined][])
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${POSTS_PATH}?${query}` : POSTS_PATH;
}

/**
 * 아카이브의 절대 URL. JSON-LD `@id`·breadcrumb·sitemap의 아카이브 항목용.
 *
 * 쿼리를 받지 않습니다 — 절대 URL로 쿼리가 필요한 자리는 홈의 JSON-LD
 * SearchAction 하나뿐인데, 거기 들어가는 `{search_term_string}`은 Google이
 * 치환하는 **템플릿 플레이스홀더**라 인코딩되면 안 됩니다. 그 한 곳만
 * `${archiveUrl(siteUrl)}?q={search_term_string}`으로 직접 조합합니다.
 */
export function archiveUrl(siteUrl: string): string {
  return `${siteUrl}${POSTS_PATH}`;
}
