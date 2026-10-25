/**
 * admin 대시보드 — 글 수는 지금 공개 중인 글로 세고, 목록 제목은 그 글의 admin 통계로 연다.
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as Overview from '@/src/domain/analytics/overview';
import type * as Service from '@/src/domain/analytics/service';

vi.mock('@/src/domain/analytics/admin', async () => {
  const overview = await vi.importActual<typeof Overview>(
    '@/src/domain/analytics/overview',
  );
  const { AnalyticsService } = await vi.importActual<typeof Service>(
    '@/src/domain/analytics/service',
  );
  const row = (slug: string, status: string, date: string) => ({
    slug,
    title: `${slug} 제목`,
    date,
    tags: ['react'],
    status,
    scheduledDate: null,
  });
  return {
    countLivePosts: overview.countLivePosts,
    UNIQUES_ESTIMATE_RATIO: overview.UNIQUES_ESTIMATE_RATIO,
    analyticsService: new AnalyticsService(),
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

// 일별 시계열은 Recharts ResponsiveContainer라 크기를 ResizeObserver로 잰다 — jsdom에는 없다.
vi.stubGlobal(
  'ResizeObserver',
  class {
    // 크기 변화를 검사하지 않는다 — 관측은 기록만 받는다.
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);

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

  test('목록 제목은 그 글의 admin 통계로 열고, 실제 글은 공개 글만 새 탭 아이콘으로 연다', async () => {
    await renderPage();

    // 누적 인기·기간 인기 두 표에 같은 글이 함께 나온다.
    for (const slug of ['live-post', 'draft-post', 'future-post']) {
      const links = screen.getAllByRole('link', { name: `${slug} 제목` });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute('href', `/admin/analytics/${slug}/`);
        expect(link).not.toHaveAttribute('target');
      }
    }

    // 정적 export는 비공개 글의 페이지를 만들지 않는다 — 공개 URL은 404다.
    const [liveLink] = screen.getAllByRole('link', {
      name: 'live-post 제목 글을 새 탭에서 열기',
    });
    expect(liveLink).toHaveAttribute('href', '/posts/live-post/');
    expect(liveLink).toHaveAttribute('target', '_blank');
    expect(liveLink).toHaveAttribute('rel', 'noopener noreferrer');
    for (const hidden of ['draft-post', 'future-post']) {
      expect(
        screen.queryAllByRole('link', {
          name: `${hidden} 제목 글을 새 탭에서 열기`,
        }),
      ).toHaveLength(0);
    }
  });

  test('공개 중이 아닌 글은 제목 옆에 상태를 단다', async () => {
    await renderPage();

    const rowOf = (name: string) =>
      screen.getAllByRole('link', { name })[0]?.closest('tr');
    expect(rowOf('draft-post 제목')).toHaveTextContent('비공개');
    expect(rowOf('future-post 제목')).toHaveTextContent('예약');
    expect(rowOf('live-post 제목')).not.toHaveTextContent('공개');
  });

  // 기간 요약 줄에는 글의 공개 여부가 없다 — 표가 글 데이터로 링크를 정하지 않으면 비공개 글에도 404
  // 링크가 붙는다.
  test('기간 인기 글도 실제 글은 공개 글만 새 탭 아이콘으로 연다', async () => {
    await renderPage();
    const card = screen
      .getByRole('heading', { name: '기간 인기 글 · 30일' })
      .closest('section');
    if (card === null) throw new Error('기간 인기 글 카드가 없다');

    expect(
      within(card).getByRole('link', {
        name: 'live-post 제목 글을 새 탭에서 열기',
      }),
    ).toHaveAttribute('href', '/posts/live-post/');
    expect(
      within(card).queryAllByRole('link', {
        name: /^(draft|future)-post 제목 글을 새 탭에서 열기$/,
      }),
    ).toHaveLength(0);
  });

  test('태그는 카드 한 장이 아니라 공개 게시글 수 카드 아래 한 줄(주요 태그)이다', async () => {
    await renderPage();

    expect(screen.getByText('주요 태그 #react 3')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '태그 분포' }),
    ).not.toBeInTheDocument();
  });

  test('글 목록 표는 대시보드에 없고(분석 화면이 맡는다) 새로고침은 머리에 있다', async () => {
    await renderPage();

    expect(
      screen.queryByRole('heading', { name: '모든 글' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('table', { name: '글 목록' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '새로고침' }),
    ).toBeInTheDocument();
  });

  test('집계 기간을 바꾸면 기간 지표가 그 기간으로 다시 계산된다', async () => {
    await renderPage();
    const periods = screen.getByRole('radiogroup', { name: '집계 기간' });

    expect(within(periods).getByRole('radio', { name: '30일' })).toBeChecked();
    expect(
      screen.getByRole('heading', { name: '조회수 · 30일' }),
    ).toBeInTheDocument();

    fireEvent.click(within(periods).getByRole('radio', { name: '7일' }));

    expect(within(periods).getByRole('radio', { name: '7일' })).toBeChecked();
    expect(
      screen.getByRole('heading', { name: '조회수 · 7일' }),
    ).toBeInTheDocument();
  });
});
