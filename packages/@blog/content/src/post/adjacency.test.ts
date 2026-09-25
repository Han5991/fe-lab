import { expect, test } from 'vitest';
import { sortByDateDesc } from './repository.ts';
import { sortPostsBySeriesOrder } from './series.ts';
import {
  createPostService,
  pickAdjacent,
  type PostService,
} from './service.ts';
import type { PostData } from './types.ts';

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
    status: 'published',
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
  expect(prev?.slug).toBe('a'); // index+1 = 더 과거
  expect(next?.slug).toBe('c'); // index-1 = 더 최신
  expect(prev?.title).toBe('title-a');
});

test('pickAdjacent: 최신 글 → next=null', () => {
  const { prev, next } = pickAdjacent(posts, 'c');
  expect(next).toBe(null);
  expect(prev?.slug).toBe('b');
});

test('pickAdjacent: 가장 오래된 글 → prev=null', () => {
  const { prev, next } = pickAdjacent(posts, 'a');
  expect(prev).toBe(null);
  expect(next?.slug).toBe('b');
});

test('pickAdjacent: 존재하지 않는 slug → {null, null}', () => {
  expect(pickAdjacent(posts, 'nope')).toStrictEqual({ prev: null, next: null });
});

test('pickAdjacent: 글이 하나뿐이면 prev/next 모두 null', () => {
  expect(pickAdjacent([makePost({ slug: 'only' })], 'only')).toStrictEqual({
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
  expect(prev?.slug).toBe('x1');
  expect(next).toBe(null);
});

test('pickAdjacent: filterTag는 해당 태그 글만', () => {
  const tagged = [
    makePost({ slug: 't3', tags: ['react'] }),
    makePost({ slug: 't2', tags: ['vue'] }),
    makePost({ slug: 't1', tags: ['react'] }),
  ];
  // 필터 후 [t3, t1] → t3의 prev=t1
  const { prev, next } = pickAdjacent(tagged, 't3', { filterTag: 'react' });
  expect(prev?.slug).toBe('t1');
  expect(next).toBe(null);
});

test("pickAdjacent: sortOrder='oldest'는 역순이라 prev/next 방향이 뒤집힘", () => {
  // [c,b,a](desc) → reverse → [a,b,c]. 'b'의 prev(index+1)=c(더 최신), next(index-1)=a
  const { prev, next } = pickAdjacent(posts, 'b', { sortOrder: 'oldest' });
  expect(prev?.slug).toBe('c');
  expect(next?.slug).toBe('a');
});

// ── getSeriesAdjacentPosts: 시리즈 헤더(sortPostsBySeriesOrder)와 같은 순서 ──

function seriesService(
  seriesPosts: PostData[],
  meta: { order?: string[] } = {},
): PostService {
  return createPostService({
    // 로더와 같은 모양(날짜 내림차순 + 경로 오름차순)으로 넘긴다.
    readAllPosts: () => sortByDateDesc(seriesPosts),
    getSeriesMeta: name => ({ name, ...meta }),
    isDevelopment: () => false,
    timezone: { isoOffset: '+09:00' },
  });
}

/** 1편에서 "다음 글"만 따라가며 방문한 순서 */
function walkNext(service: PostService, first: string): string[] {
  const visited = [first];
  let next = service.getSeriesAdjacentPosts(first).next;
  while (next && visited.length < 20) {
    visited.push(next.slug);
    next = service.getSeriesAdjacentPosts(next.slug).next;
  }
  return visited;
}

const sameDateSeries = [
  makePost({ slug: 's1', date: '2025-05-05', series: 'S' }),
  makePost({ slug: 's2-api', date: '2025-06-01', series: 'S' }),
  makePost({ slug: 's3-api-di', date: '2025-06-01', series: 'S' }),
  makePost({ slug: 's4-service', date: '2025-06-08', series: 'S' }),
  makePost({ slug: 's5-service-di', date: '2025-06-08', series: 'S' }),
  makePost({ slug: 's6', date: '2025-06-15', series: 'S' }),
];

test.each([
  [
    undefined,
    ['s1', 's2-api', 's3-api-di', 's4-service', 's5-service-di', 's6'],
  ],
  [
    ['s6', 's1', 's3-api-di', 's2-api', 's5-service-di', 's4-service'],
    ['s6', 's1', 's3-api-di', 's2-api', 's5-service-di', 's4-service'],
  ],
])(
  'getSeriesAdjacentPosts: order %j — "다음 글"은 시리즈 헤더와 같은 순서로 이어진다',
  (order, expected) => {
    const service = seriesService(sameDateSeries, { order });
    expect(
      sortPostsBySeriesOrder(service.getAllPosts(), order).map(p => p.slug),
    ).toStrictEqual(expected);
    expect(walkNext(service, expected[0] ?? '')).toStrictEqual(expected);
  },
);
