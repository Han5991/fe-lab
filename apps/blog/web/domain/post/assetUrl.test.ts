import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolvePostAssetUrl } from './assetUrl';

test('절대 URL(https/data)은 그대로 반환', () => {
  assert.equal(
    resolvePostAssetUrl('https://example.com/x.png', 'dir'),
    'https://example.com/x.png',
  );
  assert.equal(
    resolvePostAssetUrl('data:image/png;base64,AAA', 'dir'),
    'data:image/png;base64,AAA',
  );
});

test('protocol-relative(//)와 앵커(#)는 그대로 반환', () => {
  assert.equal(
    resolvePostAssetUrl('//cdn.example.com/x.png'),
    '//cdn.example.com/x.png',
  );
  assert.equal(resolvePostAssetUrl('#section', 'dir'), '#section');
});

test('루트 경로(/...)는 그대로 반환', () => {
  assert.equal(
    resolvePostAssetUrl('/posts/x/pic.png', 'ignored'),
    '/posts/x/pic.png',
  );
});

test('상대 경로 + relativeDir → /posts/{dir}/{file}', () => {
  assert.equal(
    resolvePostAssetUrl('./pic.png', 'series-a'),
    '/posts/series-a/pic.png',
  );
  assert.equal(
    resolvePostAssetUrl('img/start.png', 'feconf'),
    '/posts/feconf/img/start.png',
  );
});

test('루트 레벨 포스트(relativeDir 없음)도 /posts/ 프리픽스 유지', () => {
  assert.equal(
    resolvePostAssetUrl('./pnpm.img_1.png'),
    '/posts/pnpm.img_1.png',
  );
  assert.equal(resolvePostAssetUrl('pnpm.img.png', ''), '/posts/pnpm.img.png');
});

test('한글/공백 relativeDir는 세그먼트별 percent-encoding', () => {
  assert.equal(
    resolvePostAssetUrl('./img.png', 'nextjs deploy'),
    '/posts/nextjs%20deploy/img.png',
  );
  assert.equal(
    resolvePostAssetUrl('./img.png', '회고'),
    '/posts/%ED%9A%8C%EA%B3%A0/img.png',
  );
});
