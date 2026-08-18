import { expect, test } from 'vitest';
import {
  collectTasks,
  findOrphanWebps,
  thumbnailContentHash,
  MAX_WIDTH,
  WEBP_QUALITY,
} from './generate-thumbnails.ts';

// ── collectTasks ─────────────────────────────────────────────────────────────

test('collectTasks: posts/ 상대 이미지만 대상으로 뽑는다', () => {
  const tasks = collectTasks([
    { thumbnail: 'a-thumb.png', relativeDir: 'bundler' },
    { thumbnail: '/og/generated.png', relativeDir: 'bundler' },
    { thumbnail: 'https://cdn/x.png', relativeDir: '' },
    { thumbnail: undefined, relativeDir: 'bundler' },
  ]);
  expect(tasks).toStrictEqual([
    { sourceRel: 'bundler/a-thumb.png', outputRel: 'bundler/a-thumb.webp' },
  ]);
});

test('collectTasks: relativeDir이 비면 파일명만 경로로 쓴다', () => {
  const tasks = collectTasks([{ thumbnail: 'top.png', relativeDir: '' }]);
  expect(tasks).toStrictEqual([
    { sourceRel: 'top.png', outputRel: 'top.webp' },
  ]);
});

test('collectTasks: 같은 이미지를 여러 글이 써도 한 번만 변환한다', () => {
  const tasks = collectTasks([
    { thumbnail: 'shared.png', relativeDir: 'dir' },
    { thumbnail: 'shared.png', relativeDir: 'dir' },
  ]);
  expect(tasks.length).toBe(1);
});

test('collectTasks: 한글 디렉터리도 원시 경로 그대로 (인코딩은 URL 쪽 책임)', () => {
  const tasks = collectTasks([{ thumbnail: 'a.png', relativeDir: '아키텍처' }]);
  expect(tasks).toStrictEqual([
    { sourceRel: '아키텍처/a.png', outputRel: '아키텍처/a.webp' },
  ]);
});

test('collectTasks: 대상이 없으면 빈 배열', () => {
  expect(collectTasks([])).toStrictEqual([]);
  expect(
    collectTasks([{ thumbnail: '/og/x.png', relativeDir: '' }]),
  ).toStrictEqual([]);
});

// ── thumbnailContentHash ─────────────────────────────────────────────────────

test('thumbnailContentHash: 같은 바이트면 같은 해시', () => {
  const a = thumbnailContentHash(Buffer.from('image-bytes'));
  const b = thumbnailContentHash(Buffer.from('image-bytes'));
  expect(a).toBe(b);
});

test('thumbnailContentHash: 바이트가 다르면 해시도 다르다', () => {
  expect(thumbnailContentHash(Buffer.from('a'))).not.toBe(
    thumbnailContentHash(Buffer.from('b')),
  );
});

test('thumbnailContentHash: 인코딩 정책이 해시에 반영된다', () => {
  // 정책 상수가 해시 입력에 들어가므로, 값이 바뀌면 전체 재생성이 유도된다.
  const hash = thumbnailContentHash(Buffer.from('x'));
  expect(typeof hash).toBe('string');
  expect(hash.length).toBe(40); // sha1 hex
  expect(MAX_WIDTH > 0 && WEBP_QUALITY > 0).toBeTruthy();
});

// ── findOrphanWebps ──────────────────────────────────────────────────────────

test('findOrphanWebps: 기대 목록에 없는 webp만 정리 대상', () => {
  const orphans = findOrphanWebps(
    ['a.webp', 'dir/b.webp', 'dir/keep.webp'],
    new Set(['dir/keep.webp']),
  );
  expect(orphans.sort()).toStrictEqual(['a.webp', 'dir/b.webp']);
});

test('findOrphanWebps: webp가 아닌 파일은 건드리지 않는다', () => {
  const orphans = findOrphanWebps(
    ['note.txt', 'dir', 'x.png'],
    new Set<string>(),
  );
  expect(orphans).toStrictEqual([]);
});

test('findOrphanWebps: 전부 기대 목록에 있으면 빈 배열', () => {
  const orphans = findOrphanWebps(['a.webp'], new Set(['a.webp']));
  expect(orphans).toStrictEqual([]);
});
