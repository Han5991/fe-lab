import { SITE_URL } from '../../lib/shared/constants';
import { encodePostSlug } from './utils';

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
 * 3. **상대/절대를 나눈다.** 화면 링크·canonical은 상대(`postPath`), 피드·
 *    JSON-LD는 절대(`postUrl`)입니다. 절대 쪽은 siteUrl을 주입받습니다 —
 *    생성기들이 테스트 결정성을 위해 이미 그렇게 하고 있습니다.
 *
 * **클라이언트 컴포넌트에서는 이 파일을 leaf로 import하세요**
 * (`@/domain/post/urls`). 배럴(`@/domain/post`)은 `export * from './series'`로
 * 모듈 평가 시점에 `node:fs`를 당겨 오므로, 클라이언트 번들에 배럴을 값으로
 * import하면 빌드가 깨집니다. 서버 코드는 배럴로 가져와도 됩니다.
 */

/**
 * 글 아카이브 라우트. `lib/shared/constants.ts`의 `RSS_PATH`와 나란히 두고 싶어지지만
 * `/posts/`는 사이트 상수가 아니라 **라우트 모양**이고, 후행 슬래시 규칙을
 * `postPath`와 한 파일에서 공유해야 두 규칙이 갈리지 않아 여기 둔다.
 */
export const POSTS_PATH = '/posts/';

/** 글 상세의 사이트 내부 경로. `<Link href>`·canonical에 쓴다. */
export function postPath(slug: string): string {
  return `${POSTS_PATH}${encodePostSlug(slug)}/`;
}

/** 글 상세의 절대 URL. 피드·sitemap·JSON-LD처럼 origin이 필요한 곳에 쓴다. */
export function postUrl(slug: string, siteUrl: string = SITE_URL): string {
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
 * `${archiveUrl()}?q={search_term_string}`으로 직접 조합합니다.
 */
export function archiveUrl(siteUrl: string = SITE_URL): string {
  return `${siteUrl}${POSTS_PATH}`;
}
