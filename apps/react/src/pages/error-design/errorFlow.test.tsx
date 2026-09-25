import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { ErrorBoundary } from '@/components';
import ErrorDesignPage from './index';

let statsRequests = 0;

const server = setupServer(
  http.get('*/api/dashboard/stats', () => {
    statsRequests += 1;
    if (statsRequests === 1) {
      return HttpResponse.json(
        {
          error: 'STATS_ERROR',
          message: '통계 데이터를 불러오는데 실패했습니다',
        },
        { status: 500 },
      );
    }
    return HttpResponse.json({
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    });
  }),
  http.get('*/api/dashboard/chart', () =>
    HttpResponse.json({ labels: ['월'], data: [100] }),
  ),
  http.get('*/api/dashboard/activities', () => HttpResponse.json([])),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

test('API 500은 해당 섹션에서만 잡히고, 다시 시도하면 그 쿼리를 다시 실행해 복구한다', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ErrorDesignPage />
      </QueryClientProvider>
    </ErrorBoundary>,
  );

  expect(await screen.findByText('❌ 통계 에러')).toBeInTheDocument();
  expect(
    screen.getByText('통계 데이터를 불러오는데 실패했습니다'),
  ).toBeInTheDocument();
  expect(screen.getByText('에러 코드: STATS_ERROR')).toBeInTheDocument();
  expect(screen.getByText('에러 타입: StatsError')).toBeInTheDocument();
  expect(await screen.findByText('주간 트래픽')).toBeInTheDocument();

  fireEvent.click(screen.getByText('다시 시도'));

  expect(await screen.findByText('1,000')).toBeInTheDocument();
  expect(screen.queryByText('❌ 통계 에러')).not.toBeInTheDocument();
  expect(statsRequests).toBe(2);
});
