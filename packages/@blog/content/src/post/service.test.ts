/** 공개 판정 기준 시각은 인스턴스마다 하나다 — 목록과 상세가 갈리면 목록의 링크가 404가 된다. */
import { afterEach, expect, test, vi } from 'vitest';
import { createPostService, type PostServiceDeps } from './service.ts';
import type { PostData } from './types.ts';

function makePost(over: Partial<PostData>): PostData {
  const slug = over.slug ?? 'slug';
  return {
    slug,
    originalSlug: slug,
    relativeDir: '',
    title: slug,
    date: '2030-01-01',
    content: '',
    readMin: 1,
    status: 'published',
    ...over,
  };
}

const posts = [
  makePost({ slug: 'live' }),
  // 2030-01-02 00:00 KST = 2030-01-01T15:00Z에 공개
  makePost({
    slug: 'scheduled',
    status: 'scheduled',
    date: '2030-01-02',
    series: 'S',
  }),
  makePost({ slug: 'sibling', series: 'S', date: '2030-01-01' }),
];

const BEFORE = new Date('2030-01-01T00:00:00Z');
const AFTER = new Date('2030-01-03T00:00:00Z');

function service(over: Partial<PostServiceDeps> = {}) {
  return createPostService({
    readAllPosts: () => posts,
    getSeriesMeta: name => ({ name }),
    isDevelopment: () => false,
    timezone: { isoOffset: '+09:00' },
    ...over,
  });
}

afterEach(() => {
  vi.useRealTimers();
});

test('예약 글의 공개 시각을 넘겨도 목록과 상세가 같은 판정을 유지한다', () => {
  // 공개 시각이 흐르는 상황 자체를 재현해야 해서 시계를 돌린다.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(BEFORE);
  const s = service();
  expect(s.getPostBySlug('scheduled')).toBe(null); // slug 캐시가 여기서 만들어진다

  vi.setSystemTime(AFTER);
  const listed = s.getAllPostSlugs().includes('scheduled');
  const detail = s.getPostBySlug('scheduled') !== null;
  expect(listed, '목록과 상세가 갈리면 목록의 링크가 404가 된다').toBe(detail);
  expect(listed).toBe(false);
});

test('주입한 now를 모든 메서드가 함께 본다', () => {
  const before = service({ now: BEFORE });
  expect(before.getAllPostSlugs()).not.toContain('scheduled');
  expect(before.getPostBySlug('scheduled')).toBe(null);
  expect(before.getSeriesAdjacentPosts('sibling').next).toBe(null);

  const after = service({ now: AFTER });
  expect(after.getAllPostSlugs()).toContain('scheduled');
  expect(after.getPostBySlug('scheduled')?.slug).toBe('scheduled');
  expect(after.getSeriesAdjacentPosts('sibling').next?.slug).toBe('scheduled');
});
