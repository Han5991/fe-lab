/**
 * 허브 대표 글 카드.
 *
 * 메타는 레퍼런스 표기(`2025-09-07 · 12 min`)를 그대로 따르고, 우측 칸은
 * frontmatter thumbnail이 있는 글만 이미지를 씁니다 — 없으면 자동 생성 OG
 * 카드가 아니라 다이어그램 썸네일이 들어갑니다.
 *
 * `@/src/components/diagram`(ParallelThumb)이 있어야 도는 테스트입니다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PostSummary } from '@/domain/post';
import { FeaturedPost } from './FeaturedPost';

/** next/link가 테스트 환경에서 후행 슬래시를 떼므로 경로만 비교합니다. */
const pathOf = (el: Element) => el.getAttribute('href')?.replace(/\/$/, '');

const post = (over: Partial<PostSummary> = {}): PostSummary => ({
  slug: 'parallel-io',
  originalSlug: 'parallel-io',
  relativeDir: 'open-source',
  title: '구글 개발자가 인정한 성능 최적화 기여 후기',
  date: '2025-09-07',
  readMin: 12,
  status: 'published',
  ...over,
});

describe('FeaturedPost', () => {
  test('카드 전체가 글 상세로 가는 링크다', () => {
    render(<FeaturedPost post={post()} />);
    expect(pathOf(screen.getByRole('link'))).toBe('/posts/parallel-io');
  });

  test('메타는 날짜 · 읽기시간(min) 순으로 붙는다', () => {
    render(<FeaturedPost post={post()} />);
    expect(screen.getByText('2025-09-07 · 12 min')).toBeInTheDocument();
  });

  test('날짜가 없으면 읽기시간만 남는다', () => {
    render(<FeaturedPost post={post({ date: null })} />);
    expect(screen.getByText('12 min')).toBeInTheDocument();
  });

  test('seriesLabel을 주면 배지로 보여준다', () => {
    render(<FeaturedPost post={post()} seriesLabel="시리즈 · 오픈소스 2/4" />);
    expect(screen.getByText('시리즈 · 오픈소스 2/4')).toBeInTheDocument();
  });

  test('thumbnail이 있는 글만 이미지를 쓴다', () => {
    const { container } = render(
      <FeaturedPost post={post({ thumbnail: 'cover.png' })} />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/thumbs/open-source/cover.webp');
  });

  test('thumbnail이 없으면 다이어그램 썸네일이 들어간다', () => {
    const { container } = render(<FeaturedPost post={post()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  test('thumbnail이 /og/ 생성 카드를 가리켜도 다이어그램을 쓴다', () => {
    // 1200×630 소셜 카드를 150px 칸에 넣으면 글자가 뭉개진다. 실제 대표 글
    // 다수가 `thumbnail: '/og/...png'` 형태라 이 분기가 기본 경로다.
    const { container } = render(
      <FeaturedPost post={post({ thumbnail: '/og/parallel-io.png' })} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
