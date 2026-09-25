/**
 * 글 상세 통계 — 대시보드 목록에 없는 글은 흰 화면이 아니라 안내다.
 *
 * 예전 훅은 글을 못 찾으면 렌더 중에 `throw new Error('Post not found')`를
 * 던졌다. 대시보드 데이터는 Edge Function 너머라 admin 배럴을 가짜로 바꾼다
 * (네트워크 이음매 — 저장소가 import 시점에 supabase 클라이언트를 만든다).
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: ['series', 'missing-post'] }),
}));
const { getAdminPostsIndex, getPostHourlyDistribution } = vi.hoisted(() => ({
  getAdminPostsIndex: vi.fn(() =>
    Promise.resolve([
      {
        slug: 'another-post',
        title: '다른 글',
        date: '2026-01-01',
        tags: [],
        status: 'published',
        scheduledDate: null,
      },
    ]),
  ),
  getPostHourlyDistribution: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/src/domain/analytics/admin', () => ({
  getAdminPostsIndex,
  getAllPostStats: () => Promise.resolve([]),
  getAllPostsTrends: () => Promise.resolve([]),
  getPostHourlyDistribution,
  getPostDowDistribution: () => Promise.resolve([]),
}));

import PostDetailClient from './PostDetailClient';

describe('PostDetailClient', () => {
  test('목록에 없는 글은 찾을 수 없다고 안내하고 목록으로 돌려보낸다', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostDetailClient />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: '이 글의 통계를 찾을 수 없습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('series/missing-post')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '조회수 분석 목록으로' }),
    ).toHaveAttribute('href', '/admin/analytics/');
  });

  // 분포는 slug만 있으면 된다 — 대시보드 데이터를 기다린 뒤에야 요청하면 상세
  // 화면이 왕복 둘을 차례로 기다린다.
  test('분포 요청은 대시보드 데이터를 기다리지 않고 함께 시작한다', () => {
    getAdminPostsIndex.mockReturnValueOnce(new Promise(() => undefined));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PostDetailClient />
      </QueryClientProvider>,
    );

    expect(getPostHourlyDistribution).toHaveBeenCalledWith(
      'series/missing-post',
    );
  });
});
