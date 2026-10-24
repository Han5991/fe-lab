/**
 * 글 카드 — 카드 하나가 링크 하나(제목)이고, 커버는 장식이다.
 */
import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { PostSummary } from '@blog/content/client';
import { PostCard } from './PostCard';

/** href는 postPath 계약 그대로(후행 슬래시 포함) — vitest.setup.ts가 next.config를 비춰 둔다. */
const hrefOf = (el: Element) => el.getAttribute('href');

const post = (over: Partial<PostSummary> = {}): PostSummary => ({
  slug: 'card-post',
  originalSlug: 'card-post',
  relativeDir: 'notes',
  title: '카드 제목',
  excerpt: '카드 발췌',
  date: '2025-06-08',
  readMin: 7,
  tags: ['alpha', 'beta', 'gamma', 'delta'],
  status: 'published',
  ...over,
});

const imgOf = (container: HTMLElement) => {
  const img = container.querySelector('img');
  if (!img) throw new Error('커버 이미지가 없다');
  return img;
};

describe('PostCard', () => {
  test('카드의 링크는 제목 하나이고 이름에 제목이 한 번만 들어간다', () => {
    // 커버에도 링크를 걸면(목업) 탭 정지점이 둘, 같은 곳 링크를 스크린리더가 두 번 읽는다.
    const { container } = render(<PostCard post={post()} variant="default" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAccessibleName('카드 제목');
    expect(hrefOf(link)).toBe('/posts/card-post/');
    // 커버는 장식 — 이미지 역할로 노출되지 않는다.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(imgOf(container)).toHaveAttribute('alt', '');
  });

  test('제목은 h3다 — 홈은 h1(이름) → h2(섹션) → h3(카드)', () => {
    render(<PostCard post={post()} variant="showcase" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      '카드 제목',
    );
  });

  test('쇼케이스 메타는 날짜 → 읽기 시간 → 앞 태그 셋 순서다', () => {
    const { container } = render(<PostCard post={post()} variant="showcase" />);
    const meta = container.querySelector('time')?.parentElement;
    if (!meta) throw new Error('메타 줄이 없다');
    expect(
      [...meta.children]
        .filter(el => el.getAttribute('aria-hidden') !== 'true')
        .map(el => el.textContent),
    ).toEqual(['2025-06-08', '7분', 'alpha · beta · gamma']);
  });

  test('작은 카드 메타에는 태그가 없다', () => {
    render(<PostCard post={post()} variant="default" />);
    expect(screen.queryByText(/alpha/)).not.toBeInTheDocument();
    expect(screen.getByText('7분')).toBeInTheDocument();
  });

  test('priority면 커버를 바로, 높은 우선순위로 받는다', () => {
    const { container } = render(
      <PostCard post={post()} variant="showcase" priority />,
    );
    expect(imgOf(container)).toHaveAttribute('loading', 'eager');
    expect(imgOf(container)).toHaveAttribute('fetchpriority', 'high');
  });

  test('priority가 아니면 지연 로드한다', () => {
    const { container } = render(<PostCard post={post()} variant="default" />);
    expect(imgOf(container)).toHaveAttribute('loading', 'lazy');
    expect(imgOf(container)).toHaveAttribute('fetchpriority', 'auto');
  });

  test('커버 이미지는 비율 힌트(16:9) 크기를 단다', () => {
    const { container } = render(<PostCard post={post()} variant="default" />);
    const img = imgOf(container);
    expect(Number(img.getAttribute('width')) * 9).toBe(
      Number(img.getAttribute('height')) * 16,
    );
  });

  test('원고 썸네일은 빌드가 만든 webp를 쓴다', () => {
    const { container } = render(
      <PostCard post={post({ thumbnail: 'cover.png' })} variant="default" />,
    );
    expect(imgOf(container)).toHaveAttribute('src', '/thumbs/notes/cover.webp');
  });

  test('썸네일이 없는 글은 생성 OG 카드로 떨어진다', () => {
    const { container } = render(<PostCard post={post()} variant="default" />);
    expect(imgOf(container)).toHaveAttribute('src', '/og/card-post.png');
  });

  test('발췌가 없으면 문단을 그리지 않는다', () => {
    const { container } = render(
      <PostCard post={post({ excerpt: undefined })} variant="default" />,
    );
    expect(container.querySelector('p')).toBeNull();
  });

  test('날짜가 없으면 메타에서 그 칸과 구분선이 빠진다', () => {
    const { container } = render(
      <PostCard post={post({ date: null })} variant="default" />,
    );
    expect(container.querySelector('time')).toBeNull();
    const article = screen.getByRole('article');
    expect(within(article).getByText('7분').previousElementSibling).toBeNull();
  });

  // 회귀: next/link는 trailingSlash: true에서도 마지막 세그먼트에 `.`이 있으면
  // 파일로 보고 후행 슬래시를 벗긴다. 실제로 `/posts/turborepo-next.js-docker`가
  // 아카이브·시리즈·이웃 글 내비 3곳에 슬래시 없이 나가 클릭마다 301을 한 번 더
  // 탔다. next.config의 skipTrailingSlashRedirect가 그 정규화를 끄며, 이 테스트는
  // 그 설정을 빼면 다시 빨개진다(홈 목록 행 PostIndexRow의 테스트에서 옮겨 왔다).
  test('slug에 `.`이 있어도 후행 슬래시가 살아남는다 (turborepo-next.js-docker 회귀)', () => {
    render(
      <PostCard
        post={post({ slug: 'turborepo-next.js-docker' })}
        variant="default"
      />,
    );
    expect(hrefOf(screen.getByRole('link'))).toBe(
      '/posts/turborepo-next.js-docker/',
    );
  });

  test('slug에 한글이 있으면 인코딩해서 링크한다', () => {
    render(
      <PostCard post={post({ slug: '번들러-만들기' })} variant="default" />,
    );
    expect(hrefOf(screen.getByRole('link'))).toBe(
      `/posts/${encodeURIComponent('번들러-만들기')}/`,
    );
  });
});
