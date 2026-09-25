/**
 * `/posts/`의 **정적 폴백 ↔ 하이드레이션 후 화면 일치 계약.**
 *
 * `PostsArchiveView`는 nuqs 때문에 빌드 타임 프리렌더에서 빠지고, 정적 HTML에는
 * Suspense 폴백(`PostsArchiveFallback`)만 남는다. 예전 폴백은 리스트를, 클라이언트
 * 기본값은 카드 그리드를 그려서 매 첫 방문마다 하이드레이션 직후 목록이 통째로
 * 바뀌었고, 정적 HTML의 헤딩은 h1 → h3로 건너뛰었다. URL 파라미터가 없을 때 둘이
 * 같은 헤딩·같은 링크·같은 이미지를 같은 순서로 그리는지를 여기서 잠근다.
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

// 인기글 레일·인기순 정렬이 Supabase 조회수를 부른다(주입 지점이 없는 모듈 싱글톤).
// 응답 없이 대기시켜 두 화면 모두 "조회수 도착 전" 상태로 비교한다.
vi.mock('@/src/domain/analytics', () => ({
  getTopPosts: () => new Promise(() => undefined),
  getAllViewCounts: () => new Promise(() => undefined),
}));

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

/**
 * 화면이 "같다"의 기준 — 헤딩(레벨·이름), 링크 주소, 썸네일 수를 순서대로.
 * 카드 썸네일은 제목과 겹치지 않게 alt=""(장식)라 img 역할이 없다 — 그래서
 * 썸네일만은 요소로 센다(카드 뷰에만 있고 리스트 뷰에는 없다).
 */
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

    render(
      withQuery(
        <NuqsTestingAdapter>
          <PostsArchiveView {...props} />
        </NuqsTestingAdapter>,
      ),
    );

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

  test('?view=list면 뷰는 리스트로 그린다(폴백은 기본값 그대로)', () => {
    render(
      withQuery(
        <NuqsTestingAdapter searchParams="?view=list">
          <PostsArchiveView {...props} />
        </NuqsTestingAdapter>,
      ),
    );
    const list = fingerprint();
    cleanup();

    render(withQuery(<PostsArchiveFallback {...props} />));
    expect(list.thumbnails).toBe(0);
    expect(fingerprint().thumbnails).toBe(POSTS.length);
  });
});

describe('PostsArchive 검색창', () => {
  // "지우기"는 검색어가 비는 순간 사라진다 — 초점이 <body>로 떨어지던 회귀.
  test('지우기를 누르면 검색어가 비고 초점이 입력창으로 간다', async () => {
    render(
      withQuery(
        <NuqsTestingAdapter searchParams="?q=b-post">
          <PostsArchiveView {...props} />
        </NuqsTestingAdapter>,
      ),
    );
    // 데스크톱 사이드바·모바일 상단에 같은 검색창이 하나씩 있다(CSS로 배타 표시).
    const [input] = screen.getAllByRole('searchbox', { name: '글 검색' });
    const [clear] = screen.getAllByRole('button', { name: '지우기' });

    fireEvent.click(clear);

    expect(input).toHaveFocus();
    await waitFor(() => expect(input).toHaveValue(''));
  });
});
