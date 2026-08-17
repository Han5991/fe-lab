import { expect, test } from 'vitest';
import { sep } from 'node:path';
import { CONTENT, defineContent } from './contentConfig';
import { DEFAULT_DIAGRAM_NAMES } from './contentValues';
import { SUPPORTED_FENCE_LABELS } from './prismLanguages';
import {
  SITE_NAME,
  SITE_URL,
  TITLE_SUFFIX,
  SEO_DESCRIPTION_MAX_LENGTH,
} from './constants';
import { CONTENT_PATHS, resolveContentPaths } from './contentPaths';

// ── defineContent: 기본값 = 현재값 ───────────────────────────────────────────

test('defineContent({})는 현재 사이트 값과 같다 (동작 no-op의 근거)', () => {
  const config = defineContent({});
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
  // 클라이언트는 값 모듈을, 서버/빌드는 CONTENT를 읽는다. 오버라이드가 {}인
  // 동안 둘은 동일해야 한다 — 갈라지면 contentValues.ts 머리 주석의 제약 위반.
  expect(SITE_URL).toBe(CONTENT.site.url);
  expect(SITE_NAME).toBe(CONTENT.site.name);
  expect(TITLE_SUFFIX).toBe(CONTENT.seo.titleSuffix);
  expect(SEO_DESCRIPTION_MAX_LENGTH).toBe(CONTENT.seo.descriptionMaxLength);
});

// ── defineContent: 병합 규칙 ─────────────────────────────────────────────────

test('그룹 부분 오버라이드는 나머지 필드를 기본값으로 유지한다', () => {
  const config = defineContent({ site: { name: 'Other Lab' } });
  expect(config.site.name).toBe('Other Lab');
  expect(config.site.url).toBe('https://blog.sangwook.dev');
});

test('seo.titleSuffix는 명시하지 않으면 site.name에서 파생된다', () => {
  const derived = defineContent({ site: { name: 'Other Lab' } });
  expect(derived.seo.titleSuffix).toBe(' | Other Lab');
  const explicit = defineContent({
    site: { name: 'Other Lab' },
    seo: { titleSuffix: ' — 별도 접미사' },
  });
  expect(explicit.seo.titleSuffix).toBe(' — 별도 접미사');
});

test('중첩 객체(og.palette, llms.facts)도 부분 병합된다', () => {
  const config = defineContent({
    og: { palette: { accent: '#FF0000' } },
    llms: { facts: { speaking: 'somewhere' } },
  });
  expect(config.og.palette.accent).toBe('#FF0000');
  expect(config.og.palette.paper).toBe('#0B0D10');
  expect(config.llms.facts.speaking).toBe('somewhere');
  expect(config.llms.facts.languageFull).toBe('Primarily Korean, some English');
});

// ── 산출 디렉터리 상호 배타 검증 (계획 위험 6번) ─────────────────────────────

test('outputDirs: media/thumbs가 같으면 defineContent가 던진다', () => {
  // sync-posts의 orphan 삭제(.webp 포함)와 thumbnails 생성이 병렬로 돌므로,
  // 같은 디렉터리는 생성물이 지워지는 조용한 파손이다.
  expect(() => defineContent({ dirs: { thumbs: 'public/posts' } })).toThrow(
    /겹칩니다/,
  );
});

test('outputDirs: 포개진 디렉터리(media 안의 thumbs)도 거부한다', () => {
  expect(() =>
    defineContent({ dirs: { thumbs: 'public/posts/thumbs' } }),
  ).toThrow(/겹칩니다/);
  // 정규화('./', '..') 우회도 잡는다.
  expect(() =>
    defineContent({ dirs: { og: 'public/./posts/../posts' } }),
  ).toThrow(/겹칩니다/);
});

test('outputDirs: 서로 다른 형제 디렉터리는 통과한다', () => {
  const config = defineContent({ dirs: { thumbs: 'public/thumbs2' } });
  expect(config.dirs.thumbs).toBe('public/thumbs2');
});

// ── resolveContentPaths ──────────────────────────────────────────────────────

test('resolveContentPaths: appRoot 기준 절대 경로를 만든다', () => {
  const paths = resolveContentPaths(CONTENT, `${sep}tmp${sep}app`);
  expect(paths.postsDir).toBe(`${sep}tmp${sep}posts`);
  expect(paths.publicDir).toBe(`${sep}tmp${sep}app${sep}public`);
  expect(paths.outDir).toBe(`${sep}tmp${sep}app${sep}out`);
  expect(paths.mediaOutDir).toBe(`${sep}tmp${sep}app${sep}public${sep}posts`);
});

test('CONTENT_PATHS: 실제 앱 루트에 앵커된다 (cwd 비의존)', () => {
  // contentPaths가 자기 위치에서 워크스페이스 루트로 올라가 apps/blog/web을 앱 루트로
  // 잡는다. postsDir는 그 형제의 posts/다.
  expect(CONTENT_PATHS.appRoot.endsWith(`${sep}blog${sep}web`)).toBeTruthy();
  expect(CONTENT_PATHS.postsDir.endsWith(`${sep}blog${sep}posts`)).toBeTruthy();
});
