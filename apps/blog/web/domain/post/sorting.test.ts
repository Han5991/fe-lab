import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortByDateDesc } from './repository';
import type { PostData } from './types';

function makePost(over: Partial<PostData> = {}): PostData {
  // 실제 데이터처럼 originalSlug는 기본적으로 slug를 따라가되, over로 개별 지정 가능.
  const slug = over.slug ?? 'slug';
  return {
    slug,
    originalSlug: slug,
    relativeDir: '',
    title: 'title',
    date: '2026-01-01',
    content: '',
    readMin: 1,
    ...over,
  };
}

test('sortByDateDesc: 날짜 내림차순(최신이 먼저)', () => {
  const posts = [
    makePost({ slug: 'old', date: '2026-01-01' }),
    makePost({ slug: 'new', date: '2026-03-01' }),
    makePost({ slug: 'mid', date: '2026-02-01' }),
  ];
  const sorted = sortByDateDesc(posts).map(p => p.slug);
  assert.deepEqual(sorted, ['new', 'mid', 'old']);
});

test('sortByDateDesc: 같은 날짜는 slug로 안정적 2차 정렬 (비결정성 제거)', () => {
  // 입력 순서를 뒤섞어도 동일 날짜는 항상 slug 오름차순으로 고정되어야 한다.
  const a = [
    makePost({ slug: 'banana', date: '2026-01-01' }),
    makePost({ slug: 'apple', date: '2026-01-01' }),
    makePost({ slug: 'cherry', date: '2026-01-01' }),
  ];
  const b = [
    makePost({ slug: 'cherry', date: '2026-01-01' }),
    makePost({ slug: 'banana', date: '2026-01-01' }),
    makePost({ slug: 'apple', date: '2026-01-01' }),
  ];
  assert.deepEqual(
    sortByDateDesc(a).map(p => p.slug),
    ['apple', 'banana', 'cherry'],
  );
  // 입력 순서가 달라도 결과는 동일 (readdir 순서 비의존)
  assert.deepEqual(
    sortByDateDesc(a).map(p => p.slug),
    sortByDateDesc(b).map(p => p.slug),
  );
});

test('sortByDateDesc: 2차 정렬은 slug 없으면 originalSlug 사용', () => {
  const posts = [
    makePost({ slug: '', originalSlug: 'zzz', date: '2026-01-01' }),
    makePost({ slug: '', originalSlug: 'aaa', date: '2026-01-01' }),
  ];
  assert.deepEqual(
    sortByDateDesc(posts).map(p => p.originalSlug),
    ['aaa', 'zzz'],
  );
});

test('sortByDateDesc: 한쪽만 날짜가 있으면 날짜 있는 글이 앞으로', () => {
  const posts = [
    makePost({ slug: 'no-date', date: null }),
    makePost({ slug: 'has-date', date: '2026-01-01' }),
  ];
  assert.deepEqual(
    sortByDateDesc(posts).map(p => p.slug),
    ['has-date', 'no-date'],
  );
});

test('sortByDateDesc: 둘 다 날짜 없으면 제목순(localeCompare)', () => {
  const posts = [
    makePost({ slug: 'b', title: '나중', date: null }),
    makePost({ slug: 'a', title: '가나', date: null }),
  ];
  assert.deepEqual(
    sortByDateDesc(posts).map(p => p.title),
    ['가나', '나중'],
  );
});

test('sortByDateDesc: 입력 배열을 변형하지 않음(순수 함수)', () => {
  const posts = [
    makePost({ slug: 'old', date: '2026-01-01' }),
    makePost({ slug: 'new', date: '2026-03-01' }),
  ];
  const before = posts.map(p => p.slug);
  sortByDateDesc(posts);
  assert.deepEqual(
    posts.map(p => p.slug),
    before,
    '원본 배열 순서가 보존되어야 함',
  );
});
