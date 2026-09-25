/**
 * 글 상세 분포 조회의 실패는 빈 차트가 아니라 에러다.
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PostStatDetail } from '@/src/domain/analytics';

vi.mock('@/src/domain/analytics/admin', () => ({
  analyticsService: {
    computeDerivedStats: () => ({
      weekGrowthRate: null,
      peakDay: null,
      dailyAverage: 0,
      milestones: [],
    }),
  },
  getPostHourlyDistribution: () =>
    Promise.reject(new Error('admin-analytics Edge Function 오류 (500)')),
  getPostDowDistribution: () => Promise.resolve([]),
}));

import { usePostDetailStats } from './usePostDetailStats';

const POST: PostStatDetail = {
  slug: 'my-post',
  title: '내 글',
  date: '2026-01-01',
  totalViews: 10,
  todayViews: 0,
  trends: [],
  status: 'published',
  scheduledDate: null,
};

class Boundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  override state: { message: string | null } = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override render() {
    return this.state.message === null ? (
      this.props.children
    ) : (
      <p role="alert">{this.state.message}</p>
    );
  }
}

function HourlyTotal() {
  const { hourly } = usePostDetailStats(POST);
  return <p>시간대 행 {hourly.length}개</p>;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePostDetailStats', () => {
  test('분포 조회 실패를 빈 분포로 삼키지 않고 에러 경계로 올린다', async () => {
    render(
      <QueryClientProvider
        // 재시도가 끼면 실패가 늦게 드러난다.
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <Boundary>
          <Suspense fallback={<p>불러오는 중</p>}>
            <HourlyTotal />
          </Suspense>
        </Boundary>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'admin-analytics Edge Function 오류 (500)',
    );
    expect(screen.queryByText(/시간대 행/)).not.toBeInTheDocument();
  });
});
