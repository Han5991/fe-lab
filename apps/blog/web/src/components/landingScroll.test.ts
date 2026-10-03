/**
 * 조각(#헤딩·문장 링크)을 달고 연 첫 로드에서는 SSGOI가 스크롤을 맨 위로
 * 되돌리지 않아야 한다 — 공유 키를 줘서 첫 스크롤을 빼고, 예외를 거두면 원래
 * 규칙으로 돌아간다. (SSGOI가 공유 키에 저장값이 없으면 스크롤하지 않는다는
 * 것과 그로 인해 브라우저가 그 자리에 머무는 것은 빌드 산출물을 Chromium으로
 * 열어 확인했다.)
 */
import { describe, expect, test, vi } from 'vitest';
import {
  createLandingScroll,
  LANDING_KEY,
  landedWithFragment,
} from './landingScroll';

const BASE = { exclude: ['/posts/*'] };

/** landedWithFragment가 읽는 두 곳만 흉내 낸 창. */
const fakeWindow = (hash: string, navigationUrl?: string) =>
  ({
    location: { hash },
    performance: {
      getEntriesByType: vi.fn(() =>
        navigationUrl === undefined ? [] : [{ name: navigationUrl }],
      ),
    },
  }) as unknown as Window;

describe('landedWithFragment', () => {
  test('#헤딩으로 열렸으면 참', () => {
    expect(landedWithFragment(fakeWindow('#들어가며'))).toBe(true);
  });

  test('문장 링크는 location에서 지워져도 내비게이션 주소로 알아본다', () => {
    expect(
      landedWithFragment(
        fakeWindow('', 'https://blog.example.dev/posts/a/#:~:text=x'),
      ),
    ).toBe(true);
  });

  test('조각 없이 열렸으면 거짓', () => {
    expect(
      landedWithFragment(fakeWindow('', 'https://blog.example.dev/posts/a/')),
    ).toBe(false);
    expect(landedWithFragment(fakeWindow(''))).toBe(false);
  });
});

describe('createLandingScroll', () => {
  const resolve = (
    preserveScroll: ReturnType<typeof createLandingScroll>['preserveScroll'],
  ) =>
    typeof preserveScroll === 'function'
      ? preserveScroll(false)
      : preserveScroll;

  test('조각 없이 연 첫 로드는 원래 규칙 그대로다', () => {
    const landing = createLandingScroll(BASE, false);

    expect(resolve(landing.preserveScroll)).toBe(BASE);
    expect(landing.isLanding()).toBe(false);
  });

  test('조각을 달고 열면 거둘 때까지 공유 키로 첫 스크롤을 뺀다', () => {
    const landing = createLandingScroll(BASE, true);

    expect(resolve(landing.preserveScroll)).toEqual({ key: LANDING_KEY });

    landing.end();

    expect(resolve(landing.preserveScroll)).toBe(BASE);
    expect(landing.isLanding()).toBe(false);
  });
});
