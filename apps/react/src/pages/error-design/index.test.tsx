import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ErrorDesignPage from './index';
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

describe('ErrorDesignPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('페이지 헤더가 렌더링된다', () => {
    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue({
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    });
    vi.spyOn(dashboardApi, 'getChartData').mockResolvedValue({
      labels: ['월', '화', '수'],
      data: [100, 200, 300],
    });
    vi.spyOn(dashboardApi, 'getActivities').mockResolvedValue([
      {
        id: '1',
        type: 'signup',
        message: '새 사용자가 가입했습니다',
        timestamp: new Date(),
      },
    ]);

    render(<ErrorDesignPage />, { wrapper: createWrapper() });

    expect(
      screen.getByText('대시보드 - 에러 핸들링 예제'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('각 섹션은 독립적으로 로딩되고 에러를 처리합니다'),
    ).toBeInTheDocument();
  });

  test('로딩 상태가 표시된다', () => {
    vi.spyOn(dashboardApi, 'getDashboardStats').mockImplementation(
      () => new Promise(() => {}),
    );
    vi.spyOn(dashboardApi, 'getChartData').mockImplementation(
      () => new Promise(() => {}),
    );
    vi.spyOn(dashboardApi, 'getActivities').mockImplementation(
      () => new Promise(() => {}),
    );

    render(<ErrorDesignPage />, { wrapper: createWrapper() });

    expect(screen.getAllByText('통계 로딩...').length).toBeGreaterThan(0);
    expect(screen.getByText('차트 로딩...')).toBeInTheDocument();
    expect(screen.getByText('활동 로딩...')).toBeInTheDocument();
  });

  test('통계 데이터가 성공적으로 렌더링된다', async () => {
    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue({
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    });
    vi.spyOn(dashboardApi, 'getChartData').mockResolvedValue({
      labels: ['월', '화', '수'],
      data: [100, 200, 300],
    });
    vi.spyOn(dashboardApi, 'getActivities').mockResolvedValue([
      {
        id: '1',
        type: 'signup',
        message: '새 사용자가 가입했습니다',
        timestamp: new Date(),
      },
    ]);

    render(<ErrorDesignPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('총 방문자')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('신규 가입')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('+10%')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('매출')).toBeInTheDocument();
      expect(screen.getByText('₩50,000')).toBeInTheDocument();
      expect(screen.getByText('-2%')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('전환율')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('+3%')).toBeInTheDocument();
    });
  });

  test('차트 데이터가 성공적으로 렌더링된다', async () => {
    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue({
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    });
    vi.spyOn(dashboardApi, 'getChartData').mockResolvedValue({
      labels: ['월', '화', '수'],
      data: [100, 200, 300],
    });
    vi.spyOn(dashboardApi, 'getActivities').mockResolvedValue([
      {
        id: '1',
        type: 'signup',
        message: '새 사용자가 가입했습니다',
        timestamp: new Date(),
      },
    ]);

    render(<ErrorDesignPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('주간 트래픽')).toBeInTheDocument();
      expect(screen.getByText('월: 100')).toBeInTheDocument();
      expect(screen.getByText('화: 200')).toBeInTheDocument();
      expect(screen.getByText('수: 300')).toBeInTheDocument();
    });
  });

  test('활동 데이터가 성공적으로 렌더링된다', async () => {
    vi.spyOn(dashboardApi, 'getDashboardStats').mockResolvedValue({
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    });
    vi.spyOn(dashboardApi, 'getChartData').mockResolvedValue({
      labels: ['월', '화', '수'],
      data: [100, 200, 300],
    });
    vi.spyOn(dashboardApi, 'getActivities').mockResolvedValue([
      {
        id: '1',
        type: 'signup',
        message: '새 사용자가 가입했습니다',
        timestamp: new Date(),
      },
      {
        id: '2',
        type: 'payment',
        message: '결제가 완료되었습니다',
        timestamp: new Date(),
      },
    ]);

    render(<ErrorDesignPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('최근 활동')).toBeInTheDocument();
      expect(
        screen.getByText('• 새 사용자가 가입했습니다'),
      ).toBeInTheDocument();
      expect(screen.getByText('• 결제가 완료되었습니다')).toBeInTheDocument();
    });
  });
});
