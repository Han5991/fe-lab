import { encodePostSlug } from './utils.ts';

/**
 * 글 URL 조합의 **단일 출처**. 라우트 모양·인코딩·후행 슬래시·origin 결합을
 * 여기서만 정한다.
 *
 * 규칙은 전부 `urls.test.ts`가 잠근다 — 이 파일에 규칙을 글로 옮겨 적지 않는다.
 * 여기 남는 것은 **테스트가 말할 수 없는 것**뿐이다: 왜 뻔한 대안을 쓰지
 * 않았는가.
 */

/** 글 아카이브 라우트. 후행 슬래시 규칙을 `postPath`와 한 파일에서 공유한다. */
export const POSTS_PATH = '/posts/';

/**
 * RSS 피드 경로.
 *
 * **설정 항목이 아니라 상수다.** 예전에는 `site.rssPath`였는데 생성기 셋이
 * `/rss.xml`을 리터럴로 박고 있어 덮어도 아무 일이 없었다. 피드를 만드는 것도
 * 파일 이름을 정하는 것도 패키지라, 소비자가 고를 수 있는 값이 아니다.
 */
export const RSS_PATH = '/rss.xml';

/**
 * 글 상세의 사이트 내부 경로.
 *
 * **디코드된 slug를 받는다.** 이미 인코딩된 값을 넘기면 이중 인코딩된다
 * (`encodePostSlug('%20') === '%2520'`). 라우트에서 오는 값은 먼저
 * `decodeURIComponent`로 풀어서 넘길 것.
 */
export function postPath(slug: string): string {
  return `${POSTS_PATH}${encodePostSlug(slug)}/`;
}

/** 글 상세의 절대 URL. 피드·sitemap·JSON-LD처럼 origin이 필요한 곳에 쓴다. */
export function postUrl(slug: string, siteUrl: string): string {
  return `${siteUrl}${postPath(slug)}`;
}

/** 아카이브 필터 — 없는 키는 쿼리에 넣지 않는다. */
export interface ArchiveFilters {
  tag?: string;
  series?: string;
  q?: string;
}

/**
 * 아카이브 경로. 필터를 주면 쿼리로 붙인다.
 *
 * 값 인코딩에 `URLSearchParams`를 쓰지 않는다 — 그쪽은 공백을 `+`로 내보내
 * 지금 배포된 링크와 갈린다.
 */
export function archivePath(filters: ArchiveFilters = {}): string {
  const query = (Object.entries(filters) as [string, string | undefined][])
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${POSTS_PATH}?${query}` : POSTS_PATH;
}

/**
 * 아카이브의 절대 URL.
 *
 * **쿼리를 받지 않는다.** 절대 URL에 쿼리가 필요한 자리는 홈 JSON-LD의
 * SearchAction 하나뿐인데, 거기 들어가는 `{search_term_string}`은 Google이
 * 치환하는 템플릿 플레이스홀더라 인코딩되면 안 된다. 그 한 곳만 직접 조합한다.
 */
export function archiveUrl(siteUrl: string): string {
  return `${siteUrl}${POSTS_PATH}`;
}
