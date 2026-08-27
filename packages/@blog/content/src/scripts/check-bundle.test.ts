import { expect, test, vi } from 'vitest';
import {
  chunkClosure,
  checkRules,
  collectChunkRefs,
  describeScope,
  findMarkerIn,
  main,
  selectPages,
  type ScopeInputs,
} from './check-bundle.ts';
import type {
  BundleGuardsConfig,
  BundleRule,
} from '../shared/contentConfig.ts';
import type { ContentContext } from './context.ts';

/** 청크 stem은 실제 산출물처럼 해시 모양으로 — 우연한 부분 일치가 없어야 한다. */
const page = (...chunks: string[]) =>
  `<!doctype html><html><head>${chunks
    .map(c => `<script src="/_next/static/chunks/${c}" async></script>`)
    .join('')}</head><body></body></html>`;

const inputs = (over: Partial<ScopeInputs>): ScopeInputs => ({
  pages: new Map(),
  sources: new Map(),
  artifacts: new Map(),
  ...over,
});

// 패키지에는 기본 규칙이 없다 — 테스트가 곧 규칙을 선언하는 소비 사이트다.
// "admin"이라는 말이 이 파일(소비자 역할)에만 있고 구현에는 없다는 것이 요점.
const ADMIN_RULE: BundleRule = {
  label: 'admin 전용 코드',
  marker: 'GoTrueClient',
  forbiddenIn: [{ kind: 'chunks', of: { notUnder: '/admin/' } }],
  requiredIn: [{ kind: 'chunks', of: { under: '/admin/' } }],
};

const SERVER_RULE: BundleRule = {
  label: '서버 전용 값',
  marker: 'llms-only prose',
  forbiddenIn: [{ kind: 'chunks' }, { kind: 'pages' }],
  requiredIn: [{ kind: 'artifact', path: 'llms.txt' }],
};

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

// ── selectPages ──────────────────────────────────────────────────────────────

test('selectPages: under는 접두 아래를, notUnder는 그 여집합을 고른다', () => {
  const pages = new Map([
    ['/', 'home'],
    ['/posts/a/', 'post'],
    ['/admin/', 'admin'],
    ['/admin/analytics/', 'analytics'],
  ]);
  expect([...selectPages(pages, { under: '/admin/' }).keys()]).toStrictEqual([
    '/admin/',
    '/admin/analytics/',
  ]);
  expect([...selectPages(pages, { notUnder: '/admin/' }).keys()]).toStrictEqual(
    ['/', '/posts/a/'],
  );
  expect(selectPages(pages).size).toBe(4);
});

// ── findMarkerIn ─────────────────────────────────────────────────────────────

test('findMarkerIn(chunks): 셀렉터 페이지의 도달 폐포에서 마커 위치를 찾는다', () => {
  const io = inputs({
    pages: new Map([
      ['/', page('pub111.js')],
      ['/admin/', page('adm111.js')],
    ]),
    sources: new Map([
      ['pub111.js', 'loadChunk("lazy99")'],
      ['lazy99.js', 'MARK'],
      ['adm111.js', 'MARK'],
    ]),
  });
  // 전이 청크(lazy99)가 잡히는 것이 요점 — HTML만 보면 놓치는 자리.
  expect(
    findMarkerIn({ kind: 'chunks', of: { notUnder: '/admin/' } }, 'MARK', io),
  ).toStrictEqual(['lazy99.js']);
  expect(
    findMarkerIn({ kind: 'chunks', of: { under: '/admin/' } }, 'MARK', io),
  ).toStrictEqual(['adm111.js']);
});

test('findMarkerIn(artifact): 없는 파일(null)은 "없다"로 수렴한다', () => {
  const io = inputs({ artifacts: new Map([['llms.txt', null]]) });
  expect(
    findMarkerIn({ kind: 'artifact', path: 'llms.txt' }, 'MARK', io),
  ).toStrictEqual([]);
});

// ── checkRules ───────────────────────────────────────────────────────────────

test('마커가 요구 스코프에만 있으면 통과한다', () => {
  const io = inputs({
    pages: new Map([
      ['/', page('pub111.js')],
      ['/admin/', page('adm111.js')],
    ]),
    sources: new Map([
      ['pub111.js', 'clean'],
      ['adm111.js', 'GoTrueClient'],
    ]),
  });
  expect(checkRules([ADMIN_RULE], io)).toStrictEqual([]);
});

