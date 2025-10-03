import { http, HttpResponse } from 'msw';
import type { DashboardStats, ChartData, Activity } from '../api/dashboard';

// Mock 데이터
const mockStats: DashboardStats = {
  visitors: { total: 12345, change: 12.5 },
  signups: { total: 234, change: 8.2 },
  revenue: { total: 1234567, change: 23.1 },
  conversion: { rate: 3.2, change: -1.4 },
};

const mockChartData: ChartData = {
  labels: ['월', '화', '수', '목', '금', '토', '일'],
  data: [1200, 1900, 3000, 2500, 3500, 2800, 4200],
};

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'signup',
    message: '새 사용자 가입',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: '2',
    type: 'payment',
    message: '결제 완료',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: '3',
    type: 'inquiry',
    message: '문의 접수',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
  },
];

export const handlers = [
  // 대시보드 통계
  http.get('/api/dashboard/stats', async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return HttpResponse.json(mockStats);
  }),

  // 차트 데이터
  http.get('/api/dashboard/chart', async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return HttpResponse.json(mockChartData);
  }),

  // 활동 피드
  http.get('/api/dashboard/activities', async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return HttpResponse.json(mockActivities);
  }),
];
