import { encodePostSlug } from '@blog/content';

/** admin 통계 목록(`/admin/analytics/`). 후행 슬래시는 next.config의 trailingSlash 계약. */
export const ADMIN_ANALYTICS_PATH = '/admin/analytics/';

/**
 * 글 하나의 admin 통계 상세 경로.
 *
 * 라우트(`[...slug]`)가 공개 글 상세(`posts/[...slug]`)와 같은 catch-all이므로
 * 인코딩 규칙도 `postPath`와 같다 — `encodePostSlug`가 세그먼트별로
 * encodeURIComponent하고 `/`는 남긴다. 예전엔 `post.slug`를 날것으로 넣어서,
 * frontmatter `slug:` 없이 폴더 경로로 폴백된 `시리즈/파일명` 글은 단일 `[slug]`
 * 라우트와 맞지 않아 404였고 한글 slug는 인코딩 없이 나갔다. 라우트 쪽 디코드는
 * `[...slug]/slugFromParams.ts` — 둘의 왕복은 adminAnalyticsPath.test.ts가 잠근다.
 */
export function adminAnalyticsPostPath(slug: string): string {
  return `${ADMIN_ANALYTICS_PATH}${encodePostSlug(slug)}/`;
}
