import { expect, test } from 'vitest';
import { sep } from 'node:path';
import { CONTENT, defineContent } from './contentConfig.ts';
import { DEFAULT_DIAGRAM_NAMES } from './contentValues.ts';
import { SUPPORTED_FENCE_LABELS } from './prismLanguages.ts';
import {
  SITE_NAME,
  SITE_URL,
  TITLE_SUFFIX,
  SEO_DESCRIPTION_MAX_LENGTH,
} from './constants.ts';
import { CONTENT_PATHS, resolveContentPaths } from './contentPaths.ts';

/** 테스트 픽스처 루트 — 경로 무관 검증에 쓰는 임의 절대 경로 */
const FIXTURE_ROOT = `${sep}tmp${sep}app`;

// ── defineContent: 기본값 = 현재값 ───────────────────────────────────────────

test('defineContent({root})는 현재 사이트 값과 같다 (동작 no-op의 근거)', () => {
  const config = defineContent({ root: FIXTURE_ROOT });
  expect(config.site.url).toBe('https://blog.sangwook.dev');
  expect(config.site.name).toBe('Frontend Lab');
  expect(config.seo.titleSuffix).toBe(' | Frontend Lab');
  expect(config.seo.descriptionMaxLength).toBe(160);
  expect(config.timezone.iana).toBe('Asia/Seoul');
  expect(config.timezone.utcOffsetMs).toBe(9 * 60 * 60 * 1000);
  expect([...config.registries.diagramNames]).toStrictEqual([
    ...DEFAULT_DIAGRAM_NAMES,
  ]);
  expect(config.registries.supportedFenceLabels).toBe(SUPPORTED_FENCE_LABELS);
});

test('값 모듈(constants 재수출)과 설정 인스턴스(CONTENT)는 같은 값을 본다', () => {
  // 클라이언트는 값 모듈을, 서버/빌드는 CONTENT를 읽는다. 오버라이드가 없는
  // 동안 둘은 동일해야 한다 — 갈라지면 contentValues.ts 머리 주석의 제약 위반.
  expect(SITE_URL).toBe(CONTENT.site.url);
  expect(SITE_NAME).toBe(CONTENT.site.name);
  expect(TITLE_SUFFIX).toBe(CONTENT.seo.titleSuffix);
  expect(SEO_DESCRIPTION_MAX_LENGTH).toBe(CONTENT.seo.descriptionMaxLength);
});

// ── defineContent: root 검증 ─────────────────────────────────────────────────

test('root 없이 호출하면 defineContent가 던진다 (하드코딩 폴백 없음)', () => {
  // 타입은 root를 필수로 강제하지만, JS 소비자·잘못된 config 파일을 위해
  // 런타임에서도 막는다.
  expect(() =>
    defineContent({} as unknown as Parameters<typeof defineContent>[0]),
  ).toThrow(/root/);
});

test('상대 경로 root는 거부한다 (cwd 의존 금지)', () => {
  expect(() => defineContent({ root: './apps/blog/web' })).toThrow(
    /file:\/\/ URL 또는 절대 경로/,
  );
});

test('file:// URL root(import.meta.url 관례)를 받는다', () => {
  const config = defineContent({ root: 'file:///tmp/app/content.config.ts' });
  expect(config.root).toBe('file:///tmp/app/content.config.ts');
});

// ── defineContent: 병합 규칙 ─────────────────────────────────────────────────

test('그룹 부분 오버라이드는 나머지 필드를 기본값으로 유지한다', () => {
  const config = defineContent({
    root: FIXTURE_ROOT,
    site: { name: 'Other Lab' },
  });
  expect(config.site.name).toBe('Other Lab');
  expect(config.site.url).toBe('https://blog.sangwook.dev');
});

test('seo.titleSuffix는 명시하지 않으면 site.name에서 파생된다', () => {
  const derived = defineContent({
    root: FIXTURE_ROOT,
    site: { name: 'Other Lab' },
  });
  expect(derived.seo.titleSuffix).toBe(' | Other Lab');
  const explicit = defineContent({
    root: FIXTURE_ROOT,
    site: { name: 'Other Lab' },
    seo: { titleSuffix: ' — 별도 접미사' },
  });
  expect(explicit.seo.titleSuffix).toBe(' — 별도 접미사');
});

