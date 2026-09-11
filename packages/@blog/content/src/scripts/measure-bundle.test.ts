import { gzipSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import {
  collectAssetRefs,
  groupPages,
  measure,
  measurePage,
  type PageMeasurement,
} from './measure-bundle.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** 산출물 하나를 tmpdir에 짓는다 — 실제 파일을 읽는 코드라 주입할 수 있는 씨앗이 fs다. */
function buildOut(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'measure-'));
  dirs.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

const page = (head: string) =>
  `<!doctype html><html><head>${head}</head><body>hi</body></html>`;

test('collectAssetRefs: 태그 종류·속성 순서를 가리지 않고 로컬 js/css만 모은다', () => {
  const html = page(
    [
      '<script src="/a.js" async></script>',
      '<script async src="/b.js"></script>',
      '<link rel="stylesheet" href="/s.css">',
      '<link rel="modulepreload" href="/c.js">',
      // 외부 호스트 — 우리 산출물이 아니다
      '<script src="https://www.googletagmanager.com/gtag/js?id=X"></script>',
      // 상대 경로도 페이지 기준으로 풀어 센다(SvelteKit 산출물의 기본 모양)
      '<script src="./rel.js"></script>',
      // js·css가 아닌 것
      '<link rel="preload" href="/font.woff2" as="font">',
    ].join(''),
  );
  expect(collectAssetRefs(html, '/').sort()).toStrictEqual([
    '/a.js',
    '/b.js',
    '/c.js',
    '/rel.js',
    '/s.css',
  ]);
});

test('collectAssetRefs: 페이지 기준 상대 경로를 절대 경로로 푼다', () => {
  // SvelteKit 기본 산출물의 모양이다(`paths.relative`). 절대 경로만 세던 첫
  // 판은 여기서 참조를 하나도 못 찾아 0 KB를 보고했다 — 회귀 가드.
  const html = page(
    '<link href="./_app/immutable/chunks/abc.js" rel="modulepreload">' +
      '<link href="../_app/immutable/assets/0.css" rel="stylesheet">',
  );
  expect(collectAssetRefs(html, '/posts/foo/').sort()).toStrictEqual([
    '/posts/_app/immutable/assets/0.css',
    '/posts/foo/_app/immutable/chunks/abc.js',
  ]);
});

test('collectAssetRefs: 프로토콜·프로토콜 상대 참조는 우리 산출물이 아니다', () => {
  const html = page(
    '<script src="https://cdn.example.com/a.js"></script>' +
      '<script src="//cdn.example.com/b.js"></script>' +
      '<script src="/ours.js"></script>',
  );
  expect(collectAssetRefs(html, '/')).toStrictEqual(['/ours.js']);
});

test('collectAssetRefs: 쿼리·프래그먼트를 벗기고 중복 참조를 합친다', () => {
  // 같은 청크가 script와 preload 양쪽에 실리는 것이 Next.js 산출물의 실제 모양이다.
  const html = page(
    '<link rel="preload" as="script" href="/x.js?v=1">' +
      '<script src="/x.js" async></script>',
  );
  expect(collectAssetRefs(html)).toStrictEqual(['/x.js']);
});

test('measurePage: html·css·js를 갈라 gzip으로 재고 중복 파일은 한 번만 센다', () => {
  const js = 'console.log("x");'.repeat(200);
  const css = 'body{color:red}'.repeat(200);
  const out = buildOut({ 'x.js': js, 's.css': css });
  const html = page(
    '<link rel="stylesheet" href="/s.css">' +
      '<link rel="preload" as="script" href="/x.js">' +
      '<script src="/x.js"></script>',
  );

  const m = measurePage('/', html, out, new Map());

  expect(m.jsFiles).toBe(1);
  expect(m.missing).toStrictEqual([]);
  expect(m.jsGzip).toBe(gzipSync(Buffer.from(js)).length);
  expect(m.cssGzip).toBe(gzipSync(Buffer.from(css)).length);
  expect(m.htmlGzip).toBe(gzipSync(Buffer.from(html, 'utf8')).length);
  expect(m.totalGzip).toBe(m.htmlGzip + m.cssGzip + m.jsGzip);
});

test('measurePage: 참조는 있는데 파일이 없으면 0으로 삼키지 않고 missing에 남긴다', () => {
  // 수집기가 경로를 잘못 풀었을 때 "번들이 작아졌다"로 보이는 것이 가장 위험하다.
  const out = buildOut({ 'x.js': 'console.log(1)' });
  const m = measurePage(
    '/',
    page('<script src="/gone.js"></script><script src="/x.js"></script>'),
    out,
    new Map(),
  );
  expect(m.missing).toStrictEqual(['/gone.js']);
  expect(m.jsFiles).toBe(1);
});

test('measurePage: assetCache가 같은 파일의 재압축을 막는다', () => {
  const out = buildOut({ 'x.js': 'console.log(1)'.repeat(50) });
  const cache = new Map<string, number | null>();
  const html = page('<script src="/x.js"></script>');
  const first = measurePage('/a/', html, out, cache);
  // 파일을 지운 뒤에도 같은 값이 나와야 캐시가 실제로 쓰인 것이다.
  rmSync(join(out, 'x.js'));
  const second = measurePage('/b/', html, out, cache);
  expect(second.jsGzip).toBe(first.jsGzip);
  expect(second.missing).toStrictEqual([]);
});

test('groupPages: 첫 세그먼트로 묶고 대표는 실재하는 중앙값 페이지다', () => {
  const p = (path: string, totalGzip: number): PageMeasurement => ({
    path,
    htmlGzip: totalGzip,
    cssGzip: 0,
    jsGzip: 0,
    totalGzip,
    jsFiles: 0,
    missing: [],
  });
  const groups = groupPages([
    p('/', 100),
    p('/posts/', 300),
    p('/posts/a/', 100),
    p('/posts/b/', 200),
    p('/admin/', 900),
  ]);

  expect(groups.map(g => g.group)).toStrictEqual(['/admin/', '/posts/', '/']);
  const posts = groups.find(g => g.group === '/posts/');
  expect(posts?.pages).toBe(3);
  expect(posts?.maxTotalGzip).toBe(300);
  // 중앙값은 평균이 아니라 실제 페이지 하나여야 대표로 찍을 수 있다.
  expect(posts?.medianTotalGzip).toBe(200);
  expect(posts?.medianPath).toBe('/posts/b/');
});

test('measure: 산출물 전체를 훑어 페이지·파일 수를 함께 낸다', () => {
  const out = buildOut({
    'index.html': page('<script src="/x.js"></script>'),
    'posts/a/index.html': page('<script src="/x.js"></script>'),
    'x.js': 'console.log(1)',
    'rss.xml': '<rss/>',
  });

  const report = measure(out);

  expect(report.pages.map(p => p.path).sort()).toStrictEqual([
    '/',
    '/posts/a/',
  ]);
  expect(report.artifacts.files).toBe(4);
  expect(report.groups.map(g => g.group).sort()).toStrictEqual([
    '/',
    '/posts/',
  ]);
});
