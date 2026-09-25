/**
 * admin 대시보드 데이터 병합 — 인덱스(글) × 누적 조회수 × 일별 추이.
 *
 * 조회수 두 읽기는 Edge Function 너머라 admin 배럴을 가짜로 바꾼다(저장소가
 * import 시점에 supabase 클라이언트를 만든다).
 */
import { describe, expect, test, vi } from 'vitest';
import { Suspense, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { getAdminPostsIndex, getAllPostStats, getAllPostsTrends } = vi.hoisted(
  () => ({
    getAdminPostsIndex: vi.fn(() =>
      Promise.resolve([
        {
          slug: 'a',
          title: 'A',
          date: '2026-04-01',
          tags: ['x'],
          status: 'published',
          scheduledDate: null,
        },
      ]),
    ),
    getAllPostStats: vi.fn((slugs: readonly string[]) =>
      Promise.resolve(
        slugs.map(slug => ({ slug, total_views: 10, today_views: 1 })),
      ),
    ),
    getAllPostsTrends: vi.fn((_slugs: readonly string[]) =>
      Promise.resolve([
        { slug: 'a', view_date: '2026-05-01', view_count: 3 },
        // 페이지 경계에서 밀려 한 번 더 온 행 — 그 사이 조회가 늘었다.
        { slug: 'a', view_date: '2026-05-01', view_count: 4 },
        { slug: 'a', view_date: '2026-05-02', view_count: 2 },
      ]),
    ),
  }),
);

vi.mock('@/src/domain/analytics/admin', () => ({
  getAdminPostsIndex,
  getAllPostStats,
  getAllPostsTrends,
}));

import { useAdminTagDistribution } from '@/src/app/admin/analytics/useAdminTagDistribution';
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
    expect(getAllPostStats).toHaveBeenCalledWith(['a']);
    expect(getAllPostsTrends).toHaveBeenCalledWith(['a']);
  });

  test('같은 (slug, 날짜) 행이 두 번 와도 그날을 한 번만 싣는다 — 나중 값으로', async () => {
    const { result } = renderHook(() => useAdminDashboardData(), { wrapper });

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.data[0]?.trends).toStrictEqual([
      { view_date: '2026-05-01', view_count: 4 },
      { view_date: '2026-05-02', view_count: 2 },
    ]);
  });

  // 인덱스는 배포 때만 바뀐다 — 마운트마다 받으면 조회수 읽기가 매번 그 왕복을
  // 기다리고, 태그 분포와 같은 화면에서 파일을 두 번 받는다.
  test('인덱스는 대시보드·태그 분포가 한 번 받아 나눠 쓰고, 다시 마운트해도 다시 받지 않는다', async () => {
    getAdminPostsIndex.mockClear();
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

    expect(getAllPostStats.mock.calls.length).toBeGreaterThan(1);
    expect(getAdminPostsIndex).toHaveBeenCalledOnce();
  });
});
