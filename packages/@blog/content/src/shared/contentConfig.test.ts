import { expect, test } from 'vitest';
import { sep } from 'node:path';
import {
  DEFAULT_LLMS,
  DEFAULT_OG_SIZE,
  DEFAULT_SITEMAP,
  defineContent,
  type ContentUserConfig,
} from './contentConfig.ts';
import { SUPPORTED_FENCE_LABELS } from './prismLanguages.ts';
import { TEST_VALUES, defineTestContent } from './testValues.ts';
import { resolveContentPaths } from './contentPaths.ts';

/** 테스트 픽스처 루트 — 경로 무관 검증에 쓰는 임의 절대 경로 */
const FIXTURE_ROOT = `${sep}tmp${sep}app`;

// ── 사이트 고유 값: 기본값 없이 그대로 실린다 ────────────────────────────────

test('site·author·timezone·diagramNames는 준 값이 그대로 설정에 실린다', () => {
  // 패키지에는 이 축들의 기본값이 없다 — 있으면 그 값이 곧 특정 사이트의
  // 하드코딩이고, 예전엔 소비처가 설정 대신 그 리터럴을 직접 읽고 있었다.
  const config = defineTestContent({ root: FIXTURE_ROOT });
  expect(config.site).toStrictEqual(TEST_VALUES.site);
  expect(config.author).toStrictEqual(TEST_VALUES.author);
  expect(config.timezone).toStrictEqual(TEST_VALUES.timezone);
  expect([...config.registries.diagramNames]).toStrictEqual([
    ...TEST_VALUES.diagramNames,
  ]);
});

test('사이트와 무관한 축에는 기본값이 남아 있다', () => {
  const config = defineTestContent({ root: FIXTURE_ROOT });
  expect(config.seo.titleMaxLength).toBe(60);
  expect(config.seo.descriptionMinLength).toBe(120);
  expect(config.seo.descriptionMaxLength).toBe(160);
  expect(config.registries.supportedFenceLabels).toBe(SUPPORTED_FENCE_LABELS);
  expect(config.dirs.content).toBe('../posts');
});

// ── defineContent: root 검증 ─────────────────────────────────────────────────

test('root 없이 호출하면 defineContent가 던진다 (하드코딩 폴백 없음)', () => {
  // 타입은 root를 필수로 강제하지만, JS 소비자·잘못된 config 파일을 위해
  // 런타임에서도 막는다.
  expect(() => defineContent({} as unknown as ContentUserConfig)).toThrow(
    /root/,
  );
});

test('상대 경로 root는 거부한다 (cwd 의존 금지)', () => {
  expect(() => defineTestContent({ root: './apps/blog/web' })).toThrow(
    /file:\/\/ URL 또는 절대 경로/,
  );
});

test('file:// URL root(import.meta.url 관례)를 받는다', () => {
  const config = defineTestContent({
    root: 'file:///tmp/app/content.config.mts',
  });
  expect(config.root).toBe('file:///tmp/app/content.config.mts');
});

// ── defineContent: 병합 규칙 ─────────────────────────────────────────────────

test('기본값이 있는 그룹의 부분 오버라이드는 나머지를 기본값으로 유지한다', () => {
  const config = defineTestContent({
    root: FIXTURE_ROOT,
    seo: { titleMaxLength: 70 },
  });
  expect(config.seo.titleMaxLength).toBe(70);
  expect(config.seo.descriptionMaxLength).toBe(160);
});

test('seo.titleSuffix는 명시하지 않으면 site.name에서 파생된다', () => {
  const derived = defineTestContent({ root: FIXTURE_ROOT });
  expect(derived.seo.titleSuffix).toBe(` | ${TEST_VALUES.site.name}`);
  const explicit = defineTestContent({
    root: FIXTURE_ROOT,
    seo: { titleSuffix: ' — 별도 접미사' },
  });
  expect(explicit.seo.titleSuffix).toBe(' — 별도 접미사');
});

test('registries: 사이트 고유 축은 준 값 그대로, 펜스 라벨만 기본값', () => {
  // diagramNames에는 기본값이 없다 — 어떤 다이어그램을 이름으로 부를 수 있는지는
  // 컴포넌트 매핑을 가진 앱만 아는 값이다.
  const config = defineContent({
    root: FIXTURE_ROOT,
    site: TEST_VALUES.site,
    author: TEST_VALUES.author,
    timezone: TEST_VALUES.timezone,
    og: { palette: TEST_VALUES.ogPalette },
    registries: { diagramNames: ['only-this'] },
  });
  expect([...config.registries.diagramNames]).toStrictEqual(['only-this']);
  expect(config.registries.supportedFenceLabels).toBe(SUPPORTED_FENCE_LABELS);
});

test('중첩 객체(og.palette, llms.facts)도 부분 병합된다', () => {
  const config = defineTestContent({
    root: FIXTURE_ROOT,
    og: { palette: { accent: '#FF0000' } },
    llms: { facts: { speaking: 'somewhere' } },
  });
  expect(config.og.palette.accent).toBe('#FF0000');
  // 덮지 않은 색은 픽스처 그대로 — 패키지에는 기본 팔레트가 없다.
  expect(config.og.palette.paper).toBe(TEST_VALUES.ogPalette.paper);
  expect(config.llms.facts.speaking).toBe('somewhere');
  // facts는 전부 선택 항목이라, 주지 않은 항목은 채워지지 않는다.
  expect(config.llms.facts.languageFull).toBeUndefined();
});

