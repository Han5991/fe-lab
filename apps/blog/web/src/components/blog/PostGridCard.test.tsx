import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary } from '@blog/content/client';
import { PostGridCard } from './PostGridCard';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 목록에 둔다.
vi.mock('next/navigation', async () => {
  const { POSTS_PATH } = await import('@blog/content/client');
  return { usePathname: () => POSTS_PATH };
});

const post: PostSummary = {
  slug: 'grid-post',
  originalSlug: 'grid-post',
  relativeDir: '',
  title: '카드 제목',
  date: '2026-01-01',
  readMin: 3,
  status: 'published',
};

describe('PostGridCard', () => {
  // 썸네일 alt에 제목을 넣으면 스크린리더가 카드마다 제목을 두 번 읽는다.
  test('썸네일은 장식이고 링크 이름에 제목이 한 번만 들어간다', () => {
    render(<PostGridCard post={post} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // 계산된 접근 가능한 이름(alt 포함)에서 제목이 정확히 한 번.
    expect(
      screen.getByRole('link', {
        name: name => name.split('카드 제목').length === 2,
      }),
    ).toBeInTheDocument();
  });
});
