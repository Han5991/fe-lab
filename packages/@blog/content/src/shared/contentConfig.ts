/**
 * 콘텐츠 파이프라인 설정 표면 — `defineContent({...})`.
 *
 * 흩어져 있던 하드코딩(사이트 정체성·SEO 예산·타임존·경로·레지스트리·OG 팔레트·
 * llms 산문)을 한 곳으로 모은 **단일 출처**입니다.
 *
 * **사이트 고유 값에는 기본값이 없습니다** — `root`(경로 앵커)와 같은 이유로,
 * 어떤 기본값이든 특정 사이트의 하드코딩이기 때문입니다. 그래서 `root`·`site`·
 * `author`·`timezone`·`registries.diagramNames`가 필수 항목이고, 값 자체는
 * 소비자(앱)의 `content.values.mts`가 소유합니다. 예전엔 이 파일이 그 값들의
 * 기본값을 들고 있었는데, 소비처 대부분이 설정이 아니라 같은 리터럴을 **직접**
 * import해서 — 오버라이드를 넣어도 화면·산출물은 그대로인 거짓 표면이었습니다.
 * 기본값이 남은 것은 **사이트와 무관한 값뿐입니다** — SEO 길이 예산, 펜스 라벨,
 * 경로 관례, OG 카드 규격(1200×630). 한 사이트의 데이터였던 나머지(og 팔레트·
 * llms 산문·sitemap 우선순위)는 필수 항목이 되었거나(`ContentValues`), 중립적인
 * 빈 값으로 바뀌었습니다(sitemap 우선순위·llms facts). 소개 산문처럼
 * 소비자가 이미 선언한 값에서 파생할 수 있는 것은 파생합니다(`site.description`).
 *
 * 이 모듈은 **서버·빌드 전용**입니다 — 클라이언트 컴포넌트가 import하면
 * 설정 객체 전체(og 팔레트·llms 산문·경로)가 번들에 실립니다(defineContent
 * 호출 결과라 번들러가 미사용 필드를 털지 못합니다). 클라이언트도 보는 값은
 * 앱의 값 모듈에서 직접 가져갑니다. 경로를 절대경로로 푸는 쪽은 node 전용인
 * `contentPaths.ts`입니다.
 */
import { SUPPORTED_FENCE_LABELS } from './prismLanguages.ts';

// ── 그룹별 타입 ──────────────────────────────────────────────────────────────

export interface SiteConfig {
  /** 프로덕션 origin. 후행 슬래시 없음 */
  url: string;
  name: string;
  description: string;
  /** 홈 히어로 등에서 쓰는 긴 소개 */
  descriptionExpanded: string;
  /**
   * 글별 OG 카드가 없을 때 쓰는 기본 공유 이미지.
   * (`.jpg`인 사연은 소비자 값 모듈의 OG_DEFAULT_IMAGE 주석에 있다.)
   */
  ogDefaultImage: string;
  /** 사이트 내부 RSS 경로. 절대 URL은 `${url}${rssPath}`로 조합 */
  rssPath: string;
  /**
   * `/about/` 페이지를 마지막으로 **손으로 고친** 날짜 ('YYYY-MM-DD').
   * 손으로 관리하는 이유는 소비자 값 모듈의 ABOUT_PAGE_MODIFIED 주석에 있다.
   */
  aboutPageModified: string;
  /** merged PR 수 폴백값. CI가 NEXT_PUBLIC_PR_COUNT로 실제 값을 주입한다 */
  mergedPrCountFallback: string;
}

export interface AuthorConfig {
  name: string;
  /** JSON-LD alternateName — 한글 이름 */
  alternateName: string;
  role: string;
  github: string;
  linkedin: string;
}

export interface SeoConfig {
  /** 모든 페이지 `<title>`에 붙는 접미사. 기본값은 ` | ${site.name}` */
  titleSuffix: string;
  /** 검색 결과에서 잘리지 않는 `<title>` 길이 상한(접미사 포함) */
  titleMaxLength: number;
  /** description 권장 길이. 너무 짧으면 스니펫이 비고, 너무 길면 잘린다 */
  descriptionMinLength: number;
  /** repository.ts가 excerpt 자동 발췌 길이로도 재사용한다 */
  descriptionMaxLength: number;
}

