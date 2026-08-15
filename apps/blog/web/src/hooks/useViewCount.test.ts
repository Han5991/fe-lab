import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// 도메인 배럴의 incrementViewCount를 mock (vi.hoisted로 mock 팩토리에서 참조).
const { incrementViewCount } = vi.hoisted(() => ({
  incrementViewCount: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/domain/analytics', () => ({ incrementViewCount }));

import { useViewCount } from './useViewCount';

function clearAllCookies() {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

beforeEach(() => {
  incrementViewCount.mockClear();
  clearAllCookies();
});

describe('useViewCount', () => {
  test('첫 조회: 쿠키가 없으면 incrementViewCount(slug) 호출 + 쿠키 set', () => {
    renderHook(() => useViewCount('my-post'));
    expect(incrementViewCount).toHaveBeenCalledTimes(1);
    expect(incrementViewCount).toHaveBeenCalledWith('my-post');
    expect(document.cookie).toContain('viewed_my-post');
  });

  test('이미 조회한 글(쿠키 존재): incrementViewCount 미호출', () => {
    document.cookie = 'viewed_my-post=true; path=/';
    renderHook(() => useViewCount('my-post'));
    expect(incrementViewCount).not.toHaveBeenCalled();
  });

  test('레이스 가드: 쿠키를 RPC 전에 set하므로 같은 글 재마운트 시 1회만 호출', () => {
    // 첫 마운트가 쿠키를 set → 두 번째 마운트는 hasViewed=true로 RPC 차단.
    renderHook(() => useViewCount('race-post'));
    renderHook(() => useViewCount('race-post'));
    expect(incrementViewCount).toHaveBeenCalledTimes(1);
  });

  test('한글 slug도 쿠키 키 충돌 없이 1회 카운트', () => {
    renderHook(() => useViewCount('번들러/소개'));
    expect(incrementViewCount).toHaveBeenCalledTimes(1);
    expect(incrementViewCount).toHaveBeenCalledWith('번들러/소개');
    // 다른 한글 slug는 별개 키라 영향 없음
    renderHook(() => useViewCount('번들러/심화'));
    expect(incrementViewCount).toHaveBeenCalledTimes(2);
  });

  test('RPC가 reject돼도 throw하지 않고, 쿠키 가드로 재마운트 시 재호출 안 함', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    incrementViewCount.mockRejectedValueOnce(new Error('rpc fail'));

    renderHook(() => useViewCount('fail-post'));
    expect(incrementViewCount).toHaveBeenCalledTimes(1);

    // 쿠키는 RPC 호출 *전*에 set되므로, reject돼도 재마운트는 차단된다.
    renderHook(() => useViewCount('fail-post'));
    expect(incrementViewCount).toHaveBeenCalledTimes(1);

    // .catch(console.error)가 reject를 삼킨다(에러 전파 없음).
    await vi.waitFor(() => expect(errSpy).toHaveBeenCalled());
    errSpy.mockRestore();
  });
});
