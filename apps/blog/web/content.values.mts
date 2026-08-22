/**
 * 이 사이트의 값 — **앱이 소유하는 리터럴**.
 *
 * `content.config.mts`(설정)와 앱 코드(화면·SEO)가 함께 읽는 단일 출처다.
 * 방향은 언제나 `content.values → content.config → @blog/content`다 — 패키지는
 * 이 사이트를 모르고, 값은 여기서만 바뀐다.
 *
 * **왜 설정에서 다시 뽑아 쓰지 않고 따로 두나**: 여기 값 일부는 클라이언트
 * 컴포넌트가 소비한다. 해석된 설정 객체(`content.config.mts`)를 클라이언트가
 * import하면 og 팔레트·llms 산문·경로까지 통째로 번들에 실린다(defineContent
 * 호출 결과라 번들러가 미사용 필드를 털지 못한다). 그래서 값은 순수 리터럴로
 * 여기 두고, 설정이 이 값을 소비한다.
 *
 * **개별 상수가 1차이고 그룹 객체는 설정 배선용이다.** 번들러는 모듈의 named
 * export 단위로 털어내지, 객체의 필드 단위로는 못 턴다 — 클라이언트가 쓰는
 * `RSS_PATH` 하나 때문에 `SITE` 객체를 들여오면 홈 히어로 소개문까지 번들에
 * 실린다(실제로 그렇게 됐던 적이 있다). 그래서 화면 코드는 **개별 상수**를,
 * `content.config.mts`만 그룹 객체를 가져간다. `TIMEZONE`·`DIAGRAM_NAMES`는
 * 예외로 묶음째 쓰는데, 소비하는 함수가 슬라이스를 통째로 받고 크기도 작다.
 *
 * **제약**: 이 파일은 **값을 import하지 않는다**. 값 import가 생기는 순간 그
 * 모듈이 클라이언트 그래프에 딸려 들어가고, 위의 분리가 무의미해진다. 타입은
 * 예외다 — `import type`은 `erasableSyntaxOnly` 아래서 통째로 지워지므로
 * 런타임에 아무것도 남기지 않는다. 채워야 할 모양을 패키지가 타입으로 공개하고
 * (`ContentValues`), 각 값이 `satisfies`로 그 계약을 확인받는다. 필드를 빠뜨리면
 * `content.config.mts`가 아니라 **여기서** 잡힌다.
 */
import type {
  AuthorConfig,
  ContentValues,
  SiteConfig,
  TimezoneConfig,
} from '@blog/content';

// ── 사이트 정체성 ────────────────────────────────────────────────────────────

/** 프로덕션 origin. 후행 슬래시 없음 */
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
/** 사이트 내부 RSS 경로. 절대 URL이 필요하면 `${SITE_URL}${RSS_PATH}`로 조합한다. */
export const RSS_PATH = '/rss.xml';
/**
 * `/about/` 페이지를 마지막으로 **손으로 고친** 날짜 ('YYYY-MM-DD').
 * 빌드 날짜를 넣으면 매일 도는 cron 빌드마다 lastmod가 전진해 신호가
 * 무의미해지므로 손으로 관리한다 (generate-sitemap.ts 주석 참고).
 */
export const ABOUT_PAGE_MODIFIED = '2026-08-10';
/**
 * merged PR 수 폴백값. CI가 빌드 타임에 NEXT_PUBLIC_PR_COUNT로 실제 값을
 * 주입하고, 로컬·주입 실패 시 이 값으로 떨어진다(about 페이지와 같은 숫자).
 */
export const MERGED_PR_COUNT_FALLBACK = '58';

// ── 저자 ─────────────────────────────────────────────────────────────────────

export const AUTHOR_NAME = 'Sangwook Han';
/** JSON-LD alternateName — 한글 이름 */
export const AUTHOR_ALTERNATE_NAME = '한상욱';
export const AUTHOR_ROLE = 'Frontend Engineer';
export const AUTHOR_GITHUB = 'https://github.com/Han5991';
export const AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/sangwook-han/';

// ── 타임존 ───────────────────────────────────────────────────────────────────

/**
 * 셋은 같은 타임존을 가리켜야 한다(서로 파생 검증은 하지 않는다).
 * 날짜 헬퍼들이 이 슬라이스를 통째로 받으므로 여기서는 묶어서 내보낸다.
 */
export const TIMEZONE = {
  /** IANA 타임존 이름 — Intl.DateTimeFormat용 */
  iana: 'Asia/Seoul',
  /** 'YYYY-MM-DD'를 이 타임존 자정으로 볼 때 붙이는 ISO offset */
  isoOffset: '+09:00',
  /**
   * UTC 대비 밀리초 오프셋. `msUntilKSTMidnight`가 산술에 쓴다 —
   * IANA 이름만으로는 이 계산을 못 하므로 별도 값으로 둔다.
   */
  utcOffsetMs: 9 * 60 * 60 * 1000,
} as const satisfies TimezoneConfig;

// ── 다이어그램 이름 ──────────────────────────────────────────────────────────

/**
 * 이름으로 부를 수 있는 다이어그램 목록.
 *
 * 컴포넌트 매핑(`src/components/diagram/registry.ts`)이 실제 소유자지만, 그
 * 파일은 React·Panda를 끄는 `.tsx`를 import한다. 검증 스크립트(`lint:posts`)가
 * 거기까지 딸려 들어가지 않도록 **이름만** 여기 두고, 레지스트리와 설정
 * (`registries.diagramNames`)이 같은 출처를 공유한다.
 *
 * 새 다이어그램은 **여기 한 줄 + registry.ts 한 줄**. 둘 중 하나만 하면
 * registry.ts의 `Record<DiagramName, …>`가 컴파일 에러를 낸다.
 */
export const DIAGRAM_NAMES = [
  'deploy-pipeline',
] as const satisfies ContentValues['diagramNames'];

export type DiagramName = (typeof DIAGRAM_NAMES)[number];

/** frontmatter `hero`처럼 어떤 값이든 올 수 있는 자리에서 쓰는 좁히기 가드. */
export function isDiagramName(value: unknown): value is DiagramName {
  return (
    typeof value === 'string' &&
    (DIAGRAM_NAMES as readonly string[]).includes(value)
  );
}

// ── 설정 배선용 그룹 ─────────────────────────────────────────────────────────
// `content.config.mts`만 가져간다. 화면 코드가 이 객체를 import하면 위에서 말한
// 번들 문제가 그대로 돌아오므로, 필요한 개별 상수를 쓸 것.

export const SITE = {
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  descriptionExpanded: SITE_DESCRIPTION_EXPANDED,
  ogDefaultImage: OG_DEFAULT_IMAGE,
  rssPath: RSS_PATH,
  aboutPageModified: ABOUT_PAGE_MODIFIED,
  mergedPrCountFallback: MERGED_PR_COUNT_FALLBACK,
} as const satisfies SiteConfig;

export const AUTHOR = {
  name: AUTHOR_NAME,
  alternateName: AUTHOR_ALTERNATE_NAME,
  role: AUTHOR_ROLE,
  github: AUTHOR_GITHUB,
  linkedin: AUTHOR_LINKEDIN,
} as const satisfies AuthorConfig;