export interface TimezoneConfig {
  /** IANA 타임존 이름 — Intl.DateTimeFormat용 */
  iana: string;
  /** 'YYYY-MM-DD'를 이 타임존 자정으로 볼 때 붙이는 ISO offset */
  isoOffset: string;
  /**
   * UTC 대비 밀리초 오프셋. `msUntilKSTMidnight`가 산술에 쓴다 —
   * IANA 이름만으로는 이 계산을 못 하므로 별도 필드로 둔다.
   * 셋은 같은 타임존을 가리켜야 한다(서로 파생 검증은 하지 않는다).
   */
  utcOffsetMs: number;
}

export interface RuntimeConfig {
  /**
   * dev 서버(next dev) 판정.
   *
   * `=== 'development'`로 정확히 비교한다(`!== 'production'`이 아니라):
   * 정적 산출물을 만드는 스크립트들(prebuild/predev:web의 sitemap·rss·
   * search-index·llms-full·og-images)은 tsx로 직접 실행되어 NODE_ENV가
   * **undefined**다. 느슨하게 비교하면 그 스크립트들이 dev로 오인되어
   * draft가 sitemap과 RSS에 실려 나간다. next dev만 'development'를 설정한다.
   */
  isDevelopment: () => boolean;
}

export interface RegistriesConfig {
  /**
   * 이름으로 부를 수 있는 다이어그램 목록. **기본값이 없다** — 이름 목록과
   * 컴포넌트 매핑(`src/components/diagram/registry.ts`)의 소유자는 앱이고,
   * 패키지는 검증(lint:posts의 unknown-hero-diagram)에 쓸 이름만 받는다.
   */
  diagramNames: readonly string[];
  /** 코드 펜스 라벨 허용 목록. 기본값은 prismLanguages.ts에서 파생 */
  supportedFenceLabels: ReadonlySet<string>;
}

/**
 * 경로는 전부 **앱 루트 기준 상대 경로**로 적는다. 앱 루트는 `root`가 정하고,
 * 절대경로로 푸는 것은 node 전용 `contentPaths.ts`(`resolveContentPaths`)의 몫이다.
 */
export interface DirsConfig {
  /** 마크다운 원본 디렉터리 */
  content: string;
  public: string;
  /** incremental 생성기의 manifest 캐시 */
  cache: string;
  /** next build 산출물 — check-seo가 검사하는 디렉터리 */
  out: string;
  /** sync-posts가 포스트 미디어를 복사하는 곳 (orphan 삭제 있음) */
  media: string;
  /** generate-thumbnails 산출물 (orphan 삭제 있음) */
  thumbs: string;
  /** generate-og-images 산출물 (orphan 삭제 있음) */
  og: string;
}

export interface SitemapConfig {
  /**
   * 고가치 주제 **폴더** — 우선순위 0.75. 시리즈가 아니라 폴더 기준이다.
   * (`typescript` 폴더에는 `_series.yml`이 없어 시리즈가 아니지만 우선순위는
   * 받아야 한다 — generate-sitemap.ts 주석 참고.)
   */
  highPriorityFolders: readonly string[];
  /** 고가치 개별 글 slug — 우선순위 0.8 */
  highPrioritySlugs: readonly string[];
}

export interface OgPalette {
  paper: string;
  ink: string;
  inkMeta: string;
  inkRule: string;
  accent: string;
  pillBorder: string;
}

export interface OgConfig {
  width: number;
  height: number;
  /**
   * 다크 테마 토큰의 hex 값. satori/resvg는 CSS 변수도 oklch도 못 읽어서
   * blog-preset.ts의 `_dark` 값을 손으로 옮겨 둔다 — 팔레트를 바꾸면 여기도
   * 같이 고쳐야 소셜 미리보기가 사이트와 어긋나지 않는다.
   */
  palette: OgPalette;
}

export interface ThumbnailsConfig {
  /** 표시 최대 폭(FeaturedPost가 컨테이너 전체 폭). 작은 원본은 확대하지 않음 */
  maxWidth: number;
  webpQuality: number;
}

/**
 * llms.txt `## Docs` 절의 링크 한 줄 — `- [label](url): summary`.
 *
 * **URL은 여기 없다.** 경로 계약(`/`·`/posts/`·`/series/`·`/about/`·
 * `/llms-full.txt`)은 패키지가 소유하고(`src/post/urls.ts`), 소비자가 정하는 것은
 * 표시 라벨과 설명뿐이다.
 */
export interface LlmsDocEntry {
  /** 마크다운 링크의 표시 텍스트 */
  label: string;
  /** 링크 옆 한 줄 설명. `{count}`는 발행 글 수로 치환된다 */
  summary: string;
}

