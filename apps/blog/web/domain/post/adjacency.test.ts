import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickAdjacent } from './service';
import type { PostData } from './types';

function makePost(over: Partial<PostData> = {}): PostData {
  const slug = over.slug ?? 'slug';
  return {
    slug,
    originalSlug: slug,
    relativeDir: '',
    title: `title-${slug}`,
    date: '2025-01-01',
    content: '',
    readMin: 1,
    ...over,
  };
}

// date 내림차순 정렬된 배열 (index 0 = 최신) — getAllPosts가 반환하는 형태.
const posts = [
  makePost({ slug: 'c' }), // 최신
  makePost({ slug: 'b' }),
  makePost({ slug: 'a' }), // 가장 오래됨
];

test('pickAdjacent: 중간 글 → prev=더 과거, next=더 최신', () => {
  const { prev, next } = pickAdjacent(posts, 'b');
  assert.equal(prev?.slug, 'a'); // index+1 = 더 과거
  assert.equal(next?.slug, 'c'); // index-1 = 더 최신
  assert.equal(prev?.title, 'title-a');
});

test('pickAdjacent: 최신 글 → next=null', () => {
  const { prev, next } = pickAdjacent(posts, 'c');
  assert.equal(next, null);
  assert.equal(prev?.slug, 'b');
});

test('pickAdjacent: 가장 오래된 글 → prev=null', () => {
  const { prev, next } = pickAdjacent(posts, 'a');
  assert.equal(prev, null);
  assert.equal(next?.slug, 'b');
});

test('pickAdjacent: 존재하지 않는 slug → {null, null}', () => {
  assert.deepEqual(pickAdjacent(posts, 'nope'), { prev: null, next: null });
});

test('pickAdjacent: 글이 하나뿐이면 prev/next 모두 null', () => {
  assert.deepEqual(pickAdjacent([makePost({ slug: 'only' })], 'only'), {
    prev: null,
    next: null,
  });
});

test('pickAdjacent: filterSeries는 같은 시리즈 내에서만 인접 계산', () => {
  const mixed = [
    makePost({ slug: 'x2', series: 'X' }),
    makePost({ slug: 'y1', series: 'Y' }), // 다른 시리즈 → 제외
    makePost({ slug: 'x1', series: 'X' }),
  ];
  // 필터 후 [x2, x1] → x2의 prev=x1, next=null
  const { prev, next } = pickAdjacent(mixed, 'x2', { filterSeries: 'X' });
  assert.equal(prev?.slug, 'x1');
  assert.equal(next, null);
});

test('pickAdjacent: filterTag는 해당 태그 글만', () => {
  const tagged = [
    makePost({ slug: 't3', tags: ['react'] }),
    makePost({ slug: 't2', tags: ['vue'] }),
    makePost({ slug: 't1', tags: ['react'] }),
  ];
  // 필터 후 [t3, t1] → t3의 prev=t1
  const { prev, next } = pickAdjacent(tagged, 't3', { filterTag: 'react' });
  assert.equal(prev?.slug, 't1');
  assert.equal(next, null);
});

test("pickAdjacent: sortOrder='oldest'는 역순이라 prev/next 방향이 뒤집힘", () => {
  // [c,b,a](desc) → reverse → [a,b,c]. 'b'의 prev(index+1)=c(더 최신), next(index-1)=a
  const { prev, next } = pickAdjacent(posts, 'b', { sortOrder: 'oldest' });
  assert.equal(prev?.slug, 'c');
  assert.equal(next?.slug, 'a');
});
