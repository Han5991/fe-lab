import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterAndSortPostsByArchiveParams,
  parseTagParam,
  type ArchiveFilterParams,
} from './filtering';
import type { PostSummary } from './types';

type Pickable = Pick<
  PostSummary,
  'slug' | 'title' | 'excerpt' | 'tags' | 'series' | 'date' | 'readMin'
>;

function p(over: Partial<Pickable> = {}): Pickable {
  return {
    slug: 'slug',
    title: 'title',
    excerpt: 'excerpt',
    tags: [],
    series: undefined,
    date: '2026-01-01',
    readMin: 5,
    ...over,
  };
}

const baseParams = (
  over: Partial<ArchiveFilterParams> = {},
): ArchiveFilterParams => ({
  q: '',
  tags: [],
  series: null,
  year: null,
  sort: 'recent',
  ...over,
});

test('parseTagParam: 빈 값/null/undefined → 빈 배열', () => {
  assert.deepEqual(parseTagParam(''), []);
  assert.deepEqual(parseTagParam(null), []);
  assert.deepEqual(parseTagParam(undefined), []);
});

test('parseTagParam: 단일 태그', () => {
  assert.deepEqual(parseTagParam('typescript'), ['typescript']);
});

test('parseTagParam: 다중 태그 + 빈 토큰 제거', () => {
  assert.deepEqual(parseTagParam('a,b,,c,'), ['a', 'b', 'c']);
});

test('archive: query 비면 전체 포스트', () => {
  const posts = [p({ slug: 'a' }), p({ slug: 'b' })];
  const out = filterAndSortPostsByArchiveParams(posts, baseParams());
  assert.equal(out.length, 2);
});

test('archive: q는 title/excerpt/tags 모두 검색 (case-insensitive)', () => {
  const posts = [
    p({ slug: 'a', title: 'TypeScript Patterns', excerpt: '', tags: [] }),
    p({
      slug: 'b',
      title: '리팩토링',
      excerpt: 'design pattern stuff',
      tags: [],
    }),
    p({ slug: 'c', title: '번들러', excerpt: '', tags: ['ast', 'graph'] }),
    p({ slug: 'd', title: 'Other', excerpt: '', tags: ['unrelated'] }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ q: 'PATTERN' }),
  );
  assert.deepEqual(out.map(x => x.slug).sort(), ['a', 'b']);

  const tagHit = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ q: 'ast' }),
  );
  assert.deepEqual(
    tagHit.map(x => x.slug),
    ['c'],
  );
});

test('archive: tags는 AND 매칭', () => {
  const posts = [
    p({ slug: 'a', tags: ['ts', 'design'] }),
    p({ slug: 'b', tags: ['ts'] }),
    p({ slug: 'c', tags: ['design'] }),
    p({ slug: 'd', tags: ['ts', 'design', 'ast'] }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ tags: ['ts', 'design'] }),
  );
  assert.deepEqual(out.map(x => x.slug).sort(), ['a', 'd']);
});

test('archive: series 필터', () => {
  const posts = [
    p({ slug: 'a', series: 'bundler' }),
    p({ slug: 'b', series: 'oss' }),
    p({ slug: 'c', series: undefined }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ series: 'bundler' }),
  );
  assert.deepEqual(
    out.map(x => x.slug),
    ['a'],
  );
});

test('archive: year 필터는 date의 prefix로 매칭', () => {
  const posts = [
    p({ slug: 'a', date: '2025-12-31' }),
    p({ slug: 'b', date: '2026-01-15' }),
    p({ slug: 'c', date: '2026-05-09' }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ year: '2026' }),
  );
  assert.deepEqual(out.map(x => x.slug).sort(), ['b', 'c']);
});

test('archive: sort=recent는 date 내림차순', () => {
  const posts = [
    p({ slug: 'old', date: '2025-01-01' }),
    p({ slug: 'mid', date: '2025-06-01' }),
    p({ slug: 'new', date: '2026-05-09' }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ sort: 'recent' }),
  );
  assert.deepEqual(
    out.map(x => x.slug),
    ['new', 'mid', 'old'],
  );
});

test('archive: sort=shortest는 readMin 오름차순', () => {
  const posts = [
    p({ slug: 'long', readMin: 30 }),
    p({ slug: 'short', readMin: 3 }),
    p({ slug: 'mid', readMin: 12 }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ sort: 'shortest' }),
  );
  assert.deepEqual(
    out.map(x => x.slug),
    ['short', 'mid', 'long'],
  );
});

test('archive: sort=popular는 viewCounts 내림차순, 동률은 date 내림차순', () => {
  const posts = [
    p({ slug: 'a', date: '2026-01-01' }),
    p({ slug: 'b', date: '2026-02-01' }),
    p({ slug: 'c', date: '2026-03-01' }),
    p({ slug: 'd', date: '2026-04-01' }),
  ];
  const counts = new Map([
    ['a', 100],
    ['b', 50],
    ['c', 50],
    // d 없음 → 0
  ]);
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ sort: 'popular', viewCounts: counts }),
  );
  // a(100) > c(50, mar) > b(50, feb) > d(0)
  assert.deepEqual(
    out.map(x => x.slug),
    ['a', 'c', 'b', 'd'],
  );
});

test('archive: sort=popular + viewCounts 미제공 시 모두 0으로 간주(date desc)', () => {
  const posts = [
    p({ slug: 'a', date: '2025-01-01' }),
    p({ slug: 'b', date: '2026-05-09' }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ sort: 'popular' }),
  );
  // viewCounts undefined → 동점 0 → date desc
  assert.deepEqual(
    out.map(x => x.slug),
    ['b', 'a'],
  );
});

test('archive: 필터 + 정렬 합성', () => {
  const posts = [
    p({ slug: 'ts1', tags: ['ts'], readMin: 5, date: '2026-01-01' }),
    p({ slug: 'ts2', tags: ['ts'], readMin: 12, date: '2026-02-01' }),
    p({ slug: 'js1', tags: ['js'], readMin: 3, date: '2026-03-01' }),
  ];
  const out = filterAndSortPostsByArchiveParams(
    posts,
    baseParams({ tags: ['ts'], sort: 'shortest' }),
  );
  // ts 태그만 → ts1(5), ts2(12); shortest → ts1, ts2
  assert.deepEqual(
    out.map(x => x.slug),
    ['ts1', 'ts2'],
  );
});

test('archive: 입력 배열은 변형되지 않음(immutable)', () => {
  const posts = [p({ slug: 'a', readMin: 30 }), p({ slug: 'b', readMin: 3 })];
  const before = posts.map(x => x.slug);
  filterAndSortPostsByArchiveParams(posts, baseParams({ sort: 'shortest' }));
  assert.deepEqual(
    posts.map(x => x.slug),
    before,
    'input posts array order must be preserved',
  );
});