/** `## Docs` 절의 다섯 링크. 항목 자체는 고정이고 문구만 소비자가 소유한다 */
export interface LlmsDocsConfig {
  /** 사이트 루트 */
  home: LlmsDocEntry;
  /** 전체 글 목록(archiveUrl) */
  archive: LlmsDocEntry;
  /** 시리즈 목록 */
  series: LlmsDocEntry;
  /** 소개 페이지 */
  about: LlmsDocEntry;
  /** 전문 텍스트(llms-full.txt) */
  full: LlmsDocEntry;
}

export interface LlmsConfig {
  /** llms.txt 링크 옆 한 줄 설명의 최대 길이. 색인이므로 짧게 */
  summaryMaxLength: number;
  /** llms.txt(색인) 머리의 블로그 소개 산문 */
  indexIntro: string;
  /**
   * `## Docs` 절 다섯 줄의 라벨·설명.
   *
   * 기본값은 사이트를 모르는 중립 문구다 — 예전엔 홈 링크 설명만 생성기에
   * 리터럴로 박혀 있어서(`Frontend Lab … by Sangwook Han`), 설정을 아무리
   * 덮어도 그 한 줄만은 남의 사이트 이름을 내보냈다.
   */
  docs: LlmsDocsConfig;
  /** llms-full.txt(전문) 머리의 블로그 소개 산문 */
  fullIntro: string;
  /** Key Facts 절 — 준 항목만 나간다 */
  facts: LlmsFacts;
}

/**
 * `## Key Facts` 절의 항목들 — **전부 선택**이다.
 *
 * 오픈소스 이력·발표 이력처럼 **소비자만 쓸 수 있는 내용**이라 중립 기본값이
 * 존재할 수 없다. 그렇다고 필수로 만들면 새 소비자가 남의 이력을 지우는
 * 것부터 해야 한다. 그래서 준 항목만 줄로 나가고, 없는 항목은 줄 자체가
 * 생략된다(`generate-llms.ts`의 `factLines`).
 */
export interface LlmsFacts {
  /** llms.txt용 Language 항목 */
  languageIndex?: string;
  /** llms-full.txt용 Language 항목 */
  languageFull?: string;
  openSource?: string;
  /** llms.txt(색인)용 — 기여 방법까지 포함한 긴 문장 */
  notableContributionIndex?: string;
  /** llms-full.txt용 짧은 문장 */
  notableContributionFull?: string;
  speaking?: string;
  mainTopics?: string;
}

export interface ContentConfig {
  /**
   * 경로 앵커. `dirs.*`의 상대 경로가 전부 여기 기준으로 풀린다.
   *
   * 관례는 `content.config.ts`에서 `root: import.meta.url` — **설정 파일의 위치
   * 자체가 앵커**가 되어 모노레포/폴리레포 구조와 무관해진다. 받는 형태 둘:
   * - `file://` URL 문자열(`import.meta.url` 관례) — 그 파일이 있는 디렉터리가
   *   앵커. 후행 슬래시가 있으면 디렉터리 URL로 보고 그 디렉터리 자체가 앵커
   * - 절대 디렉터리 경로 — 그대로 앵커 (테스트·CLI 편의)
   *
   * 상대 경로는 받지 않는다 — cwd에 따라 다른 곳을 보게 되는 것이 예전
   * 하드코딩 앵커가 막던 바로 그 사고다.
   */
  root: string;
  site: SiteConfig;
  author: AuthorConfig;
  seo: SeoConfig;
  timezone: TimezoneConfig;
  runtime: RuntimeConfig;
  registries: RegistriesConfig;
  dirs: DirsConfig;
  sitemap: SitemapConfig;
  og: OgConfig;
  thumbnails: ThumbnailsConfig;
  llms: LlmsConfig;
}

/**
 * 소비자가 **반드시 선언해야 하는 사이트 고유 값**의 계약.
 *
 * 관례는 앱 루트의 `content.values.mts` — 순수 리터럴만 담고, 그 옆
 * `content.config.mts`가 `defineContent`에 넘긴다. 값 모듈이 값 import 없이
 * 이 계약을 만족하는지 확인할 수 있도록(`satisfies`), 그룹 타입은 각각
 * 따로도 공개한다.
 *
 * 여기 모인 것들의 공통점은 **어떤 기본값도 특정 사이트의 하드코딩**이라는
 * 점이다 — `root`와 같은 이유로 기본값을 두지 않는다. `diagramNames`가 여기
 * 있는 이유는 조금 다르다: 실제 소유자는 이름→컴포넌트 매핑을 가진 앱이고,
 * 패키지는 검증(`lint:posts`의 `unknown-hero-diagram`)에 쓸 이름만 필요하다.
 */
