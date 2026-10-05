import { expect, test } from 'vitest';
import { collectAssetRefs } from './assetRefs.ts';

/**
 * 첫 로드 자산 수집의 계약 — `measure-bundle`이 이 함수로 잰다.
 *
 * 여기가 조용히 0건을 돌려주면 자는 "0 KB"를 보고한다 — 실패가 아니라
 * **정상처럼 보이는 무력화**다. 반대로 첫 로드에 오지 않는 것(prefetch·nomodule)을
 * 세면 숫자가 부풀어 기준선이 틀린다. 그래서 두 방향을 다 잠근다.
 */

test('Next 산출물의 실제 모양 — script·stylesheet·preload as=script를 모으고 겹치면 합친다', () => {
  // out/index.html에서 뽑은 태그 모양 그대로다(경로만 줄였다).
  const html = [
    '<link rel="stylesheet" href="/_next/static/chunks/a.css" data-precedence="next"/>',
    '<link rel="preload" as="script" fetchPriority="low" href="/_next/static/chunks/w.js"/>',
    '<script src="/_next/static/chunks/w.js" id="_R_" async=""></script>',
    '<script src="/_next/static/chunks/t.js" async=""></script>',
    '<script src="/_next/static/chunks/p.js" noModule=""></script>',
    '<link rel="preload" href="/_next/static/media/f.p.woff2" as="font" crossorigin="" type="font/woff2"/>',
    '<link rel="preload" href="https://www.googletagmanager.com/gtm.js?id=G" as="script"/>',
    '<link rel="icon" href="/favicon.ico" sizes="any"/>',
    '<link rel="manifest" href="/site.webmanifest"/>',
    '<script type="application/ld+json">{}</script>',
  ].join('');
  expect(collectAssetRefs(html).sort()).toStrictEqual([
    '/_next/static/chunks/a.css',
    '/_next/static/chunks/t.js',
    '/_next/static/chunks/w.js',
  ]);
});

test('경로 관례를 가정하지 않는다 — 문서가 가리킨 파일이면 어느 디렉터리든 찾는다', () => {
  // check-bundle의 `CHUNK_REF`(누수 게이트용)는 `/_next/static/chunks/`를 박아 두지만,
  // 자는 디렉터리가 아니라 태그를 읽는다.
  expect(
    collectAssetRefs('<script src="/assets/bundle.js"></script>'),
  ).toStrictEqual(['/assets/bundle.js']);
  expect(
    collectAssetRefs('<link rel="modulepreload" href="/build/x.js">'),
  ).toStrictEqual(['/build/x.js']);
});

test('첫 로드에 내려받는 link만 센다 — prefetch·rel 없는 link·as 없는 preload는 아니다', () => {
  const html = [
    '<link rel="stylesheet" href="/s.css">',
    '<link rel="modulepreload" href="/m.js">',
    '<link rel="preload" as="style" href="/p.css">',
    '<link rel="preload" as="script" href="/p.js">',
    // 다음 탐색을 위한 힌트 — 첫 로드 전송이 아니다
    '<link rel="prefetch" href="/next.js">',
    '<link rel="prefetch" as="script" href="/next2.js">',
    // as가 없으면 브라우저가 preload를 무시한다
    '<link rel="preload" href="/noas.js">',
    '<link href="/norel.css">',
  ].join('');
  expect(collectAssetRefs(html).sort()).toStrictEqual([
    '/m.js',
    '/p.css',
    '/p.js',
    '/s.css',
  ]);
});

test('rel·as는 대소문자와 공백을 가리지 않는다', () => {
  const html =
    '<link rel=" Stylesheet " href="/a.css"><link REL="preload" AS="Script" href="/b.js">';
  expect(collectAssetRefs(html).sort()).toStrictEqual(['/a.css', '/b.js']);
});

test('속성 이름의 일부만 맞는 것(data-src·data-href)은 참조가 아니다', () => {
  const html =
    '<script data-src="/lazy.js"></script><link rel="stylesheet" data-href="/x.css" href="/real.css">';
  expect(collectAssetRefs(html)).toStrictEqual(['/real.css']);
});

test('상대 참조를 페이지 경로 기준으로 푼다', () => {
  const html =
    '<script src="./chunks/start.js"></script><link href="../assets/0.css" rel="stylesheet">';
  expect(collectAssetRefs(html, '/posts/foo/').sort()).toStrictEqual([
    '/posts/assets/0.css',
    '/posts/foo/chunks/start.js',
  ]);
  expect(
    collectAssetRefs('<script src="./chunks/start.js"></script>', '/'),
  ).toStrictEqual(['/chunks/start.js']);
});

test('속성 순서·따옴표를 가정하지 않는다', () => {
  expect(collectAssetRefs('<script defer src="/a.js"></script>')).toStrictEqual(
    ['/a.js'],
  );
  expect(collectAssetRefs('<script src="/a.js" defer></script>')).toStrictEqual(
    ['/a.js'],
  );
  expect(
    collectAssetRefs("<link href='/a.css' rel='stylesheet'>"),
  ).toStrictEqual(['/a.css']);
  expect(collectAssetRefs('<link href=/b.css rel=stylesheet>')).toStrictEqual([
    '/b.css',
  ]);
});

test('남의 산출물은 세지 않는다 — 프로토콜이 붙은 참조', () => {
  const html = [
    '<script src="https://cdn.example.com/x.js"></script>',
    '<script src="//cdn.example.com/y.js"></script>',
    '<script src="data:text/javascript,void 0"></script>',
    '<script src="/mine.js"></script>',
  ].join('');
  expect(collectAssetRefs(html)).toStrictEqual(['/mine.js']);
});

test('js·css만 센다 — 폰트·이미지는 이 자의 대상이 아니다', () => {
  const html =
    '<link href="/f.woff2" rel="preload" as="font"><link href="/s.css" rel="stylesheet"><script src="/a.js"></script>';
  expect(collectAssetRefs(html).sort()).toStrictEqual(['/a.js', '/s.css']);
});

test('쿼리·프래그먼트는 떼고, 같은 경로는 한 번만 센다', () => {
  const html =
    '<script src="/a.js?v=1"></script><script src="/a.js#x"></script>';
  expect(collectAssetRefs(html)).toStrictEqual(['/a.js']);
});

test('퍼센트 인코딩된 디렉터리 이름은 디스크 경로로 푼다', () => {
  // 중첩 청크(`chunks/app/posts/[...slug]/…`)의 HTML 표기다.
  const html =
    '<script src="/_next/static/chunks/app/posts/%5B...slug%5D/page-abc.js"></script>';
  expect(collectAssetRefs(html)).toStrictEqual([
    '/_next/static/chunks/app/posts/[...slug]/page-abc.js',
  ]);
});

test('nomodule 스크립트는 첫 로드에 세지 않는다', () => {
  // 모듈을 지원하는 브라우저는 받지 않는다 — Next의 polyfills 청크가 이 꼴이다.
  const html =
    '<script src="/poly.js" noModule=""></script><script src="/nomodule-ish.js"></script><script nomodule src="/p2.js"></script>';
  expect(collectAssetRefs(html)).toStrictEqual(['/nomodule-ish.js']);
});
