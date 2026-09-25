/**
 * `/posts/` — 정적 HTML에는 폴백만 남으므로, URL 파라미터가 없을 때 폴백과 뷰가 같은
 * 헤딩·링크·이미지를 같은 순서로 그려야 하이드레이션 뒤 목록이 바뀌지 않는다.
 */
import { describe, expect, test, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactNode } from 'react';
import type { PostSummary, SeriesSummary, TagSummary } from '@blog/content';

// 조회수는 주입 지점 없는 모듈 싱글톤이다 — 기본은 응답 없이 대기시켜 도착 전 상태로 비교한다.
const analytics = vi.hoisted(() => ({
  getTopPosts: vi.fn(
    (_limit: number, _slugs: readonly string[]) =>
      new Promise<never>(() => undefined),
  ),
  getAllViewCounts: vi.fn(
    (_slugs: readonly string[]) =>
      new Promise<{ slug: string; view_count: number }[]>(() => undefined),
  ),
}));
vi.mock('@/src/domain/analytics', () => analytics);

import { PostsArchiveFallback, PostsArchiveView } from './PostsArchive';

const post = (slug: string, date: string, tags: string[]): PostSummary => ({
  slug,
  originalSlug: slug,
  relativeDir: '',
  title: `${slug} 제목`,
  date,
  readMin: 3,
  status: 'published',
  tags,
});

const POSTS = [
  post('b-post', '2026-02-01', ['react']),
  post('a-post', '2026-01-01', ['vitest']),
];
const SERIES: SeriesSummary[] = [];
const TAGS: TagSummary[] = [
  { id: 'react', count: 1 },
  { id: 'vitest', count: 1 },
];
const YEARS = [{ year: '2026', count: 2 }];
const props = { posts: POSTS, series: SERIES, tags: TAGS, years: YEARS };

const withQuery = (ui: ReactNode) => (
  <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>
);

const renderView = (searchParams?: string) =>
  render(
    withQuery(
      <NuqsTestingAdapter
        {...(searchParams === undefined ? {} : { searchParams })}
      >
        <PostsArchiveView {...props} />
      </NuqsTestingAdapter>,
    ),
  );

/** 화면이 "같다"의 기준. 썸네일은 장식(alt="")이라 역할이 없어 요소로 센다. */
const fingerprint = () => ({
  headings: screen
    .getAllByRole('heading')
    .map(h => `${h.tagName}:${h.textContent}`),
  links: screen.getAllByRole('link').map(a => a.getAttribute('href')),
  thumbnails: document.body.querySelectorAll('img').length,
});

describe('PostsArchive 폴백 ↔ 뷰', () => {
  test('URL 파라미터가 없으면 폴백과 뷰가 같은 화면을 그린다', () => {
    render(withQuery(<PostsArchiveFallback {...props} />));
    const fallback = fingerprint();
    cleanup();

    renderView();

    expect(fingerprint()).toEqual(fallback);
  });

  test('폴백은 카드 그리드와 편수 h2를 정적 HTML에 남긴다', () => {
    render(withQuery(<PostsArchiveFallback {...props} />));

    expect(
      screen.getByRole('heading', { level: 2, name: '2편' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'b-post 제목' }),
    ).toBeInTheDocument();
    expect(fingerprint().thumbnails).toBe(POSTS.length);
  });

  test('?view=list면 뷰는 리스트로 그린다', () => {
    renderView('?view=list');

    expect(fingerprint().thumbnails).toBe(0);
  });
});

describe('PostsArchive 인기순', () => {
  test('이 목록의 slug만 서버에 물어 받은 조회수 순으로 그린다', async () => {
    analytics.getAllViewCounts.mockImplementationOnce(() =>
      Promise.resolve([
        { slug: 'a-post', view_count: 10 },
        { slug: 'b-post', view_count: 1 },
      ]),
    );
    renderView('?sort=popular');

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('heading', { level: 3 })
          .map(h => h.textContent)
          .slice(0, 2),
      ).toStrictEqual(['a-post 제목', 'b-post 제목']),
    );
    // 가짜 slug가 응답 상한을 채우지 못하게 서버 쪽에서 거른다.
    expect(analytics.getAllViewCounts).toHaveBeenCalledWith(
      POSTS.map(p => p.slug),
    );
  });
});

describe('PostsArchive 검색창', () => {
  // "지우기"는 검색어가 비는 순간 사라진다 — 초점이 <body>로 떨어지면 안 된다.
  test('지우기를 누르면 검색어가 비고 초점이 입력창으로 간다', async () => {
    renderView('?q=b-post');
    // 데스크톱 사이드바·모바일 상단에 같은 검색창이 하나씩 있다(CSS로 배타 표시).
    const [input] = screen.getAllByRole('searchbox', { name: '글 검색' });
    const [clear] = screen.getAllByRole('button', { name: '지우기' });

    fireEvent.click(clear);

    expect(input).toHaveFocus();
    await waitFor(() => expect(input).toHaveValue(''));
  });
});
