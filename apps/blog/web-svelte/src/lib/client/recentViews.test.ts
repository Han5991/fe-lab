import { expect, test } from 'vitest';
import {
  nextRecentViews,
  parseRecentViews,
  type RecentView,
} from './recentViews.ts';

/**
 * 최근 본 글 계약.
 *
 * `localStorage` 값은 이 앱이 예전에 쓴 것이기도 하고, React 판이 쓴 것이기도
 * 하다(키·모양을 일부러 맞췄다). 즉 **외부 입력**이라 좁히지 않고 믿으면
 * 검색 다이얼로그가 첫 열림에서 던진다.
 */

const view = (slug: string, viewedAt = 1): RecentView => ({
  slug,
  title: slug.toUpperCase(),
  viewedAt,
});

test('parseRecentViews: 저장값이 무엇이든 던지지 않는다', () => {
  expect(parseRecentViews(null)).toStrictEqual([]);
  expect(parseRecentViews('')).toStrictEqual([]);
  expect(parseRecentViews('{ 깨진 JSON')).toStrictEqual([]);
  expect(parseRecentViews('{"slug":"a"}')).toStrictEqual([]);
});

test('parseRecentViews: 세 필드가 다 있는 항목만 남는다', () => {
  // viewedAt을 빠뜨린 항목이 실제로 있었다 — 술어로 걸렀다면 컴파일러가
  // 믿기만 하고 지나갔을 자리다.
  expect(
    parseRecentViews(
      JSON.stringify([
        { slug: 'a', title: 'A', viewedAt: 1 },
        { slug: 'b', title: 'B' },
        { slug: 'c', title: 3, viewedAt: 1 },
      ]),
    ),
  ).toStrictEqual([{ slug: 'a', title: 'A', viewedAt: 1 }]);
});

test('같은 글을 다시 보면 중복이 쌓이지 않고 맨 앞으로 온다', () => {
  const list = [view('a'), view('b'), view('c')];
  expect(nextRecentViews(list, view('b', 9)).map(v => v.slug)).toStrictEqual([
    'b',
    'a',
    'c',
  ]);
});

test('최근 목록은 다섯 편까지다', () => {
  const list = ['a', 'b', 'c', 'd', 'e'].map(s => view(s));
  expect(nextRecentViews(list, view('f'))).toHaveLength(5);
  expect(nextRecentViews(list, view('f')).map(v => v.slug)).toStrictEqual([
    'f',
    'a',
    'b',
    'c',
    'd',
  ]);
});
