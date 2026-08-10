import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SERIES_MIN_POSTS,
  isSeriesFolder,
  sortPostsBySeriesOrder,
} from './series';

interface Fixture {
  slug: string;
  originalSlug: string;
  date?: string | null;
}

function makePost(over: Partial<Fixture> = {}): Fixture {
  const slug = over.slug ?? 'slug';
  return {
    slug,
    originalSlug: slug,
    date: '2026-01-01',
    ...over,
  };
}

test('sortPostsBySeriesOrder: order=[b,a] → b가 a보다 앞', () => {
  const posts = [
    makePost({ slug: 'a', date: '2026-01-01' }),
    makePost({ slug: 'b', date: '2026-01-02' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['b', 'a']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['b', 'a'],
  );
});

test('sortPostsBySeriesOrder: order는 date를 무시하고 순서를 우선시', () => {
  // a의 날짜가 더 빠르지만 order가 b를 앞에 두므로 b가 먼저.
  const posts = [
    makePost({ slug: 'a', date: '2020-01-01' }),
    makePost({ slug: 'b', date: '2099-12-31' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['b', 'a']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['b', 'a'],
  );
});

test('sortPostsBySeriesOrder: 3개 이상도 order 순서대로', () => {
  const posts = [
    makePost({ slug: 'x', date: '2026-01-01' }),
    makePost({ slug: 'y', date: '2026-01-02' }),
    makePost({ slug: 'z', date: '2026-01-03' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['z', 'x', 'y']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['z', 'x', 'y'],
  );
});

test('sortPostsBySeriesOrder: order에 slug 없으면 originalSlug로 rank 매칭', () => {
  // order에는 originalSlug 값만 들어있고, 표시 slug는 다르다.
  const posts = [
    makePost({ slug: 'display-a', originalSlug: 'orig-a', date: '2026-01-01' }),
    makePost({ slug: 'display-b', originalSlug: 'orig-b', date: '2026-01-02' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['orig-b', 'orig-a']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['display-b', 'display-a'],
  );
});

test('sortPostsBySeriesOrder: slug 매칭이 originalSlug 매칭보다 우선', () => {
  // slug로 먼저 조회되므로 slug 'a'(rank 0)가 originalSlug 매칭보다 우선.
  const posts = [
    makePost({ slug: 'a', originalSlug: 'zzz', date: '2026-01-01' }),
    makePost({ slug: 'b', originalSlug: 'a', date: '2026-01-02' }),
  ];
  // order=['a','b']: 첫 글은 slug='a' → rank 0, 둘째는 slug='b' → rank 1.
  const sorted = sortPostsBySeriesOrder(posts, ['a', 'b']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['a', 'b'],
  );
});

test('sortPostsBySeriesOrder: order에 둘 다 없는 글은 맨 뒤(POSITIVE_INFINITY)', () => {
  const posts = [
    makePost({ slug: 'unranked', date: '2026-01-01' }),
    makePost({ slug: 'ranked', date: '2026-12-31' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['ranked']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['ranked', 'unranked'],
  );
});

test('sortPostsBySeriesOrder: order 미발견 글끼리는 date localeCompare 오름차순 폴백', () => {
  // 셋 다 order에 없으므로 모두 POSITIVE_INFINITY → date 오름차순.
  const posts = [
    makePost({ slug: 'c', date: '2026-03-01' }),
    makePost({ slug: 'a', date: '2026-01-01' }),
    makePost({ slug: 'b', date: '2026-02-01' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['nonexistent']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['a', 'b', 'c'],
  );
});

test('sortPostsBySeriesOrder: ranked 먼저, 그 뒤 unranked는 date 오름차순', () => {
  const posts = [
    makePost({ slug: 'u2', date: '2026-05-01' }),
    makePost({ slug: 'r', date: '2026-12-31' }),
    makePost({ slug: 'u1', date: '2026-01-01' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['r']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['r', 'u1', 'u2'],
  );
});

test('sortPostsBySeriesOrder: 같은 rank(둘 다 미발견) tie는 date 오름차순', () => {
  const posts = [
    makePost({ slug: 'later', date: '2026-06-01' }),
    makePost({ slug: 'earlier', date: '2026-01-01' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['x', 'y']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['earlier', 'later'],
  );
});

test('sortPostsBySeriesOrder: order=undefined → 전체 date 오름차순', () => {
  const posts = [
    makePost({ slug: 'b', date: '2026-02-01' }),
    makePost({ slug: 'a', date: '2026-01-01' }),
    makePost({ slug: 'c', date: '2026-03-01' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, undefined);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['a', 'b', 'c'],
  );
});

test('sortPostsBySeriesOrder: order=[] (빈 배열) → 전체 date 오름차순', () => {
  const posts = [
    makePost({ slug: 'b', date: '2026-02-01' }),
    makePost({ slug: 'a', date: '2026-01-01' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, []);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['a', 'b'],
  );
});

test('sortPostsBySeriesOrder: date null/undefined는 (a.date ?? "")로 처리되어 맨 앞', () => {
  // order 없는 경로: ''(빈 문자열)이 어떤 날짜 문자열보다 먼저 정렬됨.
  const posts = [
    makePost({ slug: 'has', date: '2026-01-01' }),
    makePost({ slug: 'nullish', date: null }),
    makePost({ slug: 'undef', date: undefined }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, undefined);
  // null과 undefined는 둘 다 ''로 취급되어 tie → 안정 정렬로 입력 순서(nullish, undef) 유지.
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['nullish', 'undef', 'has'],
  );
});

test('sortPostsBySeriesOrder: order 경로에서도 date 없는 unranked가 앞', () => {
  // 둘 다 order에 없어 rank 동일(POSITIVE_INFINITY) → date 폴백, ''가 맨 앞.
  const posts = [
    makePost({ slug: 'dated', date: '2026-01-01' }),
    makePost({ slug: 'no-date', date: null }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, ['ranked-only']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['no-date', 'dated'],
  );
});

test('sortPostsBySeriesOrder: 빈 입력 배열 → 빈 배열 반환', () => {
  assert.deepEqual(sortPostsBySeriesOrder([], ['a', 'b']), []);
  assert.deepEqual(sortPostsBySeriesOrder([], undefined), []);
  assert.deepEqual(sortPostsBySeriesOrder([], []), []);
});

test('sortPostsBySeriesOrder: 단일 원소 배열은 그대로', () => {
  const posts = [makePost({ slug: 'only', date: '2026-01-01' })];
  assert.deepEqual(
    sortPostsBySeriesOrder(posts, ['only']).map(p => p.slug),
    ['only'],
  );
  assert.deepEqual(
    sortPostsBySeriesOrder(posts, undefined).map(p => p.slug),
    ['only'],
  );
});

test('sortPostsBySeriesOrder: 특수문자/한글 slug도 정상 정렬', () => {
  const posts = [
    makePost({ slug: '나중-글', date: '2026-02-01' }),
    makePost({ slug: '첫-글', date: '2026-01-01' }),
  ];
  // order로 한글 slug 매칭.
  const sorted = sortPostsBySeriesOrder(posts, ['나중-글', '첫-글']);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['나중-글', '첫-글'],
  );
});

test('sortPostsBySeriesOrder: 날짜 문자열은 사전식(localeCompare) 비교 — datetime도 일관', () => {
  const posts = [
    makePost({ slug: 'noon', date: '2026-01-01T12:00:00+09:00' }),
    makePost({ slug: 'morning', date: '2026-01-01T09:00:00+09:00' }),
  ];
  const sorted = sortPostsBySeriesOrder(posts, undefined);
  assert.deepEqual(
    sorted.map(p => p.slug),
    ['morning', 'noon'],
  );
});

test('sortPostsBySeriesOrder: 입력 배열을 변형하지 않음(복사본 정렬)', () => {
  const posts = [
    makePost({ slug: 'a', date: '2026-03-01' }),
    makePost({ slug: 'b', date: '2026-01-01' }),
  ];
  const before = posts.map(p => p.slug);
  const result = sortPostsBySeriesOrder(posts, undefined);
  assert.notEqual(result, posts, '새 배열이 반환되어야 함');
  assert.deepEqual(
    posts.map(p => p.slug),
    before,
    '원본 배열 순서가 보존되어야 함',
  );
});

test('sortPostsBySeriesOrder: order 경로에서도 입력 불변', () => {
  const posts = [
    makePost({ slug: 'a', date: '2026-01-01' }),
    makePost({ slug: 'b', date: '2026-01-02' }),
  ];
  const before = posts.map(p => p.slug);
  const result = sortPostsBySeriesOrder(posts, ['b', 'a']);
  assert.notEqual(result, posts);
  assert.deepEqual(
    posts.map(p => p.slug),
    before,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// isSeriesFolder
//
// 시리즈는 폴더 경로로 결정되므로, 주제별로 글을 묶어 둔 한 편짜리 폴더까지
// 전부 시리즈가 되어 `시리즈 · testing 1/1` 같은 배지가 붙었다. 아래 규칙이
// 홈 배지 / 글 상세 배지 / 시리즈 목록 / 아카이브 필터의 단일 기준이다.
// ─────────────────────────────────────────────────────────────────────────────

test('isSeriesFolder: 2편 이상이면 _series.yml 없이도 시리즈', () => {
  assert.equal(isSeriesFolder('__없는-폴더__', SERIES_MIN_POSTS), true);
  assert.equal(isSeriesFolder('__없는-폴더__', 5), true);
});

test('isSeriesFolder: 1편짜리 폴더는 시리즈가 아니다', () => {
  assert.equal(isSeriesFolder('__없는-폴더__', 1), false);
});

test('isSeriesFolder: 0편도 시리즈가 아니다', () => {
  assert.equal(isSeriesFolder('__없는-폴더__', 0), false);
});

test('isSeriesFolder: _series.yml이 있으면 1편이어도 시리즈', () => {
  // ci 폴더에는 실제 _series.yml이 있다. 편수와 무관하게 저자가 시리즈로
  // 선언한 것이므로 존중한다.
  assert.equal(isSeriesFolder('ci', 1), true);
});

test('isSeriesFolder: meta를 주입하면 디스크를 읽지 않는다', () => {
  // 스크립트(generate-llms)의 단위 테스트가 실제 posts/ 폴더 상태에 따라
  // 흔들리지 않도록 열어 둔 인자.
  assert.equal(isSeriesFolder('없는폴더', 1, { name: '없는폴더' }), true);
  assert.equal(isSeriesFolder('없는폴더', 1, null), false);
  // 2편 이상이면 meta와 무관하게 시리즈
  assert.equal(isSeriesFolder('없는폴더', 2, null), true);
});

test('isSeriesFolder: null을 명시하면 디스크를 읽지 않고 "메타 없음"', () => {
  // `undefined`(미지정 → 조회)와 `null`(메타 없음)이 구분되어야 한다.
  // bundler는 실제로 `_series.yml`이 있는 폴더라, 조회했다면 true가 나온다.
  assert.equal(isSeriesFolder('bundler', 1, null), false);
  assert.equal(isSeriesFolder('bundler', 1), true);
});
