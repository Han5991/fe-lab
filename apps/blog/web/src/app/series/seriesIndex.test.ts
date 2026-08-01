/**
 * `/series/` 페이지가 시리즈에 글을 붙이는 규칙.
 *
 * 시리즈 안의 순서는 `_series.yml`의 `order`가 있으면 그 순서, 없으면 날짜
 * 오름차순입니다(연재 1편부터 읽는 것이 자연스러우므로 목록 전체 정렬과 반대).
 */
import { describe, expect, test } from 'vitest';
import { attachSeriesPosts } from './seriesIndex';
import type { PostSummary } from '@/domain/post';
import type { SeriesSummary } from '@/domain/post/aggregate';

const post = (
  slug: string,
  series: string | undefined,
  date: string | null,
): PostSummary => ({
  slug,
  originalSlug: slug,
  relativeDir: series ?? '',
  title: slug,
  date,
  readMin: 1,
  status: 'published',
  series,
});

const summary = (id: string, count: number): SeriesSummary => ({
  id,
  title: id,
  count,
  updated: null,
  colorKey: 'accent',
});

describe('attachSeriesPosts', () => {
  test('order가 없으면 날짜 오름차순으로 붙인다', () => {
    const result = attachSeriesPosts(
      [summary('bundler', 2)],
      [post('b', 'bundler', '2025-05-01'), post('a', 'bundler', '2025-01-01')],
      () => undefined,
    );

    expect(result[0].posts.map(p => p.slug)).toEqual(['a', 'b']);
  });

  test('order가 있으면 날짜보다 order를 우선한다', () => {
    const result = attachSeriesPosts(
      [summary('bundler', 2)],
      [post('a', 'bundler', '2025-01-01'), post('b', 'bundler', '2025-05-01')],
      id => (id === 'bundler' ? ['b', 'a'] : undefined),
    );

    expect(result[0].posts.map(p => p.slug)).toEqual(['b', 'a']);
  });

  test('다른 시리즈 글이나 시리즈 없는 글이 섞이지 않는다', () => {
    const result = attachSeriesPosts(
      [summary('bundler', 1), summary('ci', 1)],
      [
        post('a', 'bundler', '2025-01-01'),
        post('c', 'ci', '2025-02-01'),
        post('loose', undefined, '2025-03-01'),
      ],
      () => undefined,
    );

    expect(result.map(s => s.posts.map(p => p.slug))).toEqual([['a'], ['c']]);
  });

  test('입력 시리즈 순서(최근 갱신 순)를 그대로 유지한다', () => {
    const result = attachSeriesPosts(
      [summary('ci', 0), summary('bundler', 0)],
      [],
      () => undefined,
    );

    expect(result.map(s => s.id)).toEqual(['ci', 'bundler']);
  });

  test('글이 하나도 없는 시리즈도 빠뜨리지 않는다', () => {
    const result = attachSeriesPosts(
      [summary('empty', 0)],
      [],
      () => undefined,
    );

    expect(result).toHaveLength(1);
    expect(result[0].posts).toEqual([]);
  });
});
