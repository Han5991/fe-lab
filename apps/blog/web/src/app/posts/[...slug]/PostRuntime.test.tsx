import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PostRuntime } from './PostRuntime';

// 두 부수효과의 실제 동작(쿠키·RPC·localStorage)은 각자의 테스트가 본다. 여기는
// "페이지의 부수효과 잎"이라는 계약만 잠근다 — 둘 다 글 식별자를 그대로 받고,
// DOM에는 아무것도 그리지 않는다.
const { useViewCount, recordRecentView } = vi.hoisted(() => ({
  useViewCount: vi.fn(),
  recordRecentView: vi.fn(),
}));
vi.mock('@/src/hooks/useViewCount', () => ({ useViewCount }));
vi.mock('@/src/hooks/recentViews', () => ({ recordRecentView }));

describe('PostRuntime', () => {
  test('조회수와 최근 본 글을 slug·title로 남기고 DOM은 그리지 않는다', () => {
    const { container } = render(
      <PostRuntime slug="series/my-post" title="글 제목" />,
    );

    expect(useViewCount).toHaveBeenCalledWith('series/my-post');
    expect(recordRecentView).toHaveBeenCalledExactlyOnceWith(
      'series/my-post',
      '글 제목',
    );
    expect(container.firstChild).toBeNull();
  });
});