export interface ContentValues {
  site: SiteConfig;
  author: AuthorConfig;
  timezone: TimezoneConfig;
  /** 이름으로 부를 수 있는 다이어그램. 컴포넌트 매핑은 앱이 갖는다 */
  diagramNames: readonly string[];
  /**
   * OG 카드 팔레트 — 앱 디자인 토큰(`blog-preset.ts`의 다크 값)의 hex 사본이다.
   * 기본값을 두면 소셜 미리보기가 사이트와 다른 색으로 조용히 나가므로 필수다.
   */
  ogPalette: OgPalette;
}

/**
 * defineContent가 받는 설정 — 사이트 고유 값(`ContentValues`)과 `root`는 필수,
 * 나머지는 그룹별로 얕은 Partial.
 */
export interface ContentUserConfig extends Pick<
  ContentValues,
  'site' | 'author' | 'timezone'
> {
  /** 경로 앵커 — `ContentConfig['root']` 참고. 관례는 `import.meta.url` */
  root: string;
  /**
   * 사이트 고유 축(`diagramNames`)은 필수, 사이트와 무관한
   * `supportedFenceLabels`만 선택.
   */
  registries: Partial<Pick<RegistriesConfig, 'supportedFenceLabels'>> &
    Pick<RegistriesConfig, 'diagramNames'>;
  /** 크기(1200×630)는 OG 규격이라 선택, 팔레트는 앱 디자인이라 필수 */
  og: Partial<Omit<OgConfig, 'palette'>> & Pick<OgConfig, 'palette'>;
  seo?: Partial<SeoConfig>;
  runtime?: Partial<RuntimeConfig>;
  dirs?: Partial<DirsConfig>;
  sitemap?: Partial<SitemapConfig>;
  llms?: Partial<Omit<LlmsConfig, 'facts' | 'docs'>> & {
    facts?: LlmsFacts;
    /** 항목 단위로 병합된다 — 준 링크만 갈아 끼우고 나머지는 기본값 */
    docs?: Partial<LlmsDocsConfig>;
  };
  thumbnails?: Partial<ThumbnailsConfig>;
}

// ── 기본값 ───────────────────────────────────────────────────────────────────
// 사이트 고유 값(`ContentValues`)에는 기본값이 없다. 여기 남는 것은 **어떤
// 사이트에서도 같은 값**뿐이다 — SEO 길이 예산, 펜스 라벨, 경로 관례, OG 규격.
// 사이트마다 다른 축은 비워 두거나(sitemap 우선순위·llms facts) 소비자가 이미
// 준 값에서 파생한다(llms 소개 산문 ← site.description).
//
// 아래 DEFAULT_* 슬라이스는 순수 계산 빌더(sitemap·thumbnails·seo)가 파라미터
// 기본값으로 재사용한다 — 진입점(main)은 항상 컨텍스트의 설정을 명시적으로
// 넘기고, 기본값은 테스트·단독 사용 편의다. DEFAULTS와 같은 객체를 공유하므로
// 두 벌이 어긋날 수 없다. og는 예외로 규격(DEFAULT_OG_SIZE)만 기본이 있고
// 팔레트는 언제나 인자로 온다.

/**
 * SEO 길이 예산의 기본값. 검색 결과에서 잘리지 않는 상한이라 사이트와 무관하다.
 *
 * `titleSuffix`는 여기 없다 — `site.name`에서 파생되므로 사이트를 알아야 정해진다
 * (defineContent가 만든다). 예산을 보는 두 게이트(`validate-posts`·`check-seo`)는
 * 해석된 설정의 `seo`를 받아 쓴다.
 */
export const DEFAULT_SEO: Omit<SeoConfig, 'titleSuffix'> = {
  titleMaxLength: 60,
  descriptionMinLength: 120,
  descriptionMaxLength: 160,
};

/**
 * 우선순위 튜닝의 기본값은 **비어 있다** — 어떤 폴더·글이 고가치인지는 그
 * 사이트의 편집 판단이다. 비워 두면 모든 글이 같은 기본 우선순위를 받는다
 * (sitemap은 그대로 유효하다).
 */
export const DEFAULT_SITEMAP: SitemapConfig = {
  highPriorityFolders: [],
  highPrioritySlugs: [],
};

