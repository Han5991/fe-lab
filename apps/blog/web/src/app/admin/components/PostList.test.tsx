/**
 * admin 글 목록 — 실패한 새로고침을 "방금 갱신됨"으로 보이지 않는다.
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getAllPostStats } = vi.hoisted(() => ({
  getAllPostStats:
    vi.fn<
      () => Promise<
        { slug: string; total_views: number; today_views: number }[]
      >
    >(),
}));

vi.mock('@/src/domain/analytics/admin', () => ({
  getAdminPostsIndex: () =>
    Promise.resolve([
      {
        slug: 'a',
        title: '글 A',
        date: '2026-04-01',
        tags: [],
        status: 'published',
        scheduledDate: null,
      },
    ]),
  getAllPostStats,
  getAllPostsTrends: () => Promise.resolve([]),
  analyticsService: {
    computeDerivedStats: () => ({
      weekGrowthRate: null,
      peakDay: null,
      dailyAverage: 0,
      milestones: [],
    }),
  },
}));

import { PostList } from './PostList';

afterEach(() => {
  vi.useRealTimers();
});

describe('PostList', () => {
  test('새로고침이 실패하면 실패를 알리고 업데이트 시각을 바꾸지 않는다', async () => {
    getAllPostStats.mockResolvedValue([
      { slug: 'a', total_views: 7, today_views: 0 },
    ]);
    render(
      <QueryClientProvider
        // 재시도가 끼면 실패가 늦게 드러난다.
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Suspense fallback={null}>
          <PostList />
        </Suspense>
      </QueryClientProvider>,
    );

    // 마운트 직후의 재요청(refetchOnMount: 'always')까지 끝나길 기다린다.
    const refresh = await screen.findByRole('button', { name: '새로고침' });
    await waitFor(() => expect(refresh).toBeEnabled());
    const before = screen.getByText(/^업데이트:/).textContent;

    // 시계(Date)만 한 시간 옮긴다 — "지금"을 업데이트 시각으로 적는 구현이면 표시가 바뀐다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    getAllPostStats.mockRejectedValueOnce(new Error('Edge Function 500'));
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '새로고침 실패',
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/^업데이트:/).textContent).toBe(before);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled(),
    );
  });
});
