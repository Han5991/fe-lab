import { useSuspenseQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getChartData,
  getActivities,
} from '../api/dashboard';

export const useDashboardStats = () => {
  return useSuspenseQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });
};

export const useChartData = () => {
  return useSuspenseQuery({
    queryKey: ['chartData'],
    queryFn: getChartData,
  });
};

export const useActivities = () => {
  return useSuspenseQuery({
    queryKey: ['activities'],
    queryFn: getActivities,
  });
};
