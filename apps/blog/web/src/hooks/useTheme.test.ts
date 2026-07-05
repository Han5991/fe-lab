import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  getSnapshot,
  readCookie,
  setTheme,
  systemTheme,
  useTheme,
  writeCookie,
} from './useTheme';

// jsdom엔 matchMedia/startViewTransition가 없다. matchMedia는 테스트마다
// 필요 시 개별 설치하고, startViewTransition은 정의하지 않아 setTheme가 즉시
// 적용(fallback) 경로를 타게 둔다.
function clearThemeCookie() {
  document.cookie = 'theme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      media: '',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

beforeEach(() => {
  clearThemeCookie();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearThemeCookie();
  delete document.documentElement.dataset.theme;
});

describe('readCookie / writeCookie', () => {
  test('쿠키가 없으면 null', () => {
    expect(readCookie()).toBeNull();
  });

  test('writeCookie 후 readCookie 라운드트립: light', () => {
    writeCookie('light');
    expect(document.cookie).toContain('theme=light');
    expect(readCookie()).toBe('light');
  });

  test('writeCookie 후 readCookie 라운드트립: dark', () => {
    writeCookie('dark');
    expect(readCookie()).toBe('dark');
  });

  test('theme 이외의 값은 매칭하지 않는다', () => {
    document.cookie = 'theme=purple; path=/';
    expect(readCookie()).toBeNull();
  });

  test('앞에 다른 쿠키가 있고 공백이 없어도 파싱한다(정규식 whitespace 관용)', () => {
    document.cookie = 'foo=1; path=/';
    document.cookie = 'theme=dark; path=/';
    expect(readCookie()).toBe('dark');
  });
});

describe('systemTheme', () => {
  test('matchMedia가 없으면 light로 폴백', () => {
    // jsdom 기본값: window.matchMedia 미정의
    expect(systemTheme()).toBe('light');
  });

  test('prefers-color-scheme: dark 매칭 시 dark', () => {
    mockMatchMedia(true);
    expect(systemTheme()).toBe('dark');
  });

  test('prefers-color-scheme 미매칭 시 light', () => {
    mockMatchMedia(false);
    expect(systemTheme()).toBe('light');
  });
});

describe('getSnapshot', () => {
  test('data-theme가 없으면 기본값 dark', () => {
    expect(getSnapshot()).toBe('dark');
  });

  test('data-theme가 설정돼 있으면 그 값을 읽는다', () => {
    document.documentElement.dataset.theme = 'light';
    expect(getSnapshot()).toBe('light');
  });
});

describe('setTheme', () => {
  test("setTheme('light')은 data-theme와 쿠키를 light로 설정", () => {
    setTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.cookie).toContain('theme=light');
    expect(readCookie()).toBe('light');
  });

  test("setTheme('dark')은 data-theme와 쿠키를 dark로 설정", () => {
    setTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(readCookie()).toBe('dark');
  });

  test('setTheme는 즉시 반영돼 getSnapshot에서 관측된다', () => {
    setTheme('light');
    expect(getSnapshot()).toBe('light');
    setTheme('dark');
    expect(getSnapshot()).toBe('dark');
  });
});

describe('useTheme', () => {
  test('data-theme가 없으면 기본값 dark를 구독', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('dark');
  });

  test('data-theme=light면 light를 반환', () => {
    document.documentElement.dataset.theme = 'light';
    const { result } = renderHook(() => useTheme());
    expect(result.current).toBe('light');
  });
});