test('금지 스코프의 마커는 leak — 공유 청크도 금지 스코프에 들면 잡힌다', () => {
  const io = inputs({
    pages: new Map([
      ['/', page('shared1.js')],
      ['/admin/', page('shared1.js')],
    ]),
    sources: new Map([['shared1.js', 'GoTrueClient']]),
  });
  const rules = checkRules([ADMIN_RULE], io).map(v => v.rule);
  expect(rules).toStrictEqual(['leak']);
});

test('요구 스코프에 마커가 없으면 marker-dead — 검사 무력화를 잡는 양성 대조', () => {
  const io = inputs({
    pages: new Map([
      ['/', page('pub111.js')],
      ['/admin/', page('adm111.js')],
    ]),
    sources: new Map([
      ['pub111.js', 'clean'],
      ['adm111.js', 'clean'],
    ]),
  });
  expect(checkRules([ADMIN_RULE], io).map(v => v.rule)).toStrictEqual([
    'marker-dead',
  ]);
});

test('서버 전용 모양의 규칙 — 청크·페이지 금지에 산출물 앵커', () => {
  const clean = inputs({
    pages: new Map([['/', page('pub111.js')]]),
    sources: new Map([['pub111.js', 'clean']]),
    artifacts: new Map([['llms.txt', 'llms-only prose']]),
  });
  expect(checkRules([SERVER_RULE], clean)).toStrictEqual([]);

  const leaked = inputs({
    pages: new Map([['/', page('pub111.js')]]),
    sources: new Map([['pub111.js', 'x llms-only prose y']]),
    artifacts: new Map([['llms.txt', 'llms-only prose']]),
  });
  expect(checkRules([SERVER_RULE], leaked).map(v => v.rule)).toStrictEqual([
    'leak',
  ]);

  const stale = inputs({
    pages: new Map([['/', page('pub111.js')]]),
    sources: new Map([['pub111.js', 'clean']]),
    artifacts: new Map([['llms.txt', '문구가 바뀌었다']]),
  });
  expect(checkRules([SERVER_RULE], stale).map(v => v.rule)).toStrictEqual([
    'marker-dead',
  ]);
});

test('규칙은 독립이다 — 한 규칙의 leak과 다른 규칙의 marker-dead가 함께 보고된다', () => {
  const io = inputs({
    pages: new Map([
      ['/', page('pub111.js')],
      ['/admin/', page('adm111.js')],
    ]),
    sources: new Map([
      ['pub111.js', 'x llms-only prose y'],
      ['adm111.js', 'GoTrueClient'],
    ]),
    artifacts: new Map([['llms.txt', 'llms-only prose']]),
  });
  const rules: BundleGuardsConfig = [ADMIN_RULE, SERVER_RULE];
  const violations = checkRules(rules, io);
  expect(violations.map(v => [v.rule, v.marker])).toStrictEqual([
    ['leak', 'llms-only prose'],
  ]);
});

test('requiredIn이 여럿이면 전부에 있어야 한다 (AND)', () => {
  const rule: BundleRule = {
    label: '두 앵커',
    marker: 'MARK',
    forbiddenIn: [{ kind: 'pages', of: { notUnder: '/posts/' } }],
    requiredIn: [
      { kind: 'pages', of: { under: '/posts/' } },
      { kind: 'artifact', path: 'a.txt' },
    ],
  };
  const io = inputs({
    pages: new Map([['/posts/a/', 'MARK']]),
    artifacts: new Map([['a.txt', 'no marker here']]),
  });
  expect(checkRules([rule], io).map(v => v.rule)).toStrictEqual([
    'marker-dead',
  ]);
});

// ── describeScope ────────────────────────────────────────────────────────────

test('describeScope: 위반 메시지가 스코프를 사람 말로 서술한다', () => {
  expect(describeScope({ kind: 'chunks' })).toBe('전체 도달 청크');
  expect(describeScope({ kind: 'chunks', of: { notUnder: '/admin/' } })).toBe(
    "'/admin/' 밖 페이지의 도달 청크",
  );
  expect(describeScope({ kind: 'pages', of: { under: '/posts/' } })).toBe(
    "'/posts/' 아래 페이지의 페이지 HTML",
  );
  expect(describeScope({ kind: 'artifact', path: 'llms.txt' })).toBe(
    '산출물 llms.txt',
  );
});