/**
 * OG 카드 **규격**의 기본값. 1200×630은 소셜 카드 표준이라 사이트와 무관하다.
 *
 * 팔레트는 여기 없다 — 앱 디자인 토큰의 사본이라 `ContentValues.ogPalette`로
 * 필수다. 기본 팔레트를 두면 색을 안 넘긴 소비자의 카드가 남의 사이트 색으로
 * 조용히 나간다(satori는 CSS 변수를 못 읽어 실패조차 하지 않는다).
 */
export const DEFAULT_OG_SIZE: Omit<OgConfig, 'palette'> = {
  width: 1200,
  height: 630,
};

export const DEFAULT_THUMBNAILS: ThumbnailsConfig = {
  maxWidth: 1200,
  webpQuality: 80,
};

/**
 * llms 산문의 기본값.
 *
 * `indexIntro`·`fullIntro`는 여기 없다 — `seo.titleSuffix`가 `site.name`에서
 * 파생되는 것과 같이, 소비자가 이미 준 `site.description`에서 파생한다.
 * `facts`는 비어 있다: 오픈소스·발표 이력에 중립 기본값은 없고, 준 항목만
 * 줄로 나간다.
 */
export const DEFAULT_LLMS: Omit<LlmsConfig, 'indexIntro' | 'fullIntro'> = {
  summaryMaxLength: 140,
  // 라벨·설명 기본값은 **사이트를 모르는 중립 문구**다. 옆의 산문(indexIntro·
  // facts)이 아직 한 사이트의 데이터인 것과 달리, 여기엔 사이트 이름도 저자
  // 이름도 넣지 않는다 — 그 리터럴이 생성기에 박혀 있던 것이 원래 문제였다.
  docs: {
    home: { label: 'Home', summary: 'Blog home.' },
    archive: {
      label: 'All posts',
      summary:
        'Complete archive of {count} articles organized by topic and series.',
    },
    series: {
      label: 'Series',
      summary: 'Multi-part series, each readable in order from part 1.',
    },
    about: {
      label: 'About',
      summary: 'Author profile, open source contributions, and talks.',
    },
    full: { label: 'Full text', summary: 'Full post text for retrieval.' },
  },
  facts: {},
};

/**
 * 소비자가 안 주면 쓰는 값. `ContentValues`(사이트 고유)와 `root`는 여기 없다 —
 * 기본값을 두는 순간 특정 사이트의 하드코딩이기 때문이다. `seo.titleSuffix`도
 * 없다(site.name 파생이라 defineContent가 만든다).
 */
const DEFAULTS: Omit<
  ContentConfig,
  'root' | 'site' | 'author' | 'timezone' | 'seo' | 'registries' | 'og' | 'llms'
> & {
  seo: Omit<SeoConfig, 'titleSuffix'>;
  registries: Omit<RegistriesConfig, 'diagramNames'>;
  og: Omit<OgConfig, 'palette'>;
  llms: Omit<LlmsConfig, 'indexIntro' | 'fullIntro'>;
} = {
  seo: DEFAULT_SEO,
  runtime: {
    // 대괄호 접근인 이유: 이 패키지의 tsconfig에는 Next의 ProcessEnv 증강
    // (next-env.d.ts)이 없어 NODE_ENV가 인덱스 시그니처로만 보인다
    // (noPropertyAccessFromIndexSignature). 앱 program에서도 동작은 같다.
    isDevelopment: () => process.env['NODE_ENV'] === 'development',
  },
  registries: {
    supportedFenceLabels: SUPPORTED_FENCE_LABELS,
  },
  dirs: {
    content: '../posts',
    public: 'public',
    cache: '.cache',
    out: 'out',
    media: 'public/posts',
    thumbs: 'public/thumbs',
    og: 'public/og',
  },
  sitemap: DEFAULT_SITEMAP,
  og: DEFAULT_OG_SIZE,
  thumbnails: DEFAULT_THUMBNAILS,
  llms: DEFAULT_LLMS,
};

// ── 검증 ─────────────────────────────────────────────────────────────────────

/**
 * `root` 형태 검증 — 순수 문자열 검사만 한다(node:path를 끌지 않기 위해).
 * 실제 디렉터리 해석은 node 전용 `contentPaths.ts`의 몫.
 */
