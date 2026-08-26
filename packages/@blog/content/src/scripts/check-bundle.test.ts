import { expect, test } from 'vitest';
import {
  chunkClosure,
  classifyChunkRefs,
  collectChunkRefs,
  runCheckBundle,
} from './check-bundle.ts';
import { DEFAULT_BUNDLE_GUARDS } from '../shared/contentConfig.ts';

/** 청크 stem은 실제 산출물처럼 해시 모양으로 — 우연한 부분 일치가 없어야 한다. */
const page = (...chunks: string[]) =>
  `<!doctype html><html><head>${chunks
    .map(c => `<script src="/_next/static/chunks/${c}" async></script>`)
    .join('')}</head><body></body></html>`;

const guards = (markers: string[]) => ({
  ...DEFAULT_BUNDLE_GUARDS,
  markers,
});

// ── collectChunkRefs ─────────────────────────────────────────────────────────

test('collectChunkRefs: script·preload를 가리지 않고 청크 경로를 중복 없이 뽑는다', () => {
  const html = `<link rel="preload" href="/_next/static/chunks/aaa111.js"/>
    <script src="/_next/static/chunks/bbb222.js"></script>
    <script src="/_next/static/chunks/aaa111.js"></script>`;
  expect(collectChunkRefs(html).sort()).toStrictEqual([
    'aaa111.js',
    'bbb222.js',
  ]);
});

test('collectChunkRefs: 청크 밖 JS(/_next/static/media 등)는 무시한다', () => {
  const html = `<script src="/_next/static/media/font.js"></script>`;
  expect(collectChunkRefs(html)).toStrictEqual([]);
});

// ── chunkClosure ─────────────────────────────────────────────────────────────

test('chunkClosure: 청크 본문이 stem으로 여는 청크까지 전이로 포함한다', () => {
  // 실제 산출물의 형태다 — async 청크는 HTML이 아니라 다른 청크가 파일명
  // 문자열로 연다(공개 그래프의 SVG 유틸 청크가 그랬다).
  const sources = new Map([
    ['aaa111.js', 'loadChunk("bbb222")'],
    ['bbb222.js', 'leaf'],
    ['ccc333.js', 'unreachable'],
  ]);
  expect(chunkClosure(['aaa111.js'], sources)).toStrictEqual(
    new Set(['aaa111.js', 'bbb222.js']),
  );
});

test('chunkClosure: 존재하지 않는 청크 참조는 무시한다', () => {
  const sources = new Map([['aaa111.js', 'x']]);
  expect(chunkClosure(['aaa111.js', 'ghost.js'], sources)).toStrictEqual(
    new Set(['aaa111.js']),
  );
});

// ── classifyChunkRefs ────────────────────────────────────────────────────────

test('classifyChunkRefs: adminPathPrefix로 공개/admin 참조를 가른다', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/posts/a/', page('pub111.js', 'pub222.js')],
    ['/admin/', page('adm111.js')],
    ['/admin/analytics/', page('adm111.js', 'adm222.js')],
  ]);
  const { publicRefs, adminRefs } = classifyChunkRefs(pages, '/admin/');
  expect(publicRefs).toStrictEqual(new Set(['pub111.js', 'pub222.js']));
  expect(adminRefs).toStrictEqual(new Set(['adm111.js', 'adm222.js']));
});

// ── runCheckBundle ───────────────────────────────────────────────────────────

test('마커가 admin 청크에만 있으면 통과한다', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'clean'],
    ['adm111.js', 'computeAnalyticsOverview'],
  ]);
  expect(
    runCheckBundle(pages, sources, guards(['computeAnalyticsOverview'])),
  ).toStrictEqual([]);
});

test('공개 페이지가 직접 참조하는 청크의 마커는 bundle-leak', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'computeAnalyticsOverview'],
    ['adm111.js', 'computeAnalyticsOverview'],
  ]);
  const rules = runCheckBundle(
    pages,
    sources,
    guards(['computeAnalyticsOverview']),
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('전이로만 도달하는 청크의 마커도 bundle-leak — HTML만 보면 놓치는 자리', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'loadChunk("lazy99")'],
    ['lazy99.js', 'computeAnalyticsOverview'],
    ['adm111.js', 'computeAnalyticsOverview'],
  ]);
  const rules = runCheckBundle(
    pages,
    sources,
    guards(['computeAnalyticsOverview']),
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('공개·admin이 공유하는 청크의 마커도 bundle-leak — 공개가 로드하는 사실이 기준', () => {
  const pages = new Map([
    ['/', page('shared1.js')],
    ['/admin/', page('shared1.js')],
  ]);
  const sources = new Map([['shared1.js', 'computeAnalyticsOverview']]);
  const rules = runCheckBundle(
    pages,
    sources,
    guards(['computeAnalyticsOverview']),
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('마커가 admin 청크 어디에도 없으면 marker-dead — 검사 무력화를 잡는 양성 대조', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'clean'],
    ['adm111.js', 'clean'],
  ]);
  const violations = runCheckBundle(
    pages,
    sources,
    guards(['computeAnalyticsOverview']),
  );
  expect(violations.map(v => v.rule)).toStrictEqual(['marker-dead']);
});

test('마커별로 독립 판정한다 — 산 마커의 누수와 죽은 마커가 함께 보고된다', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'GoTrueClient'],
    ['adm111.js', 'GoTrueClient'],
  ]);
  const violations = runCheckBundle(
    pages,
    sources,
    guards(['GoTrueClient', 'computeAnalyticsOverview']),
  );
  expect(violations.map(v => [v.rule, v.marker])).toStrictEqual([
    ['bundle-leak', 'GoTrueClient'],
    ['marker-dead', 'computeAnalyticsOverview'],
  ]);
});
