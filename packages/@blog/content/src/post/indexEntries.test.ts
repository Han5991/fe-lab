import { expect, test } from 'vitest';
import {
  isAdminPostsIndexEntry,
  isPublicSearchIndexEntry,
} from './indexEntries.ts';

const publicEntry = {
  slug: 'hello',
  title: 'Hello',
  date: '2026-05-09',
  excerpt: 'short',
  tags: ['t'],
  series: null,
  seriesTitle: null,
  contentPreview: 'body',
};

const adminEntry = {
  slug: 'hello',
  title: 'Hello',
  date: null,
  tags: [],
  status: 'scheduled',
  scheduledDate: '2026-12-01',
};

test('계약대로 생긴 행은 통과한다', () => {
  expect(isPublicSearchIndexEntry(publicEntry)).toBe(true);
  expect(isAdminPostsIndexEntry(adminEntry)).toBe(true);
});

test.each([
  ['필드가 빠진 행', { ...publicEntry, contentPreview: undefined }],
  ['타입이 다른 필드', { ...publicEntry, excerpt: null }],
  ['문자열이 아닌 태그', { ...publicEntry, tags: ['t', 1] }],
  ['배열', [publicEntry]],
  ['null', null],
])('공개 색인: %s은 거부한다', (_kind, value) => {
  expect(isPublicSearchIndexEntry(value)).toBe(false);
});

test.each([
  ['모르는 발행 상태', { ...adminEntry, status: 'archived' }],
  ['필드가 빠진 행', { ...adminEntry, scheduledDate: undefined }],
])('admin 색인: %s은 거부한다', (_kind, value) => {
  expect(isAdminPostsIndexEntry(value)).toBe(false);
});
