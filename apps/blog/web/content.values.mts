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
 * `SITE_NAME` 하나 때문에 `SITE` 객체를 들여오면 홈 히어로 소개문까지 번들에
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
  BundleBudgetsConfig,
  BundleGuardsConfig,
  ContentValues,
  LlmsDocsConfig,
  LlmsFacts,
  SiteConfig,
  SitemapConfig,
  TimezoneConfig,
} from '@blog/content';

// ── 사이트 정체성 ────────────────────────────────────────────────────────────

/** 프로덕션 origin. 후행 슬래시 없음 */
export const SITE_URL = 'https://blog.sangwook.dev';
export const SITE_NAME = 'Frontend Lab';
/** 사이트의 한글 이름 — 기본 제목(`${SITE_NAME} | …`)과 JSON-LD WebSite의 alternateName */
export const SITE_ALTERNATE_NAME = '프론트엔드 실험실';
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
/**
 * 사이트 언어(og:locale 형식). html lang·JSON-LD inLanguage·RSS language·Intl 표기는
 * `@blog/content`의 `localeLanguage`·`localeTag`가 여기서 파생한다.
 */
export const SITE_LOCALE = 'ko_KR';
/** 발행처 로고(JSON-LD Organization의 logo). 파일은 public/ 아래 */
export const SITE_LOGO = {
  path: '/logo-wordmark.svg',
  width: 280,
  height: 60,
} as const;
// RSS 경로는 여기 없다 — 피드를 만드는 것도 파일 이름을 정하는 것도 패키지라
// (`@blog/content`의 `RSS_PATH`) 이 사이트가 고를 수 있는 값이 아니다. 예전엔
// 여기와 패키지 생성기 셋이 같은 리터럴을 따로 들고 있었다.

// ── 정적 페이지 경로의 배선용 사본 ───────────────────────────────────────────
//
// 라우트 경로의 단일 출처는 `src/shared/routes.ts`다 — 내비게이션 href·canonical·
// og url·JSON-LD `@id`는 전부 거기서 온다. 이 모듈은 값 import 금지(위 제약)라
// 그걸 가져오지 못해, sitemap·llms 배선에 쓰는 사본만 **비공개**로 든다.
// 어긋남은 `contentValues.test.ts`가 잠근다 (아래 ADMIN/POSTS 접두와 같은 패턴).
//
// `/`와 `/posts/`는 여기 없다 — 그 둘은 패키지가 소유한 라우트 모양이라
// `@blog/content`의 `POSTS_PATH`·`postPath`가 단일 출처다.

const ABOUT_PATH = '/about/';
const SERIES_PATH = '/series/';
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
 * 셋은 같은 타임존이어야 한다(`defineContent`가 형식·일치를 검증한다). 서머타임
 * 지역은 날짜마다 오프셋이 달라 지원하지 않는다.
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

/**
 * 포스트 디렉터리에서 **이름만 보고** 빌드 대상에서 제외하는 작업 노트 파일.
 *
 * 이 파일들은 frontmatter가 없어 어차피 메타 노트로 걸러지지만(fail-closed),
 * 이름 제외는 내용과 무관하게 결정적이다 — 로그 본문 첫 줄에 `---` 구분선이
 * 생겨도 포스트가 되지 않는다. 무엇이 작업 노트인지는 이 저장소의 글쓰기
 * 워크플로가 정하는 어휘라 앱이 소유하고, 패키지(`collectMarkdownFiles`)는
 * 받은 집합으로 판정만 한다. 설정 배선 전용 — 화면은 쓰지 않는다.
 */
export const META_FILENAMES = [
  'PLAN.md',
  'THUMBNAIL_LOG.md',
  'STUDY_LOG.md',
] as const;

