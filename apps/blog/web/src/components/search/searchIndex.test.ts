import { describe, expect, test } from 'vitest';
import { toSearchPost } from './searchIndex';

describe('toSearchPost', () => {
  test('온전한 항목은 그대로 옮긴다', () => {
    expect(
      toSearchPost({
        slug: 'a',
        title: 'A',
        date: '2026-01-01',
        excerpt: 'e',
        tags: ['x'],
        series: 'lab/s',
        seriesTitle: 'S',
        contentPreview: 'c',
      }),
    ).toEqual({
      slug: 'a',
      title: 'A',
      date: '2026-01-01',
      excerpt: 'e',
      tags: ['x'],
      series: 'lab/s',
      seriesTitle: 'S',
      contentPreview: 'c',
    });
  });

  test('slug나 title이 없으면 버린다', () => {
    expect(toSearchPost({ title: 'A' })).toBeNull();
    expect(toSearchPost({ slug: 'a' })).toBeNull();
    expect(toSearchPost(null)).toBeNull();
    expect(toSearchPost('a')).toBeNull();
  });

  test('선택 필드는 빈 값으로 채우고, 문자열 아닌 태그는 거른다', () => {
    expect(toSearchPost({ slug: 'a', title: 'A', tags: ['x', 1] })).toEqual({
      slug: 'a',
      title: 'A',
      date: null,
      excerpt: '',
      tags: ['x'],
      series: null,
      seriesTitle: null,
      contentPreview: '',
    });
  });
});
