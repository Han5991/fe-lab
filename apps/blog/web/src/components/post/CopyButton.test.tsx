/**
 * 복사 버튼 — "복사됨" 표시를 거두는 타이머가 연타·언마운트에서 어긋나지 않는다.
 * 클립보드는 전역 스텁으로 주입하고(이 파일은 vi.stubGlobal로 격리된다), 시계는 가짜로 돌린다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CopyButton } from './CopyButton';

const COPIED_MS = 2000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** 클릭하고 클립보드 프라미스가 풀릴 때까지 마이크로태스크를 비운다. */
async function press() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
    await Promise.resolve();
  });
}

describe('CopyButton', () => {
  test('복사하면 이름이 "코드 복사됨"이 되고 2초 뒤 돌아온다', async () => {
    render(<CopyButton content="pnpm test" />);

    await press();
    expect(screen.getByRole('button', { name: '코드 복사됨' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(screen.getByRole('button', { name: '코드 복사' })).toBeVisible();
  });

  test('복사한 동안에만 아이콘 교차가 켜진다(data-on)', async () => {
    render(<CopyButton content="pnpm test" />);
    const swap = () =>
      screen.getByRole('button').querySelector('[aria-hidden="true"]');
    expect(swap()).not.toHaveAttribute('data-on');

    await press();
    expect(swap()).toHaveAttribute('data-on');

    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(swap()).not.toHaveAttribute('data-on');
  });

  test('다시 누르면 표시 시간이 마지막 누름부터 다시 센다', async () => {
    render(<CopyButton content="pnpm test" />);

    await press();
    act(() => {
      vi.advanceTimersByTime(COPIED_MS - 500);
    });
    await press();
    // 첫 누름의 타이머가 살아 있었다면 여기서 이미 거둬졌다.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByRole('button', { name: '코드 복사됨' })).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(COPIED_MS);
    });
    expect(screen.getByRole('button', { name: '코드 복사' })).toBeVisible();
  });

  test('언마운트하면 남은 타이머를 걷는다', async () => {
    const { unmount } = render(<CopyButton content="pnpm test" />);

    await press();
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  test('복사 프라미스가 풀리기 전에 언마운트하면 타이머를 새로 걸지 않는다', async () => {
    let resolveWrite: () => void = () => undefined;
    vi.stubGlobal('navigator', {
      ...navigator,
      clipboard: {
        writeText: vi.fn(
          () =>
            new Promise<void>(resolve => {
              resolveWrite = resolve;
            }),
        ),
      },
    });
    const { unmount } = render(<CopyButton content="pnpm test" />);

    await press();
    unmount();
    await act(async () => {
      resolveWrite();
      await Promise.resolve();
    });

    // 언마운트 cleanup은 이미 지나갔다 — 그 뒤 await가 풀리며 건 타이머는 아무도 걷지 못한다.
    expect(vi.getTimerCount()).toBe(0);
  });
});
