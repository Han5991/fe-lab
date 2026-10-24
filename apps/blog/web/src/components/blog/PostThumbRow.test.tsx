/**
 * 홈 "지난 글"의 썸네일 행 — 카드처럼 행 하나가 제목 링크 하나다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary } from '@blog/content/client';
import { PostThumbRow } from './PostThumbRow';

const post = (over: Partial<PostSummary> = {}): PostSummary => ({
  slug: 'row-post',
  originalSlug: 'row-post',
  relativeDir: '',
  title: '행 제목',
  excerpt: '행 발췌',
  date: '2025-06-08',
  readMin: 4,
  tags: ['alpha'],
  status: 'published',
  ...over,
});

describe('PostThumbRow', () => {
  test('행의 링크는 제목 하나이고 썸네일은 장식이다', () => {
    const { container } = render(<PostThumbRow post={post()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName('행 제목');
    expect(link).toHaveAttribute('href', '/posts/row-post/');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  test('제목은 h3, 메타는 날짜와 읽기 시간뿐이다(발췌·태그 없음)', () => {
    render(<PostThumbRow post={post()} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '행 제목',
    );
    expect(screen.getByText('2025-06-08')).toBeInTheDocument();
    expect(screen.getByText('4분')).toBeInTheDocument();
    expect(screen.queryByText('행 발췌')).not.toBeInTheDocument();
    expect(screen.queryByText(/alpha/)).not.toBeInTheDocument();
  });

  test('썸네일은 지연 로드하고 16:9 크기를 단다', () => {
    const { container } = render(<PostThumbRow post={post()} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('width', '160');
    expect(img).toHaveAttribute('height', '90');
  });
});