// OG 카드 팔레트는 여기 없다 — 값이 아니라 **프리셋에서 파생**되기 때문이다.
// `blog-preset.ts`의 다크 색을 `themeColor('dark', …)`로, 토큰이 아닌 브랜드 cyan을 `ogBrand`로
// 뽑아 `content.config.mts`가 조립한다.
// 이 파일이 아니라 거기인 이유는 값 import 금지(위 제약) 때문이다: 프리셋을 여기서
// 끌면 화면이 이 모듈의 다른 상수를 쓸 때 Panda 설정까지 클라이언트 번들에 실린다.

// ── sitemap 정적 페이지 · 우선순위 ───────────────────────────────────────────

/**
 * 글이 아닌 정적 페이지 — sitemap에 실린다.
 *
 * `/`와 `/posts/`는 여기 없다. 그 둘은 패키지가 소유한 라우트 모양이라 언제나
 * 나가고(`generate-sitemap.ts`), 여기에는 **이 사이트에만 있는 페이지**를 적는다.
 * 패키지 기본값은 비어 있다 — 어떤 페이지가 있는지는 앱만 알기 때문이다.
 */
export const SITEMAP_STATIC_PAGES = [
  { path: ABOUT_PATH, priority: '0.7', lastmod: ABOUT_PAGE_MODIFIED },
] as const satisfies SitemapConfig['staticPages'];

// ── 번들 규칙 (check-bundle 배선 전용) ───────────────────────────────────────
//
// "어느 코드·값이 어느 라우트의 것인가"는 이 사이트의 어휘라 앱이 통째로
// 선언한다 — 패키지는 스코프(페이지·도달 청크·산출물)를 평가할 뿐, admin이니
// 서버 전용이니 하는 분류를 모른다. 규칙마다 음성(forbiddenIn)과
// 양성(requiredIn — 마커가 살아 있음의 증명)이 짝이다: 코드에서 이름·문구를
// 바꾸면 여기도 함께 바꿀 것(안 바꾸면 marker-dead로 빌드가 막히며 알려 준다).
//
// 마커는 minify를 살아남는 문자열이어야 한다 — 문자열 리터럴, 라이브러리
// 클래스명, 프로퍼티·메서드 이름. export 이름은 안 된다: Next 16.4의 Turbopack은
// 청크에 등록하는 export 이름까지 한두 글자로 줄인다.

/**
 * admin 라우트의 경로 접두. `src/shared/routes.ts`의 `ADMIN_BASE_PATH`(`'/admin'`)
 * 와 짝이지만 직접 파생하지 않는다 — 이 모듈은 값 import가 금지다(순수 리터럴
 * 계약). 대신 `contentValues.test.ts`가 두 값을 잠근다.
 */
export const ADMIN_PATH_PREFIX = '/admin/';

/**
 * 글 라우트의 경로 접두 — 패키지 소유 라우트(`POSTS_PATH`)의 사본.
 * 같은 이유(값 import 금지)로 직접 파생하지 못하고 `contentValues.test.ts`가
 * 잠근다.
 */
export const POSTS_PATH_PREFIX = '/posts/';

// 스코프 조각 — 규칙들이 공유한다.
const PUBLIC_CHUNKS = {
  kind: 'chunks',
  of: { notUnder: ADMIN_PATH_PREFIX },
} as const;
const ADMIN_CHUNKS = {
  kind: 'chunks',
  of: { under: ADMIN_PATH_PREFIX },
} as const;
const OUTSIDE_POSTS_CHUNKS = {
  kind: 'chunks',
  of: { notUnder: POSTS_PATH_PREFIX },
} as const;
const POSTS_CHUNKS = {
  kind: 'chunks',
  of: { under: POSTS_PATH_PREFIX },
} as const;

