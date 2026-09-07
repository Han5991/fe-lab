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
export const HOME_PATH = '/';
export const ABOUT_PATH = '/about/';
export const SERIES_PATH = '/series/';
export const PRIVACY_PATH = '/privacy/';
