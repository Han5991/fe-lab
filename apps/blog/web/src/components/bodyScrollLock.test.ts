import { afterEach, describe, expect, test } from 'vitest';
import { lockBodyScroll } from './bodyScrollLock';

afterEach(() => {
  document.body.style.overflow = '';
});

describe('lockBodyScroll', () => {
  test('잠그면 hidden, 풀면 원래 값으로 돌아간다', () => {
    document.body.style.overflow = 'scroll';
    const unlock = lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlock();
    expect(document.body.style.overflow).toBe('scroll');
  });

  // 예전엔 오버레이마다 닫힐 때 무조건 ''/'unset'으로 되돌려, 다른 오버레이가
  // 열려 있는데도 잠금이 풀렸다.
  test('겹친 잠금은 마지막 해제에서만 풀린다', () => {
    const unlockA = lockBodyScroll();
    const unlockB = lockBodyScroll();

    unlockA();
    expect(document.body.style.overflow).toBe('hidden');

    unlockB();
    expect(document.body.style.overflow).toBe('');
  });

  test('같은 해제를 두 번 불러도 한 번만 센다', () => {
    const unlockA = lockBodyScroll();
    const unlockB = lockBodyScroll();

    unlockA();
    unlockA();
    expect(document.body.style.overflow).toBe('hidden');

    unlockB();
    expect(document.body.style.overflow).toBe('');
  });
});
