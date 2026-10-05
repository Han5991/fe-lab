import { gzipSync } from 'node:zlib';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import {
  groupPages,
  measure,
  measurePage,
  pageGroup,
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
  // 자산 목록이 합계의 근거다 — 예산 초과 보고가 이 목록에서 큰 파일을 댄다.
  expect(m.assets).toStrictEqual([
    { path: '/s.css', kind: 'css', gzip: m.cssGzip },
    { path: '/x.js', kind: 'js', gzip: m.jsGzip },
  ]);
});

test('pageGroup: 첫 세그먼트로 묶는다 — 루트는 /', () => {
  expect(pageGroup('/')).toBe('/');
  expect(pageGroup('/posts/')).toBe('/posts/');
  expect(pageGroup('/posts/a/b/')).toBe('/posts/');
  expect(pageGroup('/_not-found/')).toBe('/_not-found/');
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

test('measurePage: 퍼센트 인코딩된 중첩 디렉터리의 청크를 디스크에서 찾는다', () => {
  // 동적 라우트 청크(`[...slug]`)는 HTML에 `%5B...slug%5D`로 실린다 — 풀지 않으면
  // 실재하는 파일이 missing으로 떨어진다.
  const out = buildOut({
    '_next/static/chunks/app/posts/[...slug]/page.js': 'console.log(1)',
  });
  const m = measurePage(
    '/posts/a/',
    page(
      '<script src="/_next/static/chunks/app/posts/%5B...slug%5D/page.js"></script>',
    ),
    out,
    new Map(),
  );
  expect(m.missing).toStrictEqual([]);
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
    assets: [],
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
