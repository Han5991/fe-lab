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
  LlmsDocsConfig,
  LlmsFacts,
  OgPalette,
  SiteConfig,
  SitemapConfig,
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
 *
 * 소비처는 둘이고 **같은 상수를 읽는다** — sitemap의 `<lastmod>`
 * (`SITEMAP_STATIC_PAGES`)와 about 페이지 JSON-LD의 `dateModified`
 * (`src/app/about/seo.ts`). 패키지의 `SiteConfig`에는 이 축이 없다: about
 * 페이지가 있는지조차 그 사이트만 아는 일이라, 콘텐츠 프레임워크가 필수로
 * 받을 값이 아니다.
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

// ── OG 카드 팔레트 ───────────────────────────────────────────────────────────

/**
 * OG 카드(`public/og/*.png`)의 색 — **`blog-preset.ts` 다크 토큰의 hex 사본**이다.
 *
 * 왜 사본인가: satori/resvg는 CSS 변수도 oklch도 못 읽는다. 그래서 토큰을
 * 참조하지 못하고 값을 옮겨 적는다. 팔레트를 바꾸면 여기도 같이 고쳐야
 * 소셜 미리보기가 사이트와 어긋나지 않는다 — 어긋나도 렌더는 성공하므로
 * 아무도 실패로 알려주지 않는다.
 *
 * 패키지에는 이 축의 기본값이 **없다**(`ContentValues['ogPalette']`가 필수).
 * 기본값을 두면 색을 넘기지 않은 사이트의 카드가 남의 색으로 나간다.
 */
export const OG_PALETTE = {
  paper: '#0B0D10', // paper.50
  ink: '#E6E8EB', // ink.950
  inkMeta: '#8B919A', // ink.600
  inkRule: '#333941', // ink.border(다크 rgba를 paper.50 위에 합성한 값)
  accent: '#67E8F9', // accent.500 — 포인트 cyan
  pillBorder: 'rgba(103, 232, 249, 0.4)',
} as const satisfies OgPalette;

// ── sitemap 정적 페이지 · 우선순위 ───────────────────────────────────────────

/**
 * 글이 아닌 정적 페이지 — sitemap에 실린다.
 *
 * `/`와 `/posts/`는 여기 없다. 그 둘은 패키지가 소유한 라우트 모양이라 언제나
 * 나가고(`generate-sitemap.ts`), 여기에는 **이 사이트에만 있는 페이지**를 적는다.
 * 패키지 기본값은 비어 있다 — 어떤 페이지가 있는지는 앱만 알기 때문이다.
 */
export const SITEMAP_STATIC_PAGES = [
  { path: '/about/', priority: '0.7', lastmod: ABOUT_PAGE_MODIFIED },
] as const satisfies SitemapConfig['staticPages'];

/**
 * sitemap의 `<priority>` 튜닝 — **어떤 글이 대표작인가**라는 편집 판단이라
 * 패키지 기본값은 비어 있다.
 *
 * 폴더는 시리즈가 아니라 폴더 기준이다(`typescript` 폴더에는 `_series.yml`이
 * 없어 시리즈가 아니지만 우선순위는 받는다 — generate-sitemap.ts 주석 참고).
 */
export const SITEMAP_PRIORITY = {
  /** 고가치 주제 폴더 — 0.75 */
  highPriorityFolders: ['bundler', 'typescript', 'open-source'],
  /** 고가치 개별 글 — 0.8 */
  highPrioritySlugs: [
    'ai-opensource-contribution',
    'nodejs-contribution',
    'nextjs-contributor',
    'first-open-source-contribution',
  ],
} as const satisfies Pick<
  SitemapConfig,
  'highPriorityFolders' | 'highPrioritySlugs'
>;

// ── llms.txt 산문 ────────────────────────────────────────────────────────────

/**
 * AI 크롤러용 색인·전문의 머리 소개.
 *
 * 안 주면 `site.description`이 쓰인다(`defineContent`). 여기서 따로 적는 이유는
 * 화면용 한 줄 설명과 크롤러용 소개의 목적이 다르기 때문이다 — 이쪽은 영어이고,
 * 무엇을 다루는 블로그인지와 **본문 언어**까지 알려야 한다.
 */