export const BUNDLE_GUARDS = [
  // admin 전용 코드가 공개 청크에 실리면 실패 — #326에서 실제로 있었던 누수.
  // 앞 둘은 admin 계산 파사드(src/domain/analytics의 `AnalyticsService`)의 메서드
  // 이름, 셋째는 Edge Function 이름 리터럴, 넷째는 세션용 supabase-js(auth
  // 클라이언트 클래스명 — src/domain/*/admin 배럴 분리가 지키는 것).
  {
    label: 'admin 전용 계산',
    marker: 'computeOverview',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: 'admin 전용 계산',
    marker: 'computeDerivedStats',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: 'admin Edge Function 클라이언트',
    marker: 'admin-analytics',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  {
    label: '세션용 supabase-js',
    marker: 'GoTrueClient',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  // admin 차트 라이브러리(분석 화면은 첫 로드, 대시보드는 차트만 지연 로드) — 공개 페이지에는 차트가 없다.
  {
    label: 'admin 차트(Recharts)',
    marker: 'recharts',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  // React Query는 admin만 쓴다(Provider는 admin 레이아웃). 의존성이 남아 루트 import 한 줄이면 모든 공개
  // 페이지가 query-core(≈8.5KB gzip)를 다시 싣는데, 그 크기가 공개 예산의 ×1.05 여유보다 작거나 비슷해
  // 예산만으로는 못 잡는다. 마커는 query-core가 쿼리 함수 없는 쿼리에 던지는 문구(ensureQueryFn) —
  // QueryClient가 끌어 와 Provider만 실려도 함께 실린다. 재평가 2027-04-24 — 그때까지 잡은 것이 없으면 내린다.
  {
    label: 'admin 데이터 캐시(React Query)',
    marker: 'Missing queryFn',
    forbiddenIn: [PUBLIC_CHUNKS],
    requiredIn: [ADMIN_CHUNKS],
  },
  // 글 상세에서만 지연 로드되는 것들 — 다른 라우트 청크에 실리면 실패.
  {
    label: '글 전용 다이어그램(Mermaid)',
    marker: 'mermaid',
    forbiddenIn: [OUTSIDE_POSTS_CHUNKS],
    requiredIn: [POSTS_CHUNKS],
  },
  {
    label: '글 전용 댓글(Giscus)',
    marker: 'giscus.app',
    forbiddenIn: [OUTSIDE_POSTS_CHUNKS],
    requiredIn: [POSTS_CHUNKS],
  },
  // 서버/빌드 전용 값의 클라이언트 유입 — 설정 객체나 값 모듈의 그룹 객체를
  // 클라이언트가 import하면 화면이 안 쓰는 값까지 번들에 실린다(위 "그룹
  // 객체는 설정 배선 전용" 규칙이 막는 바로 그 사고 — 실제로 홈 히어로
  // 소개문이 그렇게 샜다). llms 산문은 어떤 화면에도 렌더되지 않는 서버 전용
  // 값이면서 `LLMS_INTRO` 그룹·설정 객체 어느 쪽이 새도 함께 실려 온다.
  {
    label: '서버 전용 값(llms 산문)',
    marker: 'Deep-dive technical experiments in bundler architecture',
    forbiddenIn: [{ kind: 'chunks' }, { kind: 'pages' }],
    requiredIn: [{ kind: 'artifact', path: 'llms.txt' }],
  },
  // 구문 강조는 빌드 타임의 일이다(#319) — 하이라이트된 마크업(`class="token`)은
  // 글 HTML에만 있고 어떤 청크에도 없다. 렌더가 클라이언트로 돌아가면 글
  // HTML에서 마크업이 사라져 marker-dead로 걸린다.
  {
    label: '빌드 타임 구문 강조',
    marker: 'class="token',
    forbiddenIn: [{ kind: 'chunks' }],
    requiredIn: [{ kind: 'pages', of: { under: POSTS_PATH_PREFIX } }],
  },
] as const satisfies BundleGuardsConfig;

/**
 * 첫 로드 전송량 예산 — 라우트 그룹(첫 경로 세그먼트)마다 문서가 직접 부르는
 * JS·CSS의 gzip 상한(KB = 1024바이트). `check-bundle`이 `pnpm build`의 마지막
 * 단계에서 그룹의 **모든** 페이지를 대 본다(최대 기준). HTML은 예산이 없다 —
 * 글 본문과 하이드레이션 페이로드가 실려 원고와 함께 자란다.
 *
 * 숫자는 2026-10-05 새 빌드의 그룹 최대 측정값에 ~5% 여유를 얹어 올림한 것이다
 * (측정값은 각 줄 주석 — 2026-10-08 Panda v2 빌드로 갱신: JS는 v2 런타임(helpers)으로
 * 페이지마다 +2.7KB, CSS는 preset-panda 팔레트·radii를 빼고 JSX prop 추출을 꺼 −3.6KB.
 * CSS 예산은 33 → 30KB로 내렸다 — 측정 최대 27.9KB에 ~5% 여유. JS 예산은 그대로.
 * 2026-10-22 Panda 2.3.0 빌드로 다시 갱신: CSS는 쓰지 않는 keyframes 셋과 preset-panda 그림자
 * 토큰을 빼 −0.2KB — 최대 27.7KB에 ~5% 여유를 얹어도 30KB라 예산은 그대로).
 * 2026-10-24 포인트색을 잉크로 옮긴 빌드로 다시 갱신: CSS는 cyan accent 계열 색 토큰 15개를
 * 빼고 accent 4개를 더해 −0.3~0.4KB(최대 27.3KB) — 예산은 그대로. JS는 같은 날 바꾸기 전 빌드와
 * 대 보면 0~−0.1KB다(공개 그룹). 줄별 JS 숫자가 크게 움직인 건 이 변경 탓이 아니다 — 줄 주석의
 * 옛 값(251.1·187.3·434.9)이 이미 실측(바꾸기 전 빌드 251.8·188.4)과 어긋나 있던 것을 이 빌드의
 * 측정값으로 바꿨다.
 * 2026-10-24 페이지 전환을 ssgoi에서 React ViewTransition으로 옮긴 빌드로 다시 갱신: 레이아웃이 싣던
 * `@ssgoi/react`가 빠져 모든 공개 그룹의 JS가 −12.1~−12.3KB, admin은 글 아코디언의 motion(framer)까지
 * 빠져 −53.2KB다. 글 상세는 목차 시트·맨 위로 버튼의 motion도 빠져 199.3KB(−52.6KB)지만 `/posts/` 줄은
 * 그룹 최대인 글 목록(필터 시트가 아직 motion을 쓴다)이 정한다. CSS는 모션 토큰·전환 규칙이 더해져
 * +0.4~0.5KB(최대 27.8KB) — 예산은 그대로. JS 예산은 새 최대에 ~5% 여유로 내렸다.
 * 2026-10-24 서버 페이지가 컴포넌트를 배럴(`components/blog/index.ts`, 삭제) 대신 제 경로로 열게 한
 * 빌드로 `/`·`/about/`을 다시 갱신: 그 배럴이 클라이언트 모듈(글 목록 아카이브·필터·인기 레일)까지
 * 재수출해, 홈은 Hero·대표글·행을, 소개는 Label 하나를 열었는데도 그 클라이언트 청크 셋(js 파일
 * 14 → 11개)이 첫 로드에 실렸다 — 239.6 → 176.1KB(−63.5KB). 두 줄을 새 최대에 ~5% 여유(185)로 내렸다.
 * 같은 빌드에서 `/posts/`(최대는 글 목록)도 239.6 → 239.2KB(−0.4) — 예산은 그대로.
 * 2026-10-24 홈을 카드(쇼케이스·썸네일 행)로 바꾼 빌드로 다시 갱신: CSS는 칩·카드·홈 격자의 원자
 * 클래스로 +0.1~0.2KB(최대 28.0KB), JS는 0~+0.1KB — 예산은 그대로. 줄 주석의 옛 값(176.1 / 27.1,
 * 239.2)은 셸을 바꾼 빌드(176.2 / 27.2, 239.3)부터 이미 실측과 어긋나 있던 것을 이 빌드의
 * 측정값으로 바꿨다.
 * 2026-10-25 글 목록을 752 단일 칼럼으로 바꾼 빌드로 `/posts/`를 다시 갱신: 목록은 필터 시트·FAB(과 그
 * `motion`)·필터 패널·인기 글 레일·옛 카드·세그먼트 컨트롤, nuqs 훅, react-query 훅이 빠지고 인기순 조회
 * 코드가 지연 로드로 나가 240.2 → 185.2KB(−55.0KB — 목록 전용 청크 63.8 → 9.4KB, 공용 청크 −0.6KB).
 * 그룹 최대는 이제 글 상세(199.5KB)가 정하고 이 값이 옛 예산의 80%(201.6) 아래라, `/posts/`를 252 → 207로
 * 내렸다 — 지금 최대에 ~4% 여유이고, 루트의 nuqs 어댑터(약 −3.8KB)가 빠져도 하한(165.6) 위다.
 * 2026-10-25 블로그가 `motion`·`nuqs`를 싣지 않게 한 빌드로 다시 갱신: 루트 `NuqsAdapter`가 빠져 모든
 * 공개 그룹과 admin이 −3.1~−3.2KB다(공개 175.7~176.5 → 172.5~173.3, 글 상세 199.5 → 196.3, 목록 185.2 →
 * 182.0, admin 378.0 → 374.9). CSS는 그대로(최대 28.5KB) — 예산은 전부 그대로. 줄 주석의 옛 값(176.2 /
 * 27.3, 378.8 / 27.3)은 앞선 빌드부터 실측과 어긋나 있던 것을 이 빌드의 측정값으로 바꿨다.
 * 2026-10-25 루트 `QueryClientProvider`를 admin 레이아웃으로 옮긴 빌드로 다시 갱신했다. query-core·react-query가
 * 모든 공개 페이지의 공유 청크에서 빠져 공개 그룹 −8.6KB(172.5~173.3 → 163.9~164.7), 글 상세 −8.6KB(196.3 →
 * 187.7), 목록 −8.6KB(182.3 → 173.7)가 됐고, admin은 같은 코드가 admin 청크로 자리만 옮겨 −870B(374.9 →
 * 374.0 — 공유 청크 셋에 흩어져 있던 query-core가 한 청크에 모여 더 잘 압축된다)다. 하한에 걸린 그룹은
 * 없지만, 185·207을 두면 Provider가 루트로 돌아와도 예산 안에 숨는다. 그래서 공개 6줄과 `/posts/`를 새 최대
 * ×1.05로 내렸다(185 → 173, 207 → 198). CSS는 그대로다 — 줄 주석의 옛 값(27.9, 28.5)은 앞선 빌드부터 실측
 * (28.0, 28.6)과 어긋나 있던 것을 이 빌드의 측정값으로 바꿨다.
 * 2026-10-25 인터랙션 상태(누름 조건·프리셋)를 글 목록·글 상세(#578·#579)가 들어간 release 위에 얹은 빌드로
 * `/posts/`의 CSS만 올렸다: 30.1KB가 예산 30을 넘었다(누름·터치 hover 조건이 +0.2KB, 앞선 두 PR의 본문·상세
 * 스타일이 나머지). 새 최대 ×1.05로 32. 다른 그룹의 CSS(29.5)는 예산 안이라 그대로다.
 * 2026-10-24 admin을 자기 셸(관리자 바)과 분석 화면(목록 + 글 통계 패널)으로 다시 그린 빌드로 갱신:
 * `/admin/` 최대 JS 378.8 → 385.0KB(+6.2). 예전엔 목록 페이지(개요 차트·아코디언)와 글별 페이지
 * (상세 차트)가 따로였는데, 이제 admin 48쪽 중 분석 화면 46쪽(목록 1 + 글 45)이 모두 목록과 패널(시간대
 * 막대·일별 영역 차트, 시트용 모달 훅)을 함께 싣는다 — 예산(398, 여유 3.4%)은 그대로. 공개 그룹은 루트 레이아웃의 셸 고르기
 * (`ShellSwitch`)로 JS +0.3KB, admin 카드·표의 원자 클래스로 CSS +0.2KB — 예산은 그대로.
 * 2026-10-24 admin에 모션(카드 진입·패널·시트·값 교체·정렬 교차·세그먼트 표식·막대 자람)을 넣은 빌드로
 * 갱신: 움직임을 CSS(keyframes·전환·View Transition 규칙)로 내고 새 훅·의존성이 없어 JS는 `/admin/`
 * 최대 385.0 → 386.0KB(+1.0)이고 공개 그룹 JS는 그대로다. 대신 CSS는 한 장을 모든 페이지가 받아 전
 * 그룹이 +0.7KB(최대 28.9KB, `/posts/`) — admin View Transition 규칙 20개·keyframes 6개가 0.28KB, 나머지가
 * 진입·표식·막대의 원자 클래스다. 예산(30)은 그대로지만 남은 여유가 1.1KB라 다음 admin 스타일은 공개
 * 페이지 CSS 예산과 겨룬다.
 * 2026-10-25 admin 검증 수정(대시보드를 목업 순서로 — 태그 분포를 둘째 줄로, 「모든 글」 표를 맨 아래로 —,
 * 패널 닫기 퇴장·'고른 글 없음' 페이드, 일별 차트의 빈 날 0 채우기, 건너뛰기 링크) 빌드로 갱신: `/admin/` 최대
 * JS 386.0 → 387.1KB(+1.1 — 분석 화면이 새로고침 버튼·건너뛰기 링크 모듈, 빈 날 채우기·기간 오류 안내, 표의
 * 링크 분기를 더 싣는다. 항목별로 나눠 재지는 않았다), 공개 그룹 JS는 그대로. CSS는 전 그룹 +0.1KB(최대 29.0KB, `/posts/` — 퇴장·페이드
 * View Transition 규칙 셋과 원자 클래스). 예산은 그대로이고 CSS 여유는 1.0KB다.
 * 2026-10-25 admin 차트의 Recharts 그리기 애니메이션을 끄고 등장을 CSS(Recharts 래퍼의 keyframes)로 바꾼
 * 빌드로 갱신: JS는 `/admin/` 최대 387.0 → 387.1KB(같은 날 바꾸기 전 빌드 대비), 공개 그룹은 그대로. CSS는 그
 * 등장 규칙 셋(래퍼 자손 셀렉터)으로 전 그룹 +0.1KB(최대 29.1KB, `/posts/`) — 예산은 그대로이고 CSS 여유는 0.9KB다.
 * 2026-10-25 대시보드의 일별 조회수 차트를 `next/dynamic`으로 나눈 빌드로 갱신: 대시보드(`/admin/`) 첫 로드 JS는
 * 377.6 → 268.4KB(−109.2 — Recharts가 빠졌다)지만 그룹 최대는 분석 화면이라 387.1 → 387.6KB(+0.5 — 차트
 * 모듈이 지연·정적 import 양쪽에서 쓰여 따로 떨어진 청크 하나와 그 로더) — 예산은 그대로.
 * 2026-10-25 admin 차트가 CSS로 움직이는(선·면 와이프, 막대 자람) 빌드로 갱신: JS는 `/admin/` 최대 387.6 → 387.8KB(같은
 * 날 바꾸기 전 빌드 대비 — 기간 키 한 줄), 공개 그룹은 그대로. CSS는 keyframes 둘과 래퍼 자손 규칙 둘로 전 그룹 +0.2KB(최대 29.2KB,
 * `/posts/`) — 예산은 그대로이고 CSS 여유는 0.8KB다.
 * 2026-10-25 admin 관리자 바에 테마 토글(사이트 헤더와 같은 `ThemeToggle`)을 단 빌드로 갱신: JS는 `/admin/` 최대
 * 387.8 → 388.0KB(+0.2), 공개 그룹도 +0.2KB(176.5 → 176.7, `/posts/` 239.4 → 239.6 — 토글이 `className`을 받는다).
 * CSS는 그대로(28.6, 최대 29.2KB `/posts/`) — 예산은 그대로.
 * 2026-10-25 admin 재작성(관리자 바 셸·분석 화면·모션·테마 토글)을 글 목록·글 상세·인터랙션 상태가 들어간
 * release에 합친 빌드로 갱신: CSS는 한 장을 모든 페이지가 받아 전 그룹 +0.9KB다(공개 29.5 → 30.4,
 * `/posts/` 30.1 → 31.1 — admin의 원자 클래스·View Transition 규칙·keyframes). 공개 그룹의 CSS 예산 30을
 * 넘어 새 최대 ×1.05로 32, `/posts/`는 33으로 올렸다. JS는 `/admin/` 최대 374.0 → 384.4KB(+10.4 — 분석
 * 화면의 목록·패널·차트가 한 페이지에 모였다), 공개 그룹 +0.9KB(루트의 셸 고르기와 테마 토글의 className) —
 * JS 예산은 그대로.
 * 그룹이 새로 생기면(새 라우트) 예산이 없어서, 라우트가
 * 사라지면 예산이 죽어서, 측정 최대가 상한의 80% 아래로 내려가면 예산이 느슨해서
 * (`budget-slack`) 빌드가 실패한다.
 *
 * **예산을 올릴 때**: 무게를 더하는 바로 그 PR에서 숫자를 고치고, 주석의 측정값·
 * 날짜와 함께 무엇이 얼마나 늘었는지 적는다. `pnpm measure-bundle`이 그룹별
 * 수치를, 실패 메시지가 가장 큰 파일들을 보여 준다. 무게를 덜어 `budget-slack`에
 * 걸리면 같은 방식으로 내린다 — 여유가 크게 남으면 회귀가 그 안에 숨는다.
 */
export const BUNDLE_BUDGETS = [
  // 165.8 KB / 30.4 KB
  { group: '/', jsGzipKB: 173, cssGzipKB: 32 },
  // 189.4 KB / 31.1 KB — 목록과 글 상세 46쪽의 최대(글 상세. mermaid·Giscus는 지연 로드라 밖)
  { group: '/posts/', jsGzipKB: 198, cssGzipKB: 33 },
  // 165.0 KB / 30.4 KB
  { group: '/about/', jsGzipKB: 173, cssGzipKB: 32 },
  // 165.8 KB / 30.4 KB
  { group: '/series/', jsGzipKB: 173, cssGzipKB: 32 },
  // 165.0 KB / 30.4 KB
  { group: '/privacy/', jsGzipKB: 173, cssGzipKB: 32 },
  // 165.0 KB / 30.4 KB — 정적 404(`404-page` 처리)
  { group: '/404/', jsGzipKB: 173, cssGzipKB: 32 },
  // 165.0 KB / 30.4 KB — Next가 함께 내보내는 not-found 라우트
  { group: '/_not-found/', jsGzipKB: 173, cssGzipKB: 32 },
  // 384.4 KB / 30.4 KB — admin 48쪽의 최대(분석 화면 — 목록 1 + 글별 45쪽이 같은 화면이라 무게가 같다)
  { group: '/admin/', jsGzipKB: 398, cssGzipKB: 32 },
] as const satisfies BundleBudgetsConfig;

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
  locale: SITE_LOCALE,
  logo: SITE_LOGO,
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
      path: SERIES_PATH,
      label: '시리즈 목록',
      summary: 'Multi-part series, each readable in order from part 1.',
    },
    {
      path: ABOUT_PATH,
      label: '소개',
      summary:
        'Author profile, open source contributions, and conference talks.',
    },
  ],
} as const satisfies LlmsDocsConfig;
