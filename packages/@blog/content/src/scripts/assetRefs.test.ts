import { expect, test } from 'vitest';
import { collectAssetRefs } from './assetRefs.ts';

/**
 * 자산 참조 수집의 계약.
 *
 * `check-bundle`(게이트)과 `measure-bundle`(자)이 이 함수를 함께 쓴다. 여기가
 * 조용히 0건을 돌려주면 게이트는 "누수 없음", 자는 "0 KB"를 보고한다 — 둘 다
 * 실패가 아니라 **정상처럼 보이는 무력화**다. 그래서 "못 찾는다"를 잡는 테스트가
 * 다른 무엇보다 먼저다.
 */

test('경로 관례를 가정하지 않는다 — 어느 번들러의 산출물이든 찾는다', () => {
  // 예전 check-bundle은 `/_next/static/chunks/`를 정규식에 박아 두어 다른
  // 프레임워크의 산출물에서 청크를 하나도 못 찾았다. 그게 이 모듈이 생긴 이유다.
  const next = '<script src="/_next/static/chunks/abc.js"></script>';
  const kit = '<link rel="modulepreload" href="/_app/immutable/chunks/x.js">';
  const plain = '<script src="/assets/bundle.js"></script>';
  expect(collectAssetRefs(next)).toStrictEqual(['/_next/static/chunks/abc.js']);
  expect(collectAssetRefs(kit)).toStrictEqual(['/_app/immutable/chunks/x.js']);
  expect(collectAssetRefs(plain)).toStrictEqual(['/assets/bundle.js']);
});

test('상대 참조를 페이지 경로 기준으로 푼다', () => {
  // SvelteKit은 기본값으로 `./_app/immutable/…`처럼 페이지 기준 상대 경로를
  // 낸다. 절대 경로만 세던 판은 그 산출물에서 0 KB를 보고했다.
  const html = '<script src="./_app/immutable/entry/start.js"></script>';
  expect(collectAssetRefs(html, '/posts/')).toStrictEqual([
    '/posts/_app/immutable/entry/start.js',
  ]);
  expect(collectAssetRefs(html, '/')).toStrictEqual([
    '/_app/immutable/entry/start.js',
  ]);
});

test('속성 순서를 가정하지 않는다', () => {
  expect(collectAssetRefs('<script defer src="/a.js"></script>')).toStrictEqual(
    ['/a.js'],
  );
  expect(collectAssetRefs('<script src="/a.js" defer></script>')).toStrictEqual(
    ['/a.js'],
  );
  expect(
    collectAssetRefs("<link href='/a.css' rel='stylesheet'>"),
  ).toStrictEqual(['/a.css']);
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

test('js·css만 센다 — 폰트·이미지는 첫 로드 JS 계산의 대상이 아니다', () => {
  const html =
    '<link href="/f.woff2" rel="preload"><link href="/s.css" rel="stylesheet"><script src="/a.js"></script>';
  expect(collectAssetRefs(html).sort()).toStrictEqual(['/a.js', '/s.css']);
});

test('쿼리·프래그먼트는 떼고, 같은 경로는 한 번만 센다', () => {
  const html =
    '<script src="/a.js?v=1"></script><script src="/a.js#x"></script>';
  expect(collectAssetRefs(html)).toStrictEqual(['/a.js']);
});