export const LLMS_INTRO = {
  index:
    'Frontend engineering blog by Sangwook Han (한상욱). Deep-dive technical experiments in bundler architecture, TypeScript domain modeling, React patterns, and open source contributions. All posts include working code and first-hand implementation experience. Post body content is in Korean; technical terms, code, and key facts are in English.',
  full: 'Frontend engineering blog by Sangwook Han (한상욱). Deep-dive technical experiments in bundler architecture, TypeScript domain modeling, React patterns, and open source contributions. All posts include working code and first-hand implementation experience. Content primarily in Korean.',
} as const;

/**
 * `## Key Facts` 절 — 저자 이력이라 **소비자만 쓸 수 있는 내용**이다.
 * 패키지에서는 전부 선택 항목이고, 주지 않은 항목은 줄째 생략된다.
 * 숫자가 든 항목(기여 수·성능 개선치)은 사실이 바뀌면 여기서 고친다.
 */
export const LLMS_FACTS = {
  languageIndex:
    'Korean body text; English technical terms, code, and key data points',
  languageFull: 'Primarily Korean, some English',
  openSource:
    '27 Mantine PRs merged, Node.js core contributor, Next.js contributor',
  notableContributionIndex:
    'gemini-cli 74% performance improvement (408ms → 107ms) via Promise.allSettled',
  notableContributionFull:
    'gemini-cli 74% performance improvement (408ms → 107ms)',
  speaking: "FEConf 2025 (Korea's largest frontend conference), TeoConf",
  mainTopics:
    'Bundler internals, TypeScript domain modeling, React patterns, design systems, open source',
} as const satisfies LlmsFacts;

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
} as const satisfies SiteConfig;

export const AUTHOR = {
  name: AUTHOR_NAME,
  alternateName: AUTHOR_ALTERNATE_NAME,
  role: AUTHOR_ROLE,
  github: AUTHOR_GITHUB,
  linkedin: AUTHOR_LINKEDIN,
} as const satisfies AuthorConfig;

/**
 * `llms.txt`의 `## Docs` 절 — 라벨과 한 줄 설명.
 *
 * 패키지가 소유한 셋(`home`·`archive`·`full` → `/`·`/posts/`·`/llms-full.txt`)은
 * URL을 넣지 않는다 — 그 경로는 패키지가 정의하는 라우트·산출물이라 여기서 정하는
 * 것은 문구뿐이다. 반대로 `extra`는 **이 사이트에만 있는 페이지**라 경로까지 여기서
 * 준다. 패키지에는 이 목록의 기본값이 없다(빈 배열) — 소개·시리즈 페이지가 있는지는
 * 이 앱만 알기 때문이다.
 * `{count}`는 산출 시점의 발행 글 수로 치환된다 — 숫자를 손으로 적어 두면
 * 예전 정적 llms.txt가 그랬듯 실제 글 수와 갈라진다.
 *
 * 라벨이 한국어이고 설명이 영어인 이유는 원래 파일의 관례를 따른 것이다:
 * 소비자는 AI 크롤러(영어)지만, 링크 텍스트는 사이트 화면의 메뉴 이름과
 * 같아야 사람이 대조할 수 있다.
 */
export const LLMS_DOCS = {
  home: {
    label: '블로그 홈',
    summary: `${SITE_NAME} — React, TypeScript, bundler architecture experiments by ${AUTHOR_NAME}.`,
  },
  archive: {
    label: '전체 포스트 목록',
    summary:
      'Complete archive of {count} frontend engineering articles organized by topic and series.',
  },
  full: {
    label: '전문 텍스트',
    summary: 'Full post text for retrieval.',
  },
  extra: [
    {
      path: '/series/',
      label: '시리즈 목록',
      summary: 'Multi-part series, each readable in order from part 1.',
    },
    {
      path: '/about/',
      label: '소개',
      summary:
        'Author profile, open source contributions, and conference talks.',
    },
  ],
} as const satisfies LlmsDocsConfig;
