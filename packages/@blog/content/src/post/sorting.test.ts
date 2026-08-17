import { expect, test } from 'vitest';
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
    status: 'published',
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
  expect(sorted).toStrictEqual(['new', 'mid', 'old']);
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
  expect(sortByDateDesc(a).map(p => p.slug)).toStrictEqual([
    'apple',
    'banana',
    'cherry',
  ]);
  // 입력 순서가 달라도 결과는 동일 (readdir 순서 비의존)
  expect(sortByDateDesc(a).map(p => p.slug)).toStrictEqual(
    sortByDateDesc(b).map(p => p.slug),
  );
});

test('sortByDateDesc: 2차 정렬 키는 originalSlug(파일 경로) — 표시 slug는 영향 없음', () => {
  // display slug와 originalSlug 정렬 순서가 반대가 되도록 구성.
  // 2차 키가 originalSlug이므로 originalSlug 오름차순이 되어야 한다(표시 slug 무관).
  const posts = [
    makePost({
      slug: 'zzz-display',
      originalSlug: 'a-path',
      date: '2026-01-01',
    }),
    makePost({
      slug: 'aaa-display',
      originalSlug: 'z-path',
      date: '2026-01-01',
    }),
  ];
  expect(sortByDateDesc(posts).map(p => p.originalSlug)).toStrictEqual([
    'a-path',
    'z-path',
  ]);
});

test('sortByDateDesc: 파싱 불가 날짜가 섞여도 결정적 (입력 순서 비의존)', () => {
  // 잘못된 날짜는 NaN을 만들지만, NaN을 그대로 반환하면 sort가 0(동등)으로
  // 취급해 입력(readdir) 순서에 의존하게 된다. originalSlug 폴백으로 결정성 유지.
  const mk = (slug: string, date: string | null) => makePost({ slug, date });
  const set1 = [
    mk('invalid', 'not-a-date'),
    mk('jan', '2026-01-01'),
    mk('mar', '2026-03-01'),
  ];
  const set2 = [
    mk('mar', '2026-03-01'),
    mk('invalid', 'not-a-date'),
    mk('jan', '2026-01-01'),
  ];
  // 같은 글 집합이면 입력 순서가 달라도 정렬 결과가 동일해야 한다.
  expect(sortByDateDesc(set1).map(p => p.slug)).toStrictEqual(
    sortByDateDesc(set2).map(p => p.slug),
  );
});

test('sortByDateDesc: 한쪽만 날짜가 있으면 날짜 있는 글이 앞으로', () => {
  const posts = [
    makePost({ slug: 'no-date', date: null }),
    makePost({ slug: 'has-date', date: '2026-01-01' }),
  ];
  expect(sortByDateDesc(posts).map(p => p.slug)).toStrictEqual([
    'has-date',
    'no-date',
  ]);
});

test('sortByDateDesc: 둘 다 날짜 없으면 제목순(코드포인트)', () => {
  const posts = [
    makePost({ slug: 'b', title: '나중', date: null }),
    makePost({ slug: 'a', title: '가나', date: null }),
  ];
  expect(sortByDateDesc(posts).map(p => p.title)).toStrictEqual([
    '가나',
    '나중',
  ]);
});

test('sortByDateDesc: 입력 배열을 변형하지 않음(순수 함수)', () => {
  const posts = [
    makePost({ slug: 'old', date: '2026-01-01' }),
    makePost({ slug: 'new', date: '2026-03-01' }),
  ];
  const before = posts.map(p => p.slug);
  sortByDateDesc(posts);
  expect(
    posts.map(p => p.slug),
    '원본 배열 순서가 보존되어야 함',
  ).toStrictEqual(before);
});