test('llms 소개 산문은 안 주면 site.description에서 파생된다', () => {
  // `seo.titleSuffix`가 `site.name`에서 파생되는 것과 같은 자리 — 소비자가 이미
  // 선언한 값이 있으면 패키지가 남의 사이트 산문을 기본값으로 들 이유가 없다.
  const derived = defineTestContent({ root: FIXTURE_ROOT });
  expect(derived.llms.indexIntro).toBe(TEST_VALUES.site.description);
  expect(derived.llms.fullIntro).toBe(TEST_VALUES.site.description);

  const explicit = defineTestContent({
    root: FIXTURE_ROOT,
    llms: { indexIntro: '색인용 소개', fullIntro: '전문용 소개' },
  });
  expect(explicit.llms.indexIntro).toBe('색인용 소개');
  expect(explicit.llms.fullIntro).toBe('전문용 소개');
});

test('사이트 고유 축에는 기본값이 없다 (og 팔레트·sitemap 정적 페이지·우선순위)', () => {
  // 이 축들은 예전에 패키지가 이 저장소의 데이터를 기본값으로 들고 있던 자리다.
  // 지금은 소비자가 주지 않으면 존재하지 않거나(필수) 비어 있다.
  //
  // staticPages가 비어 있다는 게 특히 중요하다 — 예전엔 `/about/`이 sitemap
  // 생성기에 리터럴로 박혀 있어서, about 페이지가 없는 소비자도 없는 URL을
  // 색인에 내보냈다. 언제나 나가는 정적 URL은 패키지가 소유한 `/`·`/posts/`뿐이다.
  expect(DEFAULT_SITEMAP.staticPages).toStrictEqual([]);
  expect(DEFAULT_SITEMAP.highPriorityFolders).toStrictEqual([]);
  expect(DEFAULT_SITEMAP.highPrioritySlugs).toStrictEqual([]);
  expect(DEFAULT_LLMS.facts).toStrictEqual({});
  expect(Object.keys(DEFAULT_OG_SIZE)).toStrictEqual(['width', 'height']);
});

test('llms.docs는 링크 항목 단위로 부분 병합된다', () => {
  const config = defineTestContent({
    root: FIXTURE_ROOT,
    llms: { docs: { home: { label: '홈', summary: '바뀐 설명.' } } },
  });
  expect(config.llms.docs.home.summary).toBe('바뀐 설명.');
  // 주지 않은 항목은 픽스처 그대로 (기본값이 아니라 — defineTestContent 참고).
  expect(config.llms.docs.full.summary).toBe('Test full text.');
});

test('llms.docs 기본값에는 사이트·저자 이름이 없다', () => {
  // 이 축의 기본값은 소비자를 모르는 중립 문구여야 한다. 예전엔 홈 링크 설명이
  // 생성기에 리터럴로 박혀 있어서 덮을 수단 자체가 없었다.
  const defaults = Object.values(DEFAULT_LLMS.docs);
  for (const { label, summary } of defaults) {
    expect(/Frontend Lab|Sangwook|한상욱/.test(`${label} ${summary}`)).toBe(
      false,
    );
  }
});

// ── 산출 디렉터리 상호 배타 검증 ─────────────────────────────────────────────

test('outputDirs: media/thumbs가 같으면 defineContent가 던진다', () => {
  // sync-posts의 orphan 삭제(.webp 포함)와 thumbnails 생성이 병렬로 돌므로,
  // 같은 디렉터리는 생성물이 지워지는 조용한 파손이다.
  expect(() =>
    defineTestContent({ root: FIXTURE_ROOT, dirs: { thumbs: 'public/posts' } }),
  ).toThrow(/겹칩니다/);
});

test('outputDirs: 포개진 디렉터리(media 안의 thumbs)도 거부한다', () => {
  expect(() =>
    defineTestContent({
      root: FIXTURE_ROOT,
      dirs: { thumbs: 'public/posts/thumbs' },
    }),
  ).toThrow(/겹칩니다/);
  // 정규화('./', '..') 우회도 잡는다.
  expect(() =>
    defineTestContent({
      root: FIXTURE_ROOT,
      dirs: { og: 'public/./posts/../posts' },
    }),
  ).toThrow(/겹칩니다/);
});

test('outputDirs: 서로 다른 형제 디렉터리는 통과한다', () => {
  const config = defineTestContent({
    root: FIXTURE_ROOT,
    dirs: { thumbs: 'public/thumbs2' },
  });
  expect(config.dirs.thumbs).toBe('public/thumbs2');
});

// ── resolveContentPaths ──────────────────────────────────────────────────────

test('resolveContentPaths: 절대 경로 root 기준 절대 경로를 만든다', () => {
  const paths = resolveContentPaths(defineTestContent({ root: FIXTURE_ROOT }));
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
  expect(paths.postsDir).toBe(`${sep}tmp${sep}posts`);
  expect(paths.publicDir).toBe(`${sep}tmp${sep}app${sep}public`);
  expect(paths.outDir).toBe(`${sep}tmp${sep}app${sep}out`);
  expect(paths.mediaOutDir).toBe(`${sep}tmp${sep}app${sep}public${sep}posts`);
});

test('resolveContentPaths: file:// 파일 URL root는 그 파일의 디렉터리가 앵커다', () => {
  const paths = resolveContentPaths(
    defineTestContent({ root: 'file:///tmp/app/content.config.mts' }),
  );
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
  expect(paths.postsDir).toBe(`${sep}tmp${sep}posts`);
});

test('resolveContentPaths: 후행 슬래시 디렉터리 URL은 그 디렉터리 자체가 앵커다', () => {
  const paths = resolveContentPaths(
    defineTestContent({ root: 'file:///tmp/app/' }),
  );
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
});
