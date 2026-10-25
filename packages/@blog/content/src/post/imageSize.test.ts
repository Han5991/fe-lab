import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { readImageSize } from './imageSize.ts';
import { createRepository } from './repository.ts';
import { testConfig } from './testing.ts';

// 헤더 리더는 실제 인코더가 만든 파일로 확인한다 — 손으로 쓴 바이트열은 리더와 같은 오해를 공유한다.
async function encode(
  width: number,
  height: number,
  format: 'png' | 'jpeg',
): Promise<Buffer> {
  const image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  });
  return format === 'png' ? image.png().toBuffer() : image.jpeg().toBuffer();
}

test.each([
  ['png 가로형', 1200, 630, 'png'],
  ['png 정사각', 640, 640, 'png'],
  ['jpeg 가로형', 1200, 630, 'jpeg'],
  ['jpeg 세로형', 300, 500, 'jpeg'],
] as const)('readImageSize: %s', async (_name, width, height, format) => {
  expect(readImageSize(await encode(width, height, format))).toStrictEqual({
    width,
    height,
  });
});

test('readImageSize: 머리말이 잘렸거나 모르는 형식이면 null', async () => {
  const png = await encode(10, 10, 'png');
  expect(readImageSize(png.subarray(0, 12))).toBeNull();
  expect(readImageSize(new Uint8Array())).toBeNull();
  expect(readImageSize(new TextEncoder().encode('<svg></svg>'))).toBeNull();
  const jpeg = await encode(10, 10, 'jpeg');
  expect(readImageSize(jpeg.subarray(0, 8))).toBeNull();
});

// ── 로더가 글에 비율을 붙이는가 ──────────────────────────────────────────────

let postsDir = '';

function writePost(name: string, thumbnail?: string): void {
  const thumb = thumbnail === undefined ? '' : `thumbnail: ${thumbnail}\n`;
  writeFileSync(
    join(postsDir, name),
    `---\ntitle: ${name}\nstatus: published\ndate: 2026-01-01\n${thumb}---\n본문`,
  );
}

beforeAll(async () => {
  postsDir = mkdtempSync(join(tmpdir(), 'thumb-aspect-'));
  mkdirSync(join(postsDir, 'sub'));
  writeFileSync(join(postsDir, 'wide.png'), await encode(1200, 630, 'png'));
  writeFileSync(
    join(postsDir, 'sub', 'square.jpg'),
    await encode(64, 64, 'jpeg'),
  );
  writePost('wide.md', 'wide.png');
  writePost('sub/square.md', 'square.jpg');
  writePost('missing.md', 'nope.png');
  writePost('external.md', 'https://cdn.example/x.png');
  writePost('og.md', '/og/og.png');
  writePost('none.md');
});

afterAll(() => {
  rmSync(postsDir, { recursive: true, force: true });
});

test('collectPosts: 글 폴더의 png·jpg 썸네일은 가로/세로를 붙이고, 나머지는 키가 없다', () => {
  const { readAllPosts } = createRepository({
    postsDir,
    isDevelopment: () => true,
    excerptMaxLength: testConfig.seo.descriptionMaxLength,
    timezone: testConfig.timezone,
    isSeriesFolder: () => false,
    metaFilenames: new Set(),
  });
  const aspects = Object.fromEntries(
    readAllPosts().map(post => [post.title, post.thumbnailAspect]),
  );
  expect(aspects['wide.md']).toBeCloseTo(1200 / 630);
  expect(aspects['sub/square.md']).toBe(1);
  for (const name of ['missing.md', 'external.md', 'og.md', 'none.md']) {
    expect(aspects[name]).toBeUndefined();
  }
});
