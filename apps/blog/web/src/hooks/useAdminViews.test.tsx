/**
 * admin 대시보드 데이터 병합 — 인덱스(글) × 누적 조회수 × 일별 추이.
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { describe, expect, test, vi } from 'vitest';
import { Suspense, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getAdminPostsIndex, getPostsOverview } = vi.hoisted(() => ({
  getAdminPostsIndex: vi.fn(() =>
    Promise.resolve(
      ['a', 'b', 'c'].map(slug => ({
        slug,
        title: slug.toUpperCase(),
        date: '2026-04-01',
        tags: ['x'],
        status: 'published',
        scheduledDate: null,
      })),
    ),
  ),
  getPostsOverview: vi.fn((slugs: readonly string[]) =>
    Promise.resolve({
      stats: slugs.map(slug => ({ slug, total_views: 10, today_views: 1 })),
      // (slug, 날짜)당 한 행, slug·날짜 순 — 'c'는 기록이 없다.
      trends: [
        { slug: 'a', view_date: '2026-05-01', view_count: 3 },
        { slug: 'a', view_date: '2026-05-02', view_count: 2 },
        { slug: 'b', view_date: '2026-05-01', view_count: 7 },
      ],
    }),
  ),
}));

vi.mock('@/src/domain/analytics/admin', () => ({
  getAdminPostsIndex,
  getPostsOverview,
}));

import { useAdminTagDistribution } from './useAdminTagDistribution';
import { setAdminQueryDefaults } from './adminQueryDefaults';
import { useAdminDashboardData } from './useAdminViews';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>{children}</Suspense>
    </QueryClientProvider>
  );
}

describe('useAdminDashboardData', () => {
  test('조회수 읽기는 인덱스의 slug로 서버에서 거르게 요청한다', async () => {
    const { result } = renderHook(() => useAdminDashboardData(), { wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(getPostsOverview).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  test('글마다 자기 추이만 받고, 기록이 없는 글은 빈 추이다', async () => {
    const { result } = renderHook(() => useAdminDashboardData(), { wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.data.map(post => post.trends)).toStrictEqual([
      [
        { view_date: '2026-05-01', view_count: 3 },
        { view_date: '2026-05-02', view_count: 2 },
      ],
      [{ view_date: '2026-05-01', view_count: 7 }],
      [],
    ]);
  });

  // 인덱스는 배포 때만 바뀐다 — 마운트마다 받으면 조회수 읽기가 매번 그 왕복을 기다린다.
  // 조회수(통계·추이)는 Edge Function 요청 하나(`posts_overview`)이고, 30초 안의 재마운트는 다시 받지 않는다.
  test('인덱스·조회수는 구독이 나눠 쓰는 한 번의 요청이고, 다시 마운트해도 다시 받지 않는다', async () => {
    getAdminPostsIndex.mockClear();
    getPostsOverview.mockClear();
    const client = new QueryClient();
    setAdminQueryDefaults(client);
    const shared = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>{children}</Suspense>
      </QueryClientProvider>
    );
    const useBoth = () => [useAdminDashboardData(), useAdminTagDistribution()];

    const first = renderHook(useBoth, { wrapper: shared });
    await waitFor(() => expect(first.result.current).not.toBeNull());
    first.unmount();
    const again = renderHook(useBoth, { wrapper: shared });
    await waitFor(() => expect(again.result.current).not.toBeNull());

    expect(getPostsOverview).toHaveBeenCalledOnce();
    expect(getAdminPostsIndex).toHaveBeenCalledOnce();
  });

  test('같은 화면에서 구독이 둘 붙어도 조회수 요청은 하나다', async () => {
    getPostsOverview.mockClear();
    const client = new QueryClient();
    setAdminQueryDefaults(client);
    const shared = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <Suspense fallback={null}>{children}</Suspense>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => [useAdminDashboardData(), useAdminDashboardData()],
      { wrapper: shared },
    );
    await waitFor(() => expect(result.current).not.toBeNull());

    expect(getPostsOverview).toHaveBeenCalledOnce();
  });
});
