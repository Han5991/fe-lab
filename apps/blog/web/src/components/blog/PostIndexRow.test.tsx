/**
 * 허브 글 목록 한 줄의 표기 규칙.
 *
 * 날짜는 연도를 뗀 `MM-DD`(레퍼런스 `.date`)이고, 날짜 없는 글도 목록에서
 * 사라지면 안 됩니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary } from '@blog/content';
import { PostIndexRow } from './PostIndexRow';

/**
 * next/link는 next.config의 `trailingSlash: true`를 모르는 테스트 환경에서
 * 후행 슬래시를 떼어냅니다. 여기서 검증할 것은 경로 자체라 정규화해서 봅니다.
 */
const pathOf = (el: Element) => el.getAttribute('href')?.replace(/\/$/, '');

const post = (over: Partial<PostSummary> = {}): PostSummary => ({
  slug: 'hello-world',
  originalSlug: 'hello-world',
  relativeDir: '',
  title: '테스트 글',
  date: '2025-06-08',
  readMin: 5,
  status: 'published',
  ...over,
});

describe('PostIndexRow', () => {
  test('제목이 글 상세로 연결된다', () => {
    render(<PostIndexRow post={post()} />);
    expect(pathOf(screen.getByRole('link'))).toBe('/posts/hello-world');
  });

  test('날짜는 연도를 뗀 MM-DD로 표기한다', () => {
    render(<PostIndexRow post={post()} />);
    expect(screen.getByText('06-08')).toBeInTheDocument();
    expect(screen.queryByText(/2025/)).toBeNull();
  });

  test('날짜가 없어도 제목 줄은 남는다', () => {
    render(<PostIndexRow post={post({ date: null })} />);
    expect(screen.getByRole('link')).toHaveTextContent('테스트 글');
  });

  test('slug에 한글이 있으면 인코딩해서 링크한다', () => {
    render(<PostIndexRow post={post({ slug: '번들러-만들기' })} />);
    expect(pathOf(screen.getByRole('link'))).toBe(
      `/posts/${encodeURIComponent('번들러-만들기')}`,
    );
  });
});
