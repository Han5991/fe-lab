/**
 * 테스트 전용 사이트 값 — **패키지 안의 유일한 "어떤 사이트"**.
 *
 * 프로덕션 소스에는 사이트 고유 값이 하나도 없다(`ContentValues` 참고). 그래서
 * 단위 테스트는 기대값을 어딘가에서 받아야 하는데, 실제 사이트 값을 복제하면
 * 앱과 갈라질 수 있는 두 번째 출처가 다시 생긴다. 대신 **일부러 다른** 픽스처
 * 값을 두고 기대값도 여기서 가져온다 — 테스트가 "설정이 실제로 흐르는가"까지
 * 함께 검증하게 된다. 값이 `blog.sangwook.dev`로 하드코딩돼 있었다면, 소비처가
 * 설정을 무시하고 옛 상수를 읽어도 테스트는 통과했을 것이다.
 *
 * 프로덕션 코드는 이 모듈을 import하지 않는다(배럴에도 없다).
 */
import {
  defineContent,
  type ContentConfig,
  type ContentUserConfig,
  type ContentValues,
  type LlmsDocsConfig,
  type OgConfig,
  type OgPalette,
  type RegistriesConfig,
  type SitemapConfig,
} from './contentConfig.ts';

export const TEST_VALUES: ContentValues = {
  site: {
    url: 'https://blog.test',
    name: 'Test Blog',
    description: '테스트 픽스처 사이트입니다.',
    descriptionExpanded: '테스트 픽스처 사이트의 긴 소개입니다.',
    ogDefaultImage: '/og-default.jpg',
  },
  author: {
    name: 'Test Author',
    alternateName: '테스트',
    role: 'Frontend Engineer',
    github: 'https://github.com/test',
    linkedin: 'https://www.linkedin.com/in/test/',
  },
  /**
   * 이 축만 실제 사이트와 같다 — 저장소의 원고가 KST 기준으로 날짜를 적어서,
   * 실제 원고를 읽는 코퍼스 계약 테스트가 다른 타임존에서는 예약 발행 판정을
   * 다르게 낸다.
   */
  timezone: {
    iana: 'Asia/Seoul',
    isoOffset: '+09:00',
    utcOffsetMs: 9 * 60 * 60 * 1000,
  },
  /** 실제 원고가 `hero:`로 부르는 이름 — 코퍼스 테스트가 이 목록으로 검증한다. */
  diagramNames: ['deploy-pipeline'],
  /** 실제 팔레트와 겹치지 않는 값 — 설정이 렌더까지 흐르는지 보기 위해. */
  ogPalette: {
    paper: '#111111',
    ink: '#EEEEEE',
    inkMeta: '#888888',
    inkRule: '#333333',
    accent: '#00FF00',
    pillBorder: 'rgba(0, 255, 0, 0.4)',
  },
};

/**
 * `llms.txt`의 Docs 절 문구 픽스처.
 *
 * `ContentValues`에는 없는 축이지만(패키지가 중립 기본값을 갖는다) 여기 두는
 * 이유는 같다 — 기본값 그대로 기대하면 "설정이 흐르는가"를 검증하지 못한다.
 * 그래서 기본값과도, 실제 사이트와도 다른 문구를 쓴다.
 */
export const TEST_LLMS_DOCS: LlmsDocsConfig = {
  home: { label: '픽스처 홈', summary: 'Test Blog home by Test Author.' },
  archive: { label: '픽스처 목록', summary: 'Test archive of {count} posts.' },
  full: { label: '픽스처 전문', summary: 'Test full text.' },
  /**
   * 실제 사이트와 같은 두 경로를 쓰되 문구는 픽스처다 — 항목 자체가 생성기
   * 리터럴이 아니라 **설정에서** 온다는 것을 테스트가 확인할 수 있도록.
   */
  extra: [
    { path: '/series/', label: '픽스처 시리즈', summary: 'Test series list.' },
    { path: '/about/', label: '픽스처 소개', summary: 'Test about page.' },
  ],
};

/**
 * sitemap 우선순위 픽스처.
 *
 * 폴더는 **실제 코퍼스에 있는 것**을 하나 고른다 — 코퍼스 계약 테스트가
 * "우선순위는 시리즈가 아니라 폴더로 판정한다"를 실제 원고로 확인하기
 * 때문이다(`typescript` 폴더에는 `_series.yml`이 없다). slug는 반대로 실재하지
 * 않는 이름이라, 실제 사이트 설정을 베껴 온 게 아님이 드러난다.
 */
/** 픽스처 정적 페이지의 lastmod — 테스트가 리터럴을 베끼지 않도록 이름을 준다. */
export const TEST_ABOUT_LASTMOD = '2026-01-01';

export const TEST_SITEMAP: SitemapConfig = {
  /**
   * 실제 사이트와 같은 `/about/`을 쓰되 lastmod는 픽스처 날짜다 — 정적 페이지가
   * 패키지 리터럴이 아니라 **설정에서** 온다는 것을 테스트가 확인할 수 있도록.
   */
  staticPages: [
    { path: '/about/', priority: '0.7', lastmod: TEST_ABOUT_LASTMOD },
  ],
  highPriorityFolders: ['typescript'],
  highPrioritySlugs: ['fixture-high-priority'],
};

/**
 * 테스트가 줄 수 있는 오버라이드.
 *
 * `ContentUserConfig`보다 느슨하다 — 거기서 필수인 축(`registries.diagramNames`,
 * `og.palette`)도 여기서는 선택이다. 픽스처가 이미 채워 두므로, 한 필드를 보려는
 * 테스트가 나머지 필수 필드를 의례적으로 다시 적을 이유가 없다.
 */
export type TestContentOverrides = Omit<
  Partial<ContentUserConfig>,
  'root' | 'registries' | 'og'
> & {
  root: string;
  registries?: Partial<RegistriesConfig>;
  og?: Partial<Omit<OgConfig, 'palette'>> & { palette?: Partial<OgPalette> };
};

/**
 * 픽스처 값 위에 설정을 만든다. `root`만 테스트가 정한다.
 *
 * 그룹 축(`registries`·`og`·`llms`)은 `...overrides` **뒤에** 다시 조립한다 —
 * 스프레드는 그룹을 통째로 갈아 끼우므로, 한 필드만 덮는 테스트가 나머지 픽스처
 * 값을 조용히 날리지 않도록.
 */
export function defineTestContent(
  overrides: TestContentOverrides,
): ContentConfig {
  return defineContent({
    site: TEST_VALUES.site,
    author: TEST_VALUES.author,
    timezone: TEST_VALUES.timezone,
    ...overrides,
    registries: {
      diagramNames: TEST_VALUES.diagramNames,
      ...overrides.registries,
    },
    og: {
      ...overrides.og,
      palette: { ...TEST_VALUES.ogPalette, ...overrides.og?.palette },
    },
    sitemap: { ...TEST_SITEMAP, ...overrides.sitemap },
    llms: {
      ...overrides.llms,
      docs: { ...TEST_LLMS_DOCS, ...overrides.llms?.docs },
    },
  });
}
