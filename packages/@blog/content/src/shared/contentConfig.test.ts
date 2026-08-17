import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  assert.equal(config.site.url, 'https://blog.sangwook.dev');
  assert.equal(config.site.name, 'Frontend Lab');
  assert.equal(config.seo.titleSuffix, ' | Frontend Lab');
  assert.equal(config.seo.descriptionMaxLength, 160);
  assert.equal(config.timezone.iana, 'Asia/Seoul');
  assert.equal(config.timezone.utcOffsetMs, 9 * 60 * 60 * 1000);
  assert.deepEqual(
    [...config.registries.diagramNames],
    [...DEFAULT_DIAGRAM_NAMES],
  );
  assert.equal(config.registries.supportedFenceLabels, SUPPORTED_FENCE_LABELS);
});

test('값 모듈(constants 재수출)과 설정 인스턴스(CONTENT)는 같은 값을 본다', () => {
  // 클라이언트는 값 모듈을, 서버/빌드는 CONTENT를 읽는다. 오버라이드가 {}인
  // 동안 둘은 동일해야 한다 — 갈라지면 contentValues.ts 머리 주석의 제약 위반.
  assert.equal(SITE_URL, CONTENT.site.url);
  assert.equal(SITE_NAME, CONTENT.site.name);
  assert.equal(TITLE_SUFFIX, CONTENT.seo.titleSuffix);
  assert.equal(SEO_DESCRIPTION_MAX_LENGTH, CONTENT.seo.descriptionMaxLength);
});

// ── defineContent: 병합 규칙 ─────────────────────────────────────────────────

test('그룹 부분 오버라이드는 나머지 필드를 기본값으로 유지한다', () => {
  const config = defineContent({ site: { name: 'Other Lab' } });
  assert.equal(config.site.name, 'Other Lab');
  assert.equal(config.site.url, 'https://blog.sangwook.dev');
});

test('seo.titleSuffix는 명시하지 않으면 site.name에서 파생된다', () => {
  const derived = defineContent({ site: { name: 'Other Lab' } });
  assert.equal(derived.seo.titleSuffix, ' | Other Lab');
  const explicit = defineContent({
    site: { name: 'Other Lab' },
    seo: { titleSuffix: ' — 별도 접미사' },
  });
  assert.equal(explicit.seo.titleSuffix, ' — 별도 접미사');
});

test('중첩 객체(og.palette, llms.facts)도 부분 병합된다', () => {
  const config = defineContent({
    og: { palette: { accent: '#FF0000' } },
    llms: { facts: { speaking: 'somewhere' } },
  });
  assert.equal(config.og.palette.accent, '#FF0000');
  assert.equal(config.og.palette.paper, '#0B0D10');
  assert.equal(config.llms.facts.speaking, 'somewhere');
  assert.equal(
    config.llms.facts.languageFull,
    'Primarily Korean, some English',
  );
});

// ── 산출 디렉터리 상호 배타 검증 (계획 위험 6번) ─────────────────────────────

test('outputDirs: media/thumbs가 같으면 defineContent가 던진다', () => {
  // sync-posts의 orphan 삭제(.webp 포함)와 thumbnails 생성이 병렬로 돌므로,
  // 같은 디렉터리는 생성물이 지워지는 조용한 파손이다.
  assert.throws(
    () => defineContent({ dirs: { thumbs: 'public/posts' } }),
    /겹칩니다/,
  );
});

test('outputDirs: 포개진 디렉터리(media 안의 thumbs)도 거부한다', () => {
  assert.throws(
    () => defineContent({ dirs: { thumbs: 'public/posts/thumbs' } }),
    /겹칩니다/,
  );
  // 정규화('./', '..') 우회도 잡는다.
  assert.throws(
    () => defineContent({ dirs: { og: 'public/./posts/../posts' } }),
    /겹칩니다/,
  );
});

test('outputDirs: 서로 다른 형제 디렉터리는 통과한다', () => {
  const config = defineContent({ dirs: { thumbs: 'public/thumbs2' } });
  assert.equal(config.dirs.thumbs, 'public/thumbs2');
});

// ── resolveContentPaths ──────────────────────────────────────────────────────

test('resolveContentPaths: appRoot 기준 절대 경로를 만든다', () => {
  const paths = resolveContentPaths(CONTENT, `${sep}tmp${sep}app`);
  assert.equal(paths.postsDir, `${sep}tmp${sep}posts`);
  assert.equal(paths.publicDir, `${sep}tmp${sep}app${sep}public`);
  assert.equal(paths.outDir, `${sep}tmp${sep}app${sep}out`);
  assert.equal(paths.mediaOutDir, `${sep}tmp${sep}app${sep}public${sep}posts`);
});

test('CONTENT_PATHS: 실제 앱 루트에 앵커된다 (cwd 비의존)', () => {
  // contentPaths가 자기 위치에서 워크스페이스 루트로 올라가 apps/blog/web을 앱 루트로
  // 잡는다. postsDir는 그 형제의 posts/다.
  assert.ok(CONTENT_PATHS.appRoot.endsWith(`${sep}blog${sep}web`));
  assert.ok(CONTENT_PATHS.postsDir.endsWith(`${sep}blog${sep}posts`));
});
