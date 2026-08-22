/**
 * 클라이언트 안전 **값-only 모듈** — 순수 리터럴만 둔다.
 *
 * 클라이언트 컴포넌트가 소비하는 값(사이트명·URL·타임존·다이어그램 이름)의
 * 단일 출처다. `defineContent`(contentConfig.ts)는 이 값을 **기본값으로
 * 소비**한다 — 의존 방향은 언제나 `contentConfig → contentValues`다. 반대로
 * 이 모듈은 아무것도 import하지 않는다(설정 객체·node 코어 금지). 상수 하나를
 * import해도 설정 객체 전체(og 팔레트·llms 산문·경로)가 클라이언트 번들에
 * 딸려 들어가던 문제를 이 방향 분리가 막는다.
 *
 * **제약**: 소비자의 `content.config.mts`(defineContent)에 오버라이드가 생기면,
 * 해석된 설정과 이 모듈의 리터럴이 **갈라질 수 있다**. 현재 앱의 오버라이드는
 * root뿐이라 둘은 동일하다 — 클라이언트에 보이는 값을 오버라이드하려면
 * 이 모듈의 리터럴을 함께 고쳐야 한다(contentConfig.test.ts가 동일성을 잠근다).
 */

// ── 사이트 정체성 ────────────────────────────────────────────────────────────

export const SITE_URL = 'https://blog.sangwook.dev';
export const SITE_NAME = 'Frontend Lab';
export const SITE_DESCRIPTION =
  '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.';
/** 홈 히어로 등에서 쓰는 긴 소개 */
export const SITE_DESCRIPTION_EXPANDED =
  'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴과 성능 최적화, 그리고 Mantine·Node.js·Next.js에 기여하며 배운 노하우를 다룹니다.';
/**
 * 글별 OG 카드가 없을 때 쓰는 기본 공유 이미지.
 *
 * 확장자가 `.jpg`인 이유: 원래 파일은 **JPEG인데 이름만 `.png`**였고(1024×1024,
 * 384KB) 메타데이터는 1200×630이라고 알리고 있었다. 크기를 선언과 맞추고 형식도
 * 이름과 맞췄다. 부드러운 그라데이션이라 PNG로 무손실 저장하면 435KB까지 붇는
 * 반면 JPEG는 33KB에 눈에 띄는 손실이 없다.
 */
export const OG_DEFAULT_IMAGE = '/og-default.jpg';
/** 사이트 내부 RSS 경로. 절대 URL이 필요하면 `${SITE_URL}${RSS_PATH}`로 조합하세요. */
export const RSS_PATH = '/rss.xml';
/**
 * `/about/` 페이지를 마지막으로 **손으로 고친** 날짜 ('YYYY-MM-DD').
 * 빌드 날짜를 넣으면 매일 도는 cron 빌드마다 lastmod가 전진해 신호가
 * 무의미해지므로 손으로 관리한다 (generate-sitemap.ts 주석 참고).
 */
export const ABOUT_PAGE_MODIFIED = '2026-08-10';
/**
 * merged PR 수 폴백값. CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 실제 값을
 * 주입하고, 로컬·주입 실패 시 이 값으로 떨어집니다(about 페이지와 같은 숫자).
 */
export const MERGED_PR_COUNT_FALLBACK = '58';

// ── 저자 ─────────────────────────────────────────────────────────────────────

export const AUTHOR_NAME = 'Sangwook Han';
/** JSON-LD alternateName — 한글 이름 */
export const AUTHOR_ALTERNATE_NAME = '한상욱';
export const AUTHOR_ROLE = 'Frontend Engineer';
export const SITE_AUTHOR_GITHUB = 'https://github.com/Han5991';
export const SITE_AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/sangwook-han/';

// ── SEO 예산 ─────────────────────────────────────────────────────────────────

/**
 * 모든 페이지 `<title>`에 붙는 접미사. 길이 예산을 계산하는 쪽(lint:posts)과
 * 실제로 붙이는 쪽(postSeo)이 같은 값을 봐야 해서 한 곳에서만 온다.
 */
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;
/** 검색 결과에서 잘리지 않는 `<title>` 길이 상한(접미사 포함) */
export const SEO_TITLE_MAX_LENGTH = 60;
/** description 권장 길이. 너무 짧으면 스니펫이 비고, 너무 길면 잘린다 */
export const SEO_DESCRIPTION_MIN_LENGTH = 120;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

// ── 타임존 ───────────────────────────────────────────────────────────────────
// 셋은 같은 타임존을 가리켜야 한다(서로 파생 검증은 하지 않는다).

/** IANA 타임존 이름 — Intl.DateTimeFormat용 */
export const TIMEZONE_IANA = 'Asia/Seoul';
/** 'YYYY-MM-DD'를 이 타임존 자정으로 볼 때 붙이는 ISO offset */
export const TIMEZONE_ISO_OFFSET = '+09:00';
/**
 * UTC 대비 밀리초 오프셋. `msUntilKSTMidnight`가 산술에 쓴다 —
 * IANA 이름만으로는 이 계산을 못 하므로 별도 값으로 둔다.
 */
export const TIMEZONE_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

// ── 다이어그램 이름 ──────────────────────────────────────────────────────────

/**
 * 다이어그램 이름 기본 목록. 타입 유니언(DiagramName)이 여기서 파생된다.
 * 컴포넌트 매핑(앱의 `src/components/diagram/registry.ts`)이 클라이언트 그래프에
 * 있으므로 이름 목록도 값 모듈에 둔다 — `src/post/diagramNames.ts` 참고.
 */
export const DEFAULT_DIAGRAM_NAMES = ['deploy-pipeline'] as const;
