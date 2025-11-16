import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getDashboardStats, getChartData, getActivities } from './dashboard';
import { StatsError, ChartError, ActivityError, instance } from '@/shared';
import { HttpStatusCode } from '@package/core';

vi.mock('@/shared', async () => {
  const actual = await vi.importActual('@/shared');
  return {
    ...actual,
    instance: {
      get: vi.fn(),
    },
  };
});

describe('getDashboardStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('통계 데이터를 성공적으로 가져온다', async () => {
    const mockData = {
      visitors: { total: 1000, change: 5 },
      signups: { total: 100, change: 10 },
      revenue: { total: 50000, change: -2 },
      conversion: { rate: 10, change: 3 },
    };

    vi.mocked(instance.get).mockResolvedValue({
      data: mockData,
      status: HttpStatusCode.Continue,
      headers: new Headers(),
    });

    const result = await getDashboardStats();

    expect(result).toEqual(mockData);
    expect(instance.get).toHaveBeenCalledWith('/api/dashboard/stats');
  });

  test('HTTP 에러 발생 시 StatsError를 던진다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: '통계 데이터 조회 실패',
          error: 'STATS_ERROR',
        },
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getDashboardStats()).rejects.toThrow(StatsError);
    await expect(getDashboardStats()).rejects.toThrow('통계 데이터 조회 실패');
  });

  test('HTTP 에러에 메시지가 없으면 기본 메시지를 사용한다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getDashboardStats()).rejects.toThrow(
      '통계 데이터를 불러오는데 실패했습니다',
    );
  });

  test('HTTP 에러가 아닌 경우 원래 에러를 던진다', async () => {
    const normalError = new Error('일반 에러');

    vi.mocked(instance.get).mockRejectedValue(normalError);

    await expect(getDashboardStats()).rejects.toThrow('일반 에러');
  });
});

describe('getChartData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('차트 데이터를 성공적으로 가져온다', async () => {
    const mockData = {
      labels: ['월', '화', '수', '목', '금'],
      data: [100, 200, 150, 300, 250],
    };

    vi.mocked(instance.get).mockResolvedValue({
      data: mockData,
      status: HttpStatusCode.Continue,
      headers: new Headers(),
    });

    const result = await getChartData();

    expect(result).toEqual(mockData);
    expect(instance.get).toHaveBeenCalledWith('/api/dashboard/chart');
  });

  test('HTTP 에러 발생 시 ChartError를 던진다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: '차트 데이터 조회 실패',
          error: 'CHART_ERROR',
        },
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getChartData()).rejects.toThrow(ChartError);
    await expect(getChartData()).rejects.toThrow('차트 데이터 조회 실패');
  });

  test('HTTP 에러에 메시지가 없으면 기본 메시지를 사용한다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getChartData()).rejects.toThrow(
      '차트 데이터를 불러오는데 실패했습니다',
    );
  });

  test('HTTP 에러가 아닌 경우 원래 에러를 던진다', async () => {
    const normalError = new Error('일반 에러');

    vi.mocked(instance.get).mockRejectedValue(normalError);

    await expect(getChartData()).rejects.toThrow('일반 에러');
  });
});

describe('getActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('활동 데이터를 성공적으로 가져온다', async () => {
    const mockData = [
      {
        id: '1',
        type: 'signup',
        message: '새 사용자가 가입했습니다',
        timestamp: new Date('2024-01-01'),
      },
      {
        id: '2',
        type: 'payment',
        message: '결제가 완료되었습니다',
        timestamp: new Date('2024-01-02'),
      },
    ];

    vi.mocked(instance.get).mockResolvedValue({
      data: mockData,
      status: HttpStatusCode.Continue,
      headers: new Headers(),
    });

    const result = await getActivities();

    expect(result).toEqual(mockData);
    expect(instance.get).toHaveBeenCalledWith('/api/dashboard/activities');
  });

  test('HTTP 에러 발생 시 ActivityError를 던진다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          message: '활동 데이터 조회 실패',
          error: 'ACTIVITY_ERROR',
        },
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getActivities()).rejects.toThrow(ActivityError);
    await expect(getActivities()).rejects.toThrow('활동 데이터 조회 실패');
  });

  test('HTTP 에러에 메시지가 없으면 기본 메시지를 사용한다', async () => {
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {},
        status: 500,
      },
    };

    vi.mocked(instance.get).mockRejectedValue(axiosError);

    await expect(getActivities()).rejects.toThrow(
      '활동 데이터를 불러오는데 실패했습니다',
    );
  });

  test('HTTP 에러가 아닌 경우 원래 에러를 던진다', async () => {
    const normalError = new Error('일반 에러');

    vi.mocked(instance.get).mockRejectedValue(normalError);

    await expect(getActivities()).rejects.toThrow('일반 에러');
  });
});
