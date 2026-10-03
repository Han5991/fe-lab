/**
 * 조각을 달고 연 첫 로드의 예외는 첫 사용자 동작에서 거둔다 — 그때 scroll을 한 번
 * 쏴서 SSGOI가 지금 위치를 원래 규칙의 키로 기록하게 한다. 조각 없이 열면 아무
 * 것도 달지 않는다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PageTransition } from './PageTransition';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

/** window로 쏜 scroll 이벤트를 센다(restoreAllMocks가 걷어 낸다). */
const scrollEvents = () => {
  const spy = vi.spyOn(window, 'dispatchEvent');
  return {
    get length() {
      return spy.mock.calls.filter(([event]) => event.type === 'scroll').length;
    },
  };
};

describe('PageTransition 첫 로드 예외', () => {
  test('조각으로 열면 첫 동작에서 예외를 거두며 scroll을 한 번 쏜다', () => {
    window.history.replaceState(null, '', '/posts/a/#들어가며');
    const seen = scrollEvents();
    render(<PageTransition>본문</PageTransition>);
    expect(screen.getByText('본문')).toBeInTheDocument();

    fireEvent.pointerDown(window);
    fireEvent.keyDown(window, { key: 'Tab' });

    // 한 번만 — 두 번째 동작부터는 리스너가 떨어져 있다.
    expect(seen).toHaveLength(1);
  });

  test('조각 없이 열면 동작해도 아무것도 하지 않는다', () => {
    window.history.replaceState(null, '', '/posts/a/');
    const seen = scrollEvents();
    render(<PageTransition>본문</PageTransition>);

    fireEvent.pointerDown(window);

    expect(seen).toHaveLength(0);
  });
});
