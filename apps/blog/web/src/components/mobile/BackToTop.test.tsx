import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BackToTop } from './BackToTop';

const setScrollY = (y: number) => vi.stubGlobal('scrollY', y);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BackToTop', () => {
  test('맨 위에서는 숨어 있다가, 내려가면 나타난다', () => {
    setScrollY(0);
    render(<BackToTop />);
    expect(
      screen.queryByRole('button', { name: '맨 위로 이동' }),
    ).not.toBeInTheDocument();

    setScrollY(800);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(
      screen.getByRole('button', { name: '맨 위로 이동' }),
    ).toBeInTheDocument();
  });

  // 뒤로 가기의 스크롤 복원으로 이미 내려온 채 마운트되면, 예전엔 다음 스크롤
  // 전까지 버튼이 없었다.
  test('이미 내려와 있는 채로 마운트되면 곧바로 보인다', () => {
    setScrollY(800);
    render(<BackToTop />);

    expect(
      screen.getByRole('button', { name: '맨 위로 이동' }),
    ).toBeInTheDocument();
  });

  test('동작 줄이기를 켜면 부드러운 스크롤 없이 올라간다', () => {
    setScrollY(800);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      })),
    );
    render(<BackToTop />);

    fireEvent.click(screen.getByRole('button', { name: '맨 위로 이동' }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });
});
