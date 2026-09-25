/** 모바일 필터 시트 — 호출부가 매 렌더 새 `onClose`를 넘겨도 초점·스크롤 잠금이 튀지 않는다. */
import { afterEach, describe, expect, test } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { PostsFilterSheet } from './PostsFilterSheet';

/** 시트 안의 필터 버튼이 부모 상태를 바꿔 리렌더시키는 실제 사용 모양. */
const Harness = () => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        필터 열기
      </button>
      <PostsFilterSheet
        open={open}
        // 매 렌더 새 함수 — 컴파일러가 메모이즈를 포기한 렌더와 같은 조건.
        onClose={() => setOpen(false)}
        onClearAll={() => setCount(0)}
        activeCount={count}
      >
        <button type="button" onClick={() => setCount(c => c + 1)}>
          태그 토글
        </button>
      </PostsFilterSheet>
    </>
  );
};

afterEach(() => {
  document.body.style.overflow = '';
});

describe('PostsFilterSheet', () => {
  test('필터를 눌러 부모가 리렌더돼도 초점과 스크롤 잠금이 그대로다', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '필터 열기' }));
    const toggle = screen.getByRole('button', { name: '태그 토글' });
    toggle.focus();

    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(toggle).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
  });

  test('Escape로 닫히고 초점이 연 버튼으로 돌아간다', () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: '필터 열기' });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole('dialog', { name: '글 필터' })).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: 'Escape',
      });
    });

    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
});
