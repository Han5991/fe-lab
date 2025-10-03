import { useSuspenseQueries } from '@tanstack/react-query';
import {
  getDashboardStats,
  getChartData,
  getActivities,
} from '../api/dashboard';

export const useDashboardData = () => {
  return useSuspenseQueries({
    queries: [
      {
        queryKey: ['dashboardStats'],
        queryFn: getDashboardStats,
      },
      {
        queryKey: ['chartData'],
        queryFn: getChartData,
      },
      {
        queryKey: ['activities'],
        queryFn: getActivities,
      },
    ],
  });
};
