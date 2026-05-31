import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getRecentViews,
  recordRecentView,
  useRecordRecentView,
} from './useRecentViews';

const KEY = 'blog_recent_views';

beforeEach(() => {
  window.localStorage.clear();
});

describe('getRecentViews', () => {
  test('키가 없으면 빈 배열', () => {
    expect(getRecentViews()).toEqual([]);
  });

  test('손상된 JSON은 빈 배열로 복구', () => {
    window.localStorage.setItem(KEY, '{not json');
    expect(getRecentViews()).toEqual([]);
  });

  test('배열이 아니면 빈 배열', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ slug: 'x' }));
    expect(getRecentViews()).toEqual([]);
  });

  test('유효하지 않은 항목(비문자열 slug/null/누락)은 필터링', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        { slug: 'a', title: 'A', viewedAt: 1 },
        { slug: 123, title: 'bad' },
        null,
        { title: 'no-slug' },
      ]),
    );
    const result = getRecentViews();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('a');
  });
});

describe('recordRecentView', () => {
  test('새 항목을 맨 앞(최신)에 추가', () => {
    recordRecentView('a', 'A');
    recordRecentView('b', 'B');
    expect(getRecentViews().map(r => r.slug)).toEqual(['b', 'a']);
  });

  test('같은 slug 재방문 시 중복 없이 맨 앞으로 이동(타이틀 갱신)', () => {
    recordRecentView('a', 'A');
    recordRecentView('b', 'B');
    recordRecentView('a', 'A again');
    const result = getRecentViews();
    expect(result.map(r => r.slug)).toEqual(['a', 'b']);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('A again');
  });

  test('MAX=5개로 제한하고 가장 오래된 것을 제거', () => {
    for (const s of ['a', 'b', 'c', 'd', 'e', 'f']) {
      recordRecentView(s, s.toUpperCase());
    }
    const result = getRecentViews();
    expect(result).toHaveLength(5);
    // 최신순 f,e,d,c,b — 가장 오래된 a가 밀려남
    expect(result.map(r => r.slug)).toEqual(['f', 'e', 'd', 'c', 'b']);
  });

  test('viewedAt에 타임스탬프(number)를 기록하고 최신 항목이 더 크거나 같음', () => {
    recordRecentView('a', 'A');
    recordRecentView('b', 'B');
    const result = getRecentViews();
    expect(typeof result[0].viewedAt).toBe('number');
    // b가 최신(index 0) → viewedAt이 a(index 1)보다 크거나 같아야 함
    expect(result[0].viewedAt).toBeGreaterThanOrEqual(result[1].viewedAt);
  });

  test('setItem이 throw해도(한도 초과/사적 모드) 예외를 삼키고 조용히 반환', () => {
    const spy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceeded');
      });
    expect(() => recordRecentView('a', 'A')).not.toThrow();
    spy.mockRestore();
  });
});

describe('useRecordRecentView', () => {
  test('마운트 시 slug를 기록', () => {
    renderHook(() => useRecordRecentView('hello', 'Hello'));
    expect(getRecentViews().map(r => r.slug)).toEqual(['hello']);
  });

  test('slug가 null이면 기록하지 않음', () => {
    renderHook(() => useRecordRecentView(null, 'X'));
    expect(getRecentViews()).toEqual([]);
  });
});