test('중첩 객체(og.palette, llms.facts)도 부분 병합된다', () => {
  const config = defineContent({
    root: FIXTURE_ROOT,
    og: { palette: { accent: '#FF0000' } },
    llms: { facts: { speaking: 'somewhere' } },
  });
  expect(config.og.palette.accent).toBe('#FF0000');
  expect(config.og.palette.paper).toBe('#0B0D10');
  expect(config.llms.facts.speaking).toBe('somewhere');
  expect(config.llms.facts.languageFull).toBe('Primarily Korean, some English');
});

// ── 산출 디렉터리 상호 배타 검증 ─────────────────────────────────────────────

test('outputDirs: media/thumbs가 같으면 defineContent가 던진다', () => {
  // sync-posts의 orphan 삭제(.webp 포함)와 thumbnails 생성이 병렬로 돌므로,
  // 같은 디렉터리는 생성물이 지워지는 조용한 파손이다.
  expect(() =>
    defineContent({ root: FIXTURE_ROOT, dirs: { thumbs: 'public/posts' } }),
  ).toThrow(/겹칩니다/);
});

test('outputDirs: 포개진 디렉터리(media 안의 thumbs)도 거부한다', () => {
  expect(() =>
    defineContent({
      root: FIXTURE_ROOT,
      dirs: { thumbs: 'public/posts/thumbs' },
    }),
  ).toThrow(/겹칩니다/);
  // 정규화('./', '..') 우회도 잡는다.
  expect(() =>
    defineContent({
      root: FIXTURE_ROOT,
      dirs: { og: 'public/./posts/../posts' },
    }),
  ).toThrow(/겹칩니다/);
});

test('outputDirs: 서로 다른 형제 디렉터리는 통과한다', () => {
  const config = defineContent({
    root: FIXTURE_ROOT,
    dirs: { thumbs: 'public/thumbs2' },
  });
  expect(config.dirs.thumbs).toBe('public/thumbs2');
});

// ── resolveContentPaths ──────────────────────────────────────────────────────

test('resolveContentPaths: 절대 경로 root 기준 절대 경로를 만든다', () => {
  const paths = resolveContentPaths(defineContent({ root: FIXTURE_ROOT }));
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
  expect(paths.postsDir).toBe(`${sep}tmp${sep}posts`);
  expect(paths.publicDir).toBe(`${sep}tmp${sep}app${sep}public`);
  expect(paths.outDir).toBe(`${sep}tmp${sep}app${sep}out`);
  expect(paths.mediaOutDir).toBe(`${sep}tmp${sep}app${sep}public${sep}posts`);
});

test('resolveContentPaths: file:// 파일 URL root는 그 파일의 디렉터리가 앵커다', () => {
  const paths = resolveContentPaths(
    defineContent({ root: 'file:///tmp/app/content.config.ts' }),
  );
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
  expect(paths.postsDir).toBe(`${sep}tmp${sep}posts`);
});

test('resolveContentPaths: 후행 슬래시 디렉터리 URL은 그 디렉터리 자체가 앵커다', () => {
  const paths = resolveContentPaths(
    defineContent({ root: 'file:///tmp/app/' }),
  );
  expect(paths.appRoot).toBe(`${sep}tmp${sep}app`);
});

test('CONTENT_PATHS(과도기): 실제 앱 루트에 앵커된다 (cwd 비의존)', () => {
  // CONTENT의 가상 root(content.config.ts가 있을 위치)가 apps/blog/web을
  // 가리킨다. postsDir는 그 형제의 posts/다. 이 싱글턴이 사라지면 이 테스트도
  // 함께 사라진다.
  expect(CONTENT_PATHS.appRoot.endsWith(`${sep}blog${sep}web`)).toBeTruthy();
  expect(CONTENT_PATHS.postsDir.endsWith(`${sep}blog${sep}posts`)).toBeTruthy();
});
