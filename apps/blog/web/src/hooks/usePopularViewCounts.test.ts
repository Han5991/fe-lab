/**
 * 인기순 조회수 — 꺼져 있으면 묻지 않고, 기다리는 동안만 `pending`이며, 실패·상한 경과에 곧바로
 * 풀린다. 조회 함수는 소스에 주입한다(모듈 mock 없음). 소스는 케이스마다 새로 만든다 — 캐시가 케이스를
 * 넘지 않게.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
  POPULAR_HIDE_CAP_MS,
  createViewCountsSource,
  usePopularViewCounts,
} from './usePopularViewCounts';

const POSTS = [{ slug: 'fixture-a' }, { slug: 'fixture-b' }];
const ROWS = [
  { slug: 'fixture-b', view_count: 9 },
  { slug: 'fixture-a', view_count: 2 },
];

/** 바깥에서 끝낼 수 있는 조회 — 응답 시점을 테스트가 정한다. */
const deferredFetch = () => {
  let resolve: (rows: typeof ROWS) => void = () => undefined;
  let reject: (err: unknown) => void = () => undefined;
  const fetchRows = vi.fn(
    (_slugs: readonly string[]) =>
      new Promise<typeof ROWS>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return {
    fetchRows,
    resolve: (rows: typeof ROWS) => resolve(rows),
    reject: (err: unknown) => reject(err),
  };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('usePopularViewCounts', () => {
  test('꺼져 있으면 묻지 않고 pending도 아니다', () => {
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);

    const { result } = renderHook(() =>
      usePopularViewCounts(POSTS, false, source, vi.fn()),
    );

    expect(fetch.fetchRows).not.toHaveBeenCalled();
    expect(result.current).toEqual({ counts: undefined, pending: false });
  });

  test('켜면 응답 전까지 pending이고, 이 목록의 slug로 물어 받은 조회수를 돌려준다', async () => {
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);

    const { result } = renderHook(() =>
      usePopularViewCounts(POSTS, true, source, vi.fn()),
    );

    expect(result.current.pending).toBe(true);
    expect(fetch.fetchRows).toHaveBeenCalledWith(['fixture-a', 'fixture-b']);

    await act(async () => {
      fetch.resolve(ROWS);
      await Promise.resolve();
    });

    expect(result.current.pending).toBe(false);
    expect(result.current.counts).toEqual(
      new Map([
        ['fixture-b', 9],
        ['fixture-a', 2],
      ]),
    );
  });

  test('실패하면 재시도 없이 곧바로 풀리고 비치명 오류로 한 번 보고한다', async () => {
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);
    const report = vi.fn();
    const failure = new Error('supabase down');

    const { result } = renderHook(() =>
      usePopularViewCounts(POSTS, true, source, report),
    );
    await act(async () => {
      fetch.reject(failure);
      await Promise.resolve();
    });

    expect(result.current.pending).toBe(false);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(failure, false);
    expect(fetch.fetchRows).toHaveBeenCalledTimes(1);
  });

  test('응답이 상한 안에 없으면 그때 풀리고, 늦게 온 조회수는 그때 반영한다', async () => {
    vi.useFakeTimers();
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);

    const { result } = renderHook(() =>
      usePopularViewCounts(POSTS, true, source, vi.fn()),
    );
    act(() => {
      vi.advanceTimersByTime(POPULAR_HIDE_CAP_MS - 1);
    });
    expect(result.current.pending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.pending).toBe(false);
    expect(result.current.counts).toBeUndefined();

    await act(async () => {
      fetch.resolve(ROWS);
      await Promise.resolve();
    });
    expect(result.current.counts?.get('fixture-b')).toBe(9);
  });

  test('응답 전에 껐다가 응답 뒤 다시 켜면, 다시 묻지 않고 그 응답으로 숨김 없이 정렬한다', async () => {
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);
    const { result, rerender } = renderHook(
      ({ enabled }) => usePopularViewCounts(POSTS, enabled, source, vi.fn()),
      { initialProps: { enabled: true } },
    );

    // 인기순을 지나쳐 다른 정렬로 — 효과가 정리된 뒤에 응답이 온다(출처의 캐시는 새것이 된다).
    rerender({ enabled: false });
    await act(async () => {
      fetch.resolve(ROWS);
      await Promise.resolve();
    });
    rerender({ enabled: true });

    expect(result.current.pending).toBe(false);
    expect(result.current.counts?.get('fixture-b')).toBe(9);
    expect(fetch.fetchRows).toHaveBeenCalledTimes(1);
  });

  test('같은 소스로 다시 마운트하면 첫 렌더부터 조회수가 있고, 새것이면 다시 묻지 않는다', async () => {
    const fetch = deferredFetch();
    const source = createViewCountsSource(fetch.fetchRows);
    const first = renderHook(() =>
      usePopularViewCounts(POSTS, true, source, vi.fn()),
    );
    await act(async () => {
      fetch.resolve(ROWS);
      await Promise.resolve();
    });
    await waitFor(() => expect(first.result.current.pending).toBe(false));
    first.unmount();

    // 글을 열었다가 뒤로 온 목록 — 숨김 없이 정렬된 채로 그린다.
    const { result } = renderHook(() =>
      usePopularViewCounts(POSTS, true, source, vi.fn()),
    );

    expect(result.current.pending).toBe(false);
    expect(result.current.counts?.get('fixture-a')).toBe(2);
    expect(fetch.fetchRows).toHaveBeenCalledTimes(1);
  });
});
