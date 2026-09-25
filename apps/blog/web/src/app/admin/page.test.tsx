/**
 * admin 대시보드 개요 — 글 수는 지금 공개 중인 글로 세고, 아직 비공개인 글은
 * 404가 나는 공개 URL 대신 그 글의 admin 통계로 보낸다.
 *
 * 대시보드 데이터·세션은 네트워크 너머라 admin 배럴·auth 배럴·라우터만 가짜로
 * 바꾼다(두 배럴은 import 시점에 supabase 클라이언트를 만든다). 공개 판정
 * (countLivePosts)은 진짜를 쓴다.
 */
import { describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as Overview from '@/src/domain/analytics/overview';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/src/domain/auth', () => ({ authRepository: {} }));
vi.mock('@/src/domain/analytics/admin', async () => {
  const overview = await vi.importActual<typeof Overview>(
    '@/src/domain/analytics/overview',
  );
  const row = (slug: string, status: string, date: string) => ({
    slug,
    title: `${slug} 제목`,
    date,
    tags: [],
    status,
    scheduledDate: null,
  });
  return {
    countLivePosts: overview.countLivePosts,
    getAdminPostsIndex: () =>
      Promise.resolve([
        row('live-post', 'published', '2026-01-01'),
        row('draft-post', 'draft', '2026-02-01'),
        // 먼 미래 날짜라 테스트가 언제 돌아도 공개 전이다.
        row('future-post', 'scheduled', '2999-01-01'),
      ]),
    getAllPostStats: (slugs: readonly string[]) =>
      Promise.resolve(
        slugs.map(slug => ({ slug, total_views: 5, today_views: 0 })),
      ),
    getAllPostsTrends: () => Promise.resolve([]),
  };
});

import AdminPage from './page';

async function renderPage() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    </QueryClientProvider>,
  );
  await screen.findByText('공개 게시글 수');
}

describe('AdminPage', () => {
  test('글 수는 지금 공개 중인 글만 세고, 나머지는 따로 알린다', async () => {
    await renderPage();

    expect(screen.getByText('· 비공개·예약 2개')).toBeInTheDocument();
  });

  test('비공개 글 줄은 공개 URL(404)이 아니라 그 글의 admin 통계로 연다', async () => {
    await renderPage();

    const [draftLink] = screen.getAllByRole('link', {
      name: /draft-post 제목/,
    });
    expect(draftLink).toHaveAttribute('href', '/admin/analytics/draft-post/');
    expect(draftLink).not.toHaveAttribute('target');
    expect(draftLink).toHaveTextContent('비공개');

    const [futureLink] = screen.getAllByRole('link', {
      name: /future-post 제목/,
    });
    expect(futureLink).toHaveAttribute('href', '/admin/analytics/future-post/');
    expect(futureLink).toHaveTextContent('예약');

    const [liveLink] = screen.getAllByRole('link', { name: /live-post 제목/ });
    expect(liveLink).toHaveAttribute('href', '/posts/live-post/');
    expect(liveLink).toHaveAttribute('target', '_blank');
  });
});
