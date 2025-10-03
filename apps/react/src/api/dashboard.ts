import { ActivityError, ChartError, instance, StatsError } from '@/shared';
import { isHttpError } from '@package/core';

export interface DashboardStats {
  visitors: {
    total: number;
    change: number;
  };
  signups: {
    total: number;
    change: number;
  };
  revenue: {
    total: number;
    change: number;
  };
  conversion: {
    rate: number;
    change: number;
  };
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface Activity {
  id: string;
  type: 'signup' | 'payment' | 'inquiry';
  message: string;
  timestamp: Date;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await instance.get('/api/dashboard/stats');
    return response.data;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      throw new StatsError(
        error.response?.data?.message ||
          '통계 데이터를 불러오는데 실패했습니다',
        error.response?.data?.error,
      );
    }
    throw error;
  }
};

export const getChartData = async (): Promise<ChartData> => {
  try {
    const response = await instance.get('/api/dashboard/chart');
    return response.data;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      throw new ChartError(
        error.response?.data?.message ||
          '차트 데이터를 불러오는데 실패했습니다',
        error.response?.data?.error,
      );
    }
    throw error;
  }
};

export const getActivities = async (): Promise<Activity[]> => {
  try {
    // 임시 에러 계층 테스트용 코드 이걸 풀면 더 상위 에러 바운더리로 전파됨
    // throw new Error('test');
    const response = await instance.get('/api/dashboard/activities');
    return response.data;
  } catch (error: unknown) {
    if (isHttpError(error)) {
      throw new ActivityError(
        error.response?.data?.message ||
          '활동 데이터를 불러오는데 실패했습니다',
        error.response?.data?.error,
      );
    }
    throw error;
  }
};
