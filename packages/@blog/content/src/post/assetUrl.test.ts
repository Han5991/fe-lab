import { expect, test } from 'vitest';
import { resolvePostAssetUrl } from './assetUrl.ts';

test('절대 URL(https/data)은 그대로 반환', () => {
  expect(resolvePostAssetUrl('https://example.com/x.png', 'dir')).toBe(
    'https://example.com/x.png',
  );
  expect(resolvePostAssetUrl('data:image/png;base64,AAA', 'dir')).toBe(
    'data:image/png;base64,AAA',
  );
});

test('protocol-relative(//)와 앵커(#)는 그대로 반환', () => {
  expect(resolvePostAssetUrl('//cdn.example.com/x.png')).toBe(
    '//cdn.example.com/x.png',
  );
  expect(resolvePostAssetUrl('#section', 'dir')).toBe('#section');
});

test('루트 경로(/...)는 그대로 반환', () => {
  expect(resolvePostAssetUrl('/posts/x/pic.png', 'ignored')).toBe(
    '/posts/x/pic.png',
  );
});

test('상대 경로 + relativeDir → /posts/{dir}/{file}', () => {
  expect(resolvePostAssetUrl('./pic.png', 'series-a')).toBe(
    '/posts/series-a/pic.png',
  );
  expect(resolvePostAssetUrl('img/start.png', 'feconf')).toBe(
    '/posts/feconf/img/start.png',
  );
});

test('루트 레벨 포스트(relativeDir 없음)도 /posts/ 프리픽스 유지', () => {
  expect(resolvePostAssetUrl('./pnpm.img_1.png')).toBe('/posts/pnpm.img_1.png');
  expect(resolvePostAssetUrl('pnpm.img.png', '')).toBe('/posts/pnpm.img.png');
});

test('한글/공백 relativeDir는 세그먼트별 percent-encoding', () => {
  expect(resolvePostAssetUrl('./img.png', 'nextjs deploy')).toBe(
    '/posts/nextjs%20deploy/img.png',
  );
  expect(resolvePostAssetUrl('./img.png', '회고')).toBe(
    '/posts/%ED%9A%8C%EA%B3%A0/img.png',
  );
});
