import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary } from '@blog/content';
import { PostGridCard } from './PostGridCard';

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
  // 썸네일 alt에 제목을 넣으면 카드 링크의 이름에 제목이 두 번 들어가
  // 스크린리더가 카드마다 제목을 두 번 읽었다.
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
