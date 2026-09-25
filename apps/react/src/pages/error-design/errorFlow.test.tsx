import { render, screen } from '@testing-library/react';
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
afterAll(() => server.close());

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('API의 500 응답은 해당 섹션 바운더리에서만 잡히고 나머지 섹션은 그대로 렌더링된다', async () => {
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

  // 루트 바운더리가 페이지 전체를 갈아엎지 않았다
  expect(await screen.findByText('주간 트래픽')).toBeInTheDocument();
  expect(screen.getByText('대시보드 - 에러 핸들링 예제')).toBeInTheDocument();
});
