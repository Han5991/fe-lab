import { expect, test, vi } from 'vitest';
import {
  chunkClosure,
  classifyChunkRefs,
  collectChunkRefs,
  main,
  runCheckBundle,
} from './check-bundle.ts';
import type { BundleGuardsConfig } from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';

/** 청크 stem은 실제 산출물처럼 해시 모양으로 — 우연한 부분 일치가 없어야 한다. */
const page = (...chunks: string[]) =>
  `<!doctype html><html><head>${chunks
    .map(c => `<script src="/_next/static/chunks/${c}" async></script>`)
    .join('')}</head><body></body></html>`;

// 패키지에는 기본값이 없다 — 테스트가 곧 이 축을 선언하는 소비 사이트다.
const adminGuards = (
  markers: NonNullable<BundleGuardsConfig['admin']>['markers'],
): BundleGuardsConfig => ({
  admin: { pathPrefix: '/admin/', markers },
});

const NO_ARTIFACTS: ReadonlyMap<string, string | null> = new Map();

// ── main: 미선언 스킵 ────────────────────────────────────────────────────────

test('main: bundleGuards 미선언이면 fs를 만지기 전에 스킵을 알리고 끝난다', () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const exit = vi
    .spyOn(process, 'exit')
    .mockImplementation((() => undefined) as () => never);
  try {
    // 설정에 bundleGuards 키가 없는 컨텍스트 — defineContent가 미선언 시 키를
    // 만들지 않는 계약은 contentConfig.test.ts가 잠근다. outDir이 실존하지
    // 않는 경로인 것이 의도다: 스킵이 fs 검사보다 먼저가 아니면 여기서 exit(1)
    // 스파이가 잡는다.
    main({
      configPath: '/nowhere/content.config.ts',
      content: { config: {}, paths: { outDir: '/nowhere/out' } },
    } as unknown as ContentContext);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('검사 스킵'));
    expect(exit).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
    exit.mockRestore();
  }
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

test('classifyChunkRefs: pathPrefix로 공개/admin 참조를 가른다', () => {
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

// ── admin 계열 ───────────────────────────────────────────────────────────────

test('admin 마커가 admin 청크에만 있으면 통과한다', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'clean'],
    ['adm111.js', 'computeAnalyticsOverview'],
  ]);
  expect(
    runCheckBundle(
      pages,
      sources,
      adminGuards(['computeAnalyticsOverview']),
      NO_ARTIFACTS,
    ),
  ).toStrictEqual([]);
});

test('공개 페이지가 직접 참조하는 청크의 admin 마커는 bundle-leak', () => {
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
    adminGuards(['computeAnalyticsOverview']),
    NO_ARTIFACTS,
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('전이로만 도달하는 청크의 admin 마커도 bundle-leak — HTML만 보면 놓치는 자리', () => {
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
    adminGuards(['computeAnalyticsOverview']),
    NO_ARTIFACTS,
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('공개·admin이 공유하는 청크의 admin 마커도 bundle-leak — 공개가 로드하는 사실이 기준', () => {
  const pages = new Map([
    ['/', page('shared1.js')],
    ['/admin/', page('shared1.js')],
  ]);
  const sources = new Map([['shared1.js', 'computeAnalyticsOverview']]);
  const rules = runCheckBundle(
    pages,
    sources,
    adminGuards(['computeAnalyticsOverview']),
    NO_ARTIFACTS,
  ).map(v => v.rule);
  expect(rules).toStrictEqual(['bundle-leak']);
});

test('admin 마커가 admin 청크 어디에도 없으면 marker-dead — 검사 무력화를 잡는 양성 대조', () => {
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
    adminGuards(['computeAnalyticsOverview']),
    NO_ARTIFACTS,
  );
  expect(violations.map(v => v.rule)).toStrictEqual(['marker-dead']);
});

test('admin 마커별로 독립 판정한다 — 산 마커의 누수와 죽은 마커가 함께 보고된다', () => {
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
    adminGuards(['GoTrueClient', 'computeAnalyticsOverview']),
    NO_ARTIFACTS,
  );
  expect(violations.map(v => [v.rule, v.marker])).toStrictEqual([
    ['bundle-leak', 'GoTrueClient'],
    ['marker-dead', 'computeAnalyticsOverview'],
  ]);
});

// ── serverOnly 계열 ──────────────────────────────────────────────────────────

const SERVER_GUARDS: BundleGuardsConfig = {
  serverOnly: [{ marker: 'llms-only prose', artifact: 'llms.txt' }],
};

test('서버 전용 마커가 앵커 산출물에만 있으면 통과한다', () => {
  const pages = new Map([['/', page('pub111.js')]]);
  const sources = new Map([['pub111.js', 'clean']]);
  const artifacts = new Map([['llms.txt', '# doc\nllms-only prose here']]);
  expect(
    runCheckBundle(pages, sources, SERVER_GUARDS, artifacts),
  ).toStrictEqual([]);
});

test('서버 전용 마커가 청크에 있으면 server-leak — 설정/그룹 객체 유입', () => {
  const pages = new Map([['/', page('pub111.js')]]);
  const sources = new Map([['pub111.js', 'x "llms-only prose" y']]);
  const artifacts = new Map([['llms.txt', 'llms-only prose']]);
  const rules = runCheckBundle(pages, sources, SERVER_GUARDS, artifacts).map(
    v => v.rule,
  );
  expect(rules).toStrictEqual(['server-leak']);
});

test('서버 전용 마커는 admin 청크·페이지 HTML도 금지다 — 계열이 공개/admin 구분과 무관', () => {
  const pages = new Map([['/admin/', 'x llms-only prose y']]);
  const sources = new Map([['adm111.js', 'clean']]);
  const artifacts = new Map([['llms.txt', 'llms-only prose']]);
  const rules = runCheckBundle(pages, sources, SERVER_GUARDS, artifacts).map(
    v => v.rule,
  );
  expect(rules).toStrictEqual(['server-leak']);
});

test('앵커 산출물이 없거나 마커를 잃으면 marker-dead — 값이 바뀌면 선언도 갱신', () => {
  const pages = new Map([['/', page('pub111.js')]]);
  const sources = new Map([['pub111.js', 'clean']]);
  const missing = runCheckBundle(
    pages,
    sources,
    SERVER_GUARDS,
    new Map([['llms.txt', null]]),
  ).map(v => v.rule);
  expect(missing).toStrictEqual(['marker-dead']);

  const stale = runCheckBundle(
    pages,
    sources,
    SERVER_GUARDS,
    new Map([['llms.txt', '문구가 바뀌었다']]),
  ).map(v => v.rule);
  expect(stale).toStrictEqual(['marker-dead']);
});

test('두 계열은 독립이다 — admin 통과 + serverOnly 누수가 함께 보고된다', () => {
  const pages = new Map([
    ['/', page('pub111.js')],
    ['/admin/', page('adm111.js')],
  ]);
  const sources = new Map([
    ['pub111.js', 'x "llms-only prose" y'],
    ['adm111.js', 'GoTrueClient'],
  ]);
  const artifacts = new Map([['llms.txt', 'llms-only prose']]);
  const violations = runCheckBundle(
    pages,
    sources,
    {
      admin: { pathPrefix: '/admin/', markers: ['GoTrueClient'] },
      serverOnly: [{ marker: 'llms-only prose', artifact: 'llms.txt' }],
    },
    artifacts,
  );
  expect(violations.map(v => v.rule)).toStrictEqual(['server-leak']);
});
