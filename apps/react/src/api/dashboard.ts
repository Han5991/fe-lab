import { instance } from '@/shared';

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
  const response = await instance.get('/api/dashboard/stats');
  return response.data;
};

export const getChartData = async (): Promise<ChartData> => {
  const response = await instance.get('/api/dashboard/chart');
  return response.data;
};

export const getActivities = async (): Promise<Activity[]> => {
  const response = await instance.get('/api/dashboard/activities');
  return response.data;
};
