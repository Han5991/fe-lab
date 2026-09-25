import { Suspense } from 'react';
import { renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { ErrorBoundary } from '@/components';
import { useDashboardStats, useChartData, useActivities } from './useDashboard';
import * as dashboardApi from '@/api/dashboard';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([
  ['getDashboardStats', useDashboardStats],
  ['getChartData', useChartData],
  ['getActivities', useActivities],
] as const)(
  '%s가 실패하면 에러가 에러 바운더리까지 올라간다',
  async (api, useHook) => {
    vi.spyOn(dashboardApi, api).mockRejectedValue(new Error(`${api} 실패`));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    renderHook(() => useHook(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <Suspense fallback={<p>로딩</p>}>{children}</Suspense>
          </ErrorBoundary>
        </QueryClientProvider>
      ),
    });

    expect(
      await screen.findByRole('heading', { name: `${api} 실패` }),
    ).toBeInTheDocument();
  },
);

describe('useDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('대시보드 통계 데이터를 성공적으로 가져온다', async () => {
    const mockStats = {
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    };

    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue(mockStats);

    const { result } = renderHook(() => useDashboardStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockStats);
    });

    expect(dashboardApi.getDashboardStats).toHaveBeenCalledTimes(1);
  });
});

describe('useChartData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('차트 데이터를 성공적으로 가져온다', async () => {
    const mockChartData = {
      labels: ['월', '화', '수', '목', '금'],
      data: [100, 200, 150, 300, 250],
    };

    vi.spyOn(dashboardApi, 'getChartData').mockResolvedValue(mockChartData);

    const { result } = renderHook(() => useChartData(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockChartData);
    });

    expect(dashboardApi.getChartData).toHaveBeenCalledTimes(1);
  });
});

describe('useActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('활동 데이터를 성공적으로 가져온다', async () => {
    const mockActivities = [
      {
        id: '1',
        type: 'signup' as const,
        message: '새 사용자가 가입했습니다',
        timestamp: '2024-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        type: 'payment' as const,
        message: '결제가 완료되었습니다',
        timestamp: '2024-01-02T00:00:00.000Z',
      },
    ];

    vi.spyOn(dashboardApi, 'getActivities').mockResolvedValue(mockActivities);

    const { result } = renderHook(() => useActivities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockActivities);
    });

    expect(dashboardApi.getActivities).toHaveBeenCalledTimes(1);
  });
});