function assertValidRoot(root: unknown): asserts root is string {
  if (typeof root !== 'string' || root.length === 0) {
    throw new Error(
      'defineContent: root가 필요합니다 — content.config.ts에서 ' +
        '`root: import.meta.url`을 권장합니다(설정 파일 위치가 경로 앵커가 됩니다).',
    );
  }
  const isFileUrl = root.startsWith('file://');
  const isAbsolute = root.startsWith('/') || /^[A-Za-z]:[\\/]/.test(root);
  if (!isFileUrl && !isAbsolute) {
    throw new Error(
      `defineContent: root('${root}')는 file:// URL 또는 절대 경로여야 합니다 — ` +
        '상대 경로는 cwd에 따라 다른 곳을 보게 되므로 받지 않습니다. ' +
        '`root: import.meta.url`을 쓰세요.',
    );
  }
}

/** 상대 경로를 세그먼트 정규화한다 ('a/./b' → 'a/b', 'a/../b' → 'b') — 순수 문자열 연산 */
function normalizeDir(p: string): string {
  const out: string[] = [];
  for (const seg of p.replace(/\\/g, '/').split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..' && out.length > 0 && out[out.length - 1] !== '..') {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join('/');
}

/**
 * 산출 디렉터리 상호 배타 검증.
 *
 * `media`(sync-posts)·`thumbs`(generate-thumbnails)·`og`(generate-og-images)는
 * 각자 자기 디렉터리에서 **orphan 삭제**를 수행하고, build-content phase 2에서
 * 병렬로 돈다. 같은(또는 포개진) 디렉터리를 주면 서로의 생성물을 orphan으로
 * 오인해 지운다 — 설정으로 뚫리는 순간 조용한 파손이 되므로 여기서 막는다.
 */
function assertOutputDirsExclusive(dirs: DirsConfig): void {
  const outputs = [
    ['media', normalizeDir(dirs.media)],
    ['thumbs', normalizeDir(dirs.thumbs)],
    ['og', normalizeDir(dirs.og)],
  ] as const;
  // 값끼리 짝지어 돈다 — 인덱스로 꺼내면 타입이 `| undefined`가 되고, 그걸
  // 좁히는 방법이 단언밖에 없었다.
  for (const [i, [aName, a]] of outputs.entries()) {
    for (const [bName, b] of outputs.slice(i + 1)) {
      const overlaps =
        a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
      if (overlaps) {
        throw new Error(
          `defineContent: dirs.${aName}('${a}')와 dirs.${bName}('${b}')가 겹칩니다 — ` +
            `orphan 삭제가 서로의 생성물을 지우므로 산출 디렉터리는 서로 배타여야 합니다.`,
        );
      }
    }
  }
}

// ── defineContent ────────────────────────────────────────────────────────────

/**
 * 소비자 설정을 기본값 위에 병합해 완전한 ContentConfig를 만든다.
 *
 * 사이트 고유 값(`root`·`site`·`author`·`timezone`·`registries.diagramNames`)은
 * 그대로 실린다 — 기본값이 없으므로 병합할 것도 없다(`ContentValues` 참고).
 * `seo.titleSuffix`를 명시하지 않으면 `site.name`에서 파생된다.
 */
export function defineContent(user: ContentUserConfig): ContentConfig {
  assertValidRoot(user.root);
  const config: ContentConfig = {
    root: user.root,
    site: user.site,
    author: user.author,
    seo: {
      ...DEFAULTS.seo,
      titleSuffix: ` | ${user.site.name}`,
      ...user.seo,
    },
    timezone: user.timezone,
    runtime: { ...DEFAULTS.runtime, ...user.runtime },
    registries: { ...DEFAULTS.registries, ...user.registries },
    dirs: { ...DEFAULTS.dirs, ...user.dirs },
    sitemap: { ...DEFAULTS.sitemap, ...user.sitemap },
    // 팔레트는 필수라 병합할 기본값이 없다 — 준 값이 그대로 실린다.
    og: { ...DEFAULTS.og, ...user.og },
    thumbnails: { ...DEFAULTS.thumbnails, ...user.thumbnails },
    llms: {
      ...DEFAULTS.llms,
      ...user.llms,
      // `seo.titleSuffix`가 `site.name`에서 파생되는 것과 같은 자리다 — 소개
      // 산문을 따로 주지 않으면 이미 선언한 사이트 설명을 그대로 쓴다.
      indexIntro: user.llms?.indexIntro ?? user.site.description,
      fullIntro: user.llms?.fullIntro ?? user.site.description,
      facts: { ...DEFAULTS.llms.facts, ...user.llms?.facts },
      docs: { ...DEFAULTS.llms.docs, ...user.llms?.docs },
    },
  };
  assertOutputDirsExclusive(config.dirs);
  return config;
}
