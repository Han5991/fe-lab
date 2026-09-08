/**
 * 이 앱이 소유한 라우트 경로의 **단일 출처**.
 *
 * `apps/blog/web/src/shared/routes.ts`와 같은 역할이다. 글·아카이브·RSS 경로는
 * 여기 없다 — 그건 패키지가 소유한 라우트 모양이라 `@blog/content`의
 * `postPath`·`archivePath`·`RSS_PATH`가 단일 출처다.
 *
 * 화면·설정에 경로 리터럴을 직접 적지 말 것. `content.values.mts`(→
 * `@blog/site-values`)가 sitemap 배선용 사본을 따로 드는 이유는 그 모듈이 값
 * import 금지라서이고, 어긋남은 계약 테스트가 잠근다.
 */
import { encodePostSlug } from '@blog/content/client';

export const HOME_PATH = '/';
export const ABOUT_PATH = '/about/';
export const SERIES_PATH = '/series/';
export const PRIVACY_PATH = '/privacy/';

/** Admin 대시보드. 정적 export지만 데이터는 전부 브라우저에서 받는다. */
export const ADMIN_PATH = '/admin/';
export const ADMIN_ANALYTICS_PATH = '/admin/analytics/';
export const ADMIN_LOGIN_PATH = '/admin/login/';
/** 잘못된 계정으로 들어왔을 때 — 로그인 화면이 안내 문구를 띄운다. */
export const ADMIN_LOGIN_UNAUTHORIZED_PATH = '/admin/login/?error=unauthorized';

/**
 * 글 하나의 admin 통계 경로.
 *
 * **인코딩 규칙은 `postPath`와 같다** — `encodePostSlug`가 세그먼트별로
 * encodeURIComponent하고 `/`는 남긴다. 날것으로 이어 붙이면 frontmatter `slug:`
 * 없이 폴더 경로로 폴백된 글(`시리즈/파일명`)이나 한글 slug가 인코딩 없이
 * 나간다. React 판이 같은 이유로 같은 헬퍼를 갖고 있고(`adminAnalyticsPostPath`),
 * 이 저장소의 `pnpm new-post`는 한글 slug를 실제로 만든다.
 */
export const adminAnalyticsPostPath = (slug: string): string =>
  `${ADMIN_ANALYTICS_PATH}${encodePostSlug(slug)}/`;

/** 로그인 화면 자신은 가드를 지나지 않는다(무한 리다이렉트 방지). */
export const isAdminLoginPath = (pathname: string): boolean =>
  pathname.replace(/\/*$/, '/') === ADMIN_LOGIN_PATH;
