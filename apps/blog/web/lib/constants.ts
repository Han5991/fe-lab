/**
 * 블로그 사이트 전역 상수
 */
export const SITE_URL = 'https://blog.sangwook.dev';
export const SITE_NAME = 'Frontend Lab';
export const SITE_TITLE = 'Frontend Lab | 프론트엔드 실험실';
export const SITE_DESCRIPTION =
  '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.';
export const SITE_AUTHOR = 'Sangwook Han';
export const SITE_LOCALE = 'ko_KR';
export const OG_DEFAULT_IMAGE = '/og-default.png';
export const SITE_AUTHOR_GITHUB = 'https://github.com/Han5991';
export const SITE_AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/sangwook-han/';
/** 사이트 내부 RSS 경로. 절대 URL이 필요하면 BASE_RSS_URL을 쓰세요. */
export const RSS_PATH = '/rss.xml';
/**
 * merged PR 수 폴백값. CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 실제 값을
 * 주입하고, 로컬·주입 실패 시 이 값으로 떨어집니다(about 페이지와 같은 숫자).
 */
export const MERGED_PR_COUNT_FALLBACK = '58';
export const SITE_DESCRIPTION_EXPANDED =
  'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴, 성능 최적화, 오픈소스 기여 노하우를 다룹니다.';

export const BASE_RSS_URL = `${SITE_URL}${RSS_PATH}`;
