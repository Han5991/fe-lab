/**
 * 블로그 사이트 전역 상수 — **호환 재수출**.
 *
 * 기존 import 경로를 유지하는 얇은 façade다. 재수출 대상은 **값-only 모듈**
 * (`contentValues.ts`)뿐이다 — `contentConfig.ts`(defineContent)를 거치면
 * 상수 하나를 import해도 설정 객체 전체(og 팔레트·llms 산문·경로)가
 * 클라이언트 번들에 실리므로, 이 파일은 절대 contentConfig를 import하지
 * 않는다. 값을 바꾸려면(그리고 각 값의 사연은) contentValues.ts를 볼 것.
 */
export {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_EXPANDED,
  OG_DEFAULT_IMAGE,
  TITLE_SUFFIX,
  SEO_TITLE_MAX_LENGTH,
  SEO_DESCRIPTION_MIN_LENGTH,
  SEO_DESCRIPTION_MAX_LENGTH,
  ABOUT_PAGE_MODIFIED,
  SITE_AUTHOR_GITHUB,
  SITE_AUTHOR_LINKEDIN,
  RSS_PATH,
  MERGED_PR_COUNT_FALLBACK,
} from './contentValues';
