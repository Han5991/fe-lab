import { afterEach, describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useModalDialog } from './useModalDialog';

const openModal = () =>
  renderHook(() =>
    useModalDialog({
      open: true,
      onClose: () => undefined,
      containerRef: { current: null },
    }),
  );

afterEach(() => {
  document.body.style.overflow = '';
});

describe('useModalDialog - 스크롤 잠금', () => {
  // 먼저 닫힌 쪽이 잠금을 풀면 남은 모달 뒤로 페이지가 스크롤된다.
  test('겹친 모달은 마지막이 닫힐 때만 원래 값으로 되돌린다', () => {
    document.body.style.overflow = 'scroll';
    const first = openModal();
    const second = openModal();
    expect(document.body.style.overflow).toBe('hidden');

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });
});
