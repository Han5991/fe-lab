/**
 * 인기 글 레일 — 조회수 순위만 "인기"라고 부른다.
 *
 * 조회수는 네트워크 너머(post_views)라 도메인 배럴의 getTopPosts를 가짜로
 * 바꾼다(useViewCount.test.ts와 같은 이음매).
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PostSummary } from '@blog/content';

const { getTopPosts } = vi.hoisted(() => ({
  getTopPosts:
    vi.fn<
      (
        limit: number,
        slugs: readonly string[],
      ) => Promise<{ slug: string; view_count: number }[]>
    >(),
}));
vi.mock('@/src/domain/analytics', () => ({ getTopPosts }));

import { PopularRail } from './PopularRail';

const post = (slug: string, title: string): PostSummary => ({
  slug,
  originalSlug: slug,
  relativeDir: '',
  title,
  date: '2026-01-01',
  readMin: 3,
  status: 'published',
});

// 최신순(목록 순서) — 레일이 이 순서를 "인기"로 흘려보내면 안 된다.
const POSTS = [
  post('newest', '가장 최근 글'),
  post('middle', '중간 글'),
  post('oldest', '가장 오래된 글'),
];

function renderRail(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retryDelay: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  getTopPosts.mockReset();
});

describe('PopularRail', () => {
  test('조회수 순위를 그리고, 순위는 이 목록의 slug 안에서만 요청한다', async () => {
    getTopPosts.mockResolvedValue([
      { slug: 'oldest', view_count: 120 },
      { slug: 'newest', view_count: 3 },
    ]);

    renderRail(<PopularRail posts={POSTS} />);

    const links = await screen.findAllByRole('link');
    expect(links.map(l => l.textContent)).toStrictEqual([
      '01가장 오래된 글120 reads',
      '02가장 최근 글3 reads',
    ]);
    expect(getTopPosts).toHaveBeenCalledWith(5, ['newest', 'middle', 'oldest']);
  });

  test('조회수가 오기 전에는 최신 글을 인기 글처럼 그리지 않는다', () => {
    // 끝나지 않는 요청 — 응답 전 상태에 머문다.
    getTopPosts.mockReturnValue(new Promise(() => undefined));

    renderRail(<PopularRail posts={POSTS} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByText('가장 최근 글')).not.toBeInTheDocument();
  });

  // 다른 목록(최신 글)으로 채워 인기 글이라고 부르지 않는다.
  test.each([
    [
      '조회에 실패하면',
      () => getTopPosts.mockRejectedValue(new Error('network')),
    ],
    [
      '순위를 매길 조회수가 없으면',
      () => getTopPosts.mockResolvedValue([{ slug: 'middle', view_count: 0 }]),
    ],
  ])('%s 섹션을 통째로 뺀다', async (_when, arrange) => {
    arrange();

    const { container } = renderRail(<PopularRail posts={POSTS} />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  // 라벨은 순위의 실제 기간(누적 조회수)을 말한다 — 쿼리에는 기간 창이 없다.
  test('레일은 "누적" 이름이 붙은 섹션이고 헤딩은 h2 → 글 제목 h3이다', async () => {
    getTopPosts.mockResolvedValue([{ slug: 'oldest', view_count: 120 }]);

    renderRail(<PopularRail posts={POSTS} />);

    // aside가 아니다 — 글 목록의 사이드바 aside 안에 들어간다.
    expect(
      await screen.findByRole('region', { name: 'Popular · 누적' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Popular · 누적' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: '가장 오래된 글' }),
    ).toBeInTheDocument();
  });
});
