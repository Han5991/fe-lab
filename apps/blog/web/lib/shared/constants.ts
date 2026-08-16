/**
 * 블로그 사이트 전역 상수
 */
export const SITE_URL = 'https://blog.sangwook.dev';
export const SITE_NAME = 'Frontend Lab';
export const SITE_DESCRIPTION =
  '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.';
/**
 * 글별 OG 카드가 없을 때 쓰는 기본 공유 이미지.
 *
 * 확장자가 `.jpg`인 이유: 원래 파일은 **JPEG인데 이름만 `.png`**였고(1024×1024,
 * 384KB) 메타데이터는 1200×630이라고 알리고 있었다. 크기를 선언과 맞추고 형식도
 * 이름과 맞췄다. 부드러운 그라데이션이라 PNG로 무손실 저장하면 435KB까지 붇는 반면
 * JPEG는 33KB에 눈에 띄는 손실이 없다(팔레트 PNG는 sharp가 16색으로 떨어뜨려
 * 그라데이션에 띠가 생겼다).
 */
export const OG_DEFAULT_IMAGE = '/og-default.jpg';
/**
 * 모든 페이지 `<title>`에 붙는 접미사. 길이 예산을 계산하는 쪽(lint:posts)과
 * 실제로 붙이는 쪽(postSeo)이 같은 값을 봐야 해서 여기 한 곳에 둔다.
 */
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;
/**
 * 검색 결과에서 잘리지 않는 `<title>` 길이 상한(접미사 포함).
 * 넘으면 `lint:posts`가 `long-title` 경고를 내고, `seoTitle`로 줄일 수 있다.
 */
export const SEO_TITLE_MAX_LENGTH = 60;
/** description 권장 길이. 너무 짧으면 스니펫이 비고, 너무 길면 잘린다. */
export const SEO_DESCRIPTION_MIN_LENGTH = 120;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;
/**
 * `/about/` 페이지를 마지막으로 **손으로 고친** 날짜 ('YYYY-MM-DD').
 *
 * 이 페이지는 글이 아니라 정적 페이지라 자동으로 알 수 있는 수정 시각이 없다.
 * 그렇다고 빌드 날짜를 넣으면 매일 도는 cron 빌드마다 lastmod가 전진해 신호가
 * 무의미해지므로(sitemap 주석 참고) 손으로 관리한다. JSON-LD `dateModified`와
 * sitemap `lastmod`가 모두 여기서 온다.
 *
 * **갱신 기준**: 화면에 보이는 내용뿐 아니라 `description`·OG 블록처럼 검색 결과에
 * 나가는 메타데이터를 고칠 때도 갱신한다(둘 다 "이 페이지가 달라졌다"는 신호가
 * 맞다). 반대로 코드 정리·상수 추출처럼 나가는 값이 그대로면 건드리지 않는다.
 */
export const ABOUT_PAGE_MODIFIED = '2026-08-10';
export const SITE_AUTHOR_GITHUB = 'https://github.com/Han5991';
export const SITE_AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/sangwook-han/';
/** 사이트 내부 RSS 경로. 절대 URL이 필요하면 `${SITE_URL}${RSS_PATH}`로 조합하세요. */
export const RSS_PATH = '/rss.xml';
/**
 * merged PR 수 폴백값. CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 실제 값을
 * 주입하고, 로컬·주입 실패 시 이 값으로 떨어집니다(about 페이지와 같은 숫자).
 */
export const MERGED_PR_COUNT_FALLBACK = '58';
export const SITE_DESCRIPTION_EXPANDED =
  'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴과 성능 최적화, 그리고 Mantine·Node.js·Next.js에 기여하며 배운 노하우를 다룹니다.';
