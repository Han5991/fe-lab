import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { vi } from 'vitest';
import { ErrorBoundary } from '@/components';
import ErrorDesignPage from './index';

// API 함수를 mock하지 않고 실제 Http → isHttpError → 섹션 에러 변환 경로를 태운다.
// 응답 모양은 src/mocks/handlers.ts의 실패 응답과 같다.
const server = setupServer(
  http.get('*/api/dashboard/stats', () =>
    HttpResponse.json(
      {
        error: 'STATS_ERROR',
        message: '통계 데이터를 불러오는데 실패했습니다',
      },
      { status: 500 },
    ),
  ),
  http.get('*/api/dashboard/chart', () =>
    HttpResponse.json({ labels: ['월'], data: [100] }),
  ),
  http.get('*/api/dashboard/activities', () => HttpResponse.json([])),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderPage = () => {
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
};

test('API의 500 응답은 해당 섹션 바운더리에서만 잡히고 나머지 섹션은 그대로 렌더링된다', async () => {
  renderPage();

  expect(await screen.findByText('❌ 통계 에러')).toBeInTheDocument();
  expect(
    screen.getByText('통계 데이터를 불러오는데 실패했습니다'),
  ).toBeInTheDocument();
  expect(screen.getByText('에러 코드: STATS_ERROR')).toBeInTheDocument();
  expect(screen.getByText('에러 타입: StatsError')).toBeInTheDocument();

  // 루트 바운더리가 페이지 전체를 갈아엎지 않았다
  expect(await screen.findByText('주간 트래픽')).toBeInTheDocument();
  expect(screen.getByText('대시보드 - 에러 핸들링 예제')).toBeInTheDocument();
});

test('다시 시도를 누르면 실패한 섹션의 쿼리를 다시 실행해 복구한다', async () => {
  let requests = 0;
  server.use(
    http.get('*/api/dashboard/stats', () => {
      requests += 1;
      if (requests === 1) {
        return HttpResponse.json(
          { error: 'STATS_ERROR', message: '일시적 실패' },
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
  );
  renderPage();

  expect(await screen.findByText('❌ 통계 에러')).toBeInTheDocument();

  fireEvent.click(screen.getByText('다시 시도'));

  expect(await screen.findByText('총 방문자')).toBeInTheDocument();
  expect(screen.getByText('1,000')).toBeInTheDocument();
  expect(screen.queryByText('❌ 통계 에러')).not.toBeInTheDocument();
  expect(requests).toBe(2);
});
