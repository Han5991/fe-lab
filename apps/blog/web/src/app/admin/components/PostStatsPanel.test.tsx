/**
 * 글 통계 패널 — 예전 목록 아코디언의 펼침과 글별 페이지를 합친 내용.
 * admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PostStatDetail } from '@/src/domain/analytics';

const { derived } = vi.hoisted(() => ({
  derived: {
    weekGrowthRate: null as number | null,
    milestones: [] as {
      target: number;
      reached: boolean;
      date: string | null;
    }[],
  },
}));
vi.mock('@/src/domain/analytics/admin', () => ({
  analyticsService: {
    computeDerivedStats: () => ({
      weekGrowthRate: derived.weekGrowthRate,
      peakDay: null,
      dailyAverage: 0,
      milestones: derived.milestones,
    }),
  },
  getPostHourlyDistribution: () => Promise.resolve([]),
  getPostDowDistribution: () => Promise.resolve([]),
}));
// 시간대 분포는 Recharts ResponsiveContainer라 크기를 ResizeObserver로 잰다 — jsdom에는 없다.
vi.stubGlobal(
  'ResizeObserver',
  class {
    // 크기 변화를 검사하지 않는다 — 관측은 기록만 받는다.
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  },
);

import { PostStatsPanel } from './PostStatsPanel';

const POST: PostStatDetail = {
  slug: 'my-post',
  title: '내 글',
  date: '2026-01-01',
  totalViews: 1234,
  todayViews: 3,
  // 추이가 없으면 일별 차트(ResizeObserver가 필요한 recharts) 대신 안내가 그려진다.
  trends: [],
  status: 'published',
  scheduledDate: null,
};

function renderPanel(
  post: PostStatDetail = POST,
  tags: readonly string[] = [],
  onClose = vi.fn(),
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <PostStatsPanel
          placement="column"
          post={post}
          tags={tags}
          titleId="panel-title"
          onClose={onClose}
        />
      </Suspense>
    </QueryClientProvider>,
  );
  return onClose;
}

describe('PostStatsPanel', () => {
  // 정적 export는 비공개 글의 페이지를 만들지 않는다 — 공개 URL은 404다.
  test.each([
    ['published', '/posts/my-post/'],
    ['draft', null],
  ] as const)('%s 글: 실제 글 링크는 공개 글에만 있다', (status, liveHref) => {
    renderPanel({ ...POST, status });

    expect(
      screen
        .queryByRole('link', { name: '글 열기 (새 탭)' })
        ?.getAttribute('href') ?? null,
    ).toBe(liveHref);
  });

  test('제목·누적·오늘·태그를 보이고, 닫기 버튼이 닫는다', () => {
    const onClose = renderPanel(POST, ['react', 'testing']);

    expect(
      screen.getByRole('heading', { name: '내 글', level: 2 }),
    ).toHaveAttribute('id', 'panel-title');
    expect(screen.getByText('1,234회')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('#react')).toBeInTheDocument();
    expect(screen.getByText('#testing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '통계 닫기' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('추이가 없으면 차트 대신 안내하고, 직접선택 기간은 날짜 둘을 연다', () => {
    renderPanel();

    expect(screen.getByText('해당 기간에 데이터가 없습니다.')).toBeVisible();

    fireEvent.change(screen.getByRole('combobox', { name: '기간' }), {
      target: { value: 'custom' },
    });
    expect(screen.getByLabelText('시작일')).toBeVisible();
    expect(screen.getByLabelText('종료일')).toBeVisible();
  });

  test('직접선택의 시작이 끝보다 늦으면 "데이터 없음"이 아니라 기간을 다시 고르라고 한다', () => {
    renderPanel();

    fireEvent.change(screen.getByRole('combobox', { name: '기간' }), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByLabelText('시작일'), {
      target: { value: '2026-03-10' },
    });
    fireEvent.change(screen.getByLabelText('종료일'), {
      target: { value: '2026-03-01' },
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      '시작일이 종료일보다 늦습니다',
    );
    expect(
      screen.queryByText('해당 기간에 데이터가 없습니다.'),
    ).not.toBeInTheDocument();
    // 달력은 처음부터 거꾸로 된 기간을 고르지 못하게 한다.
    expect(screen.getByLabelText('시작일')).toHaveAttribute(
      'max',
      '2026-03-01',
    );
    expect(screen.getByLabelText('종료일')).toHaveAttribute(
      'min',
      '2026-03-10',
    );
  });

  // 직전 주와 비교할 수 없는 증감률(null)은 하락이 아니다.
  test.each([
    [null, '비교 불가', '감소'],
    [-20, '감소', '비교 불가'],
  ])('증감률 %s는 "%s"로 그린다', (rate, shown, hidden) => {
    derived.weekGrowthRate = rate;
    renderPanel();

    expect(screen.getByRole('img', { name: shown })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: hidden })).not.toBeInTheDocument();
  });

  // 점의 채움은 색·모양뿐이라 보조기술에는 달성 여부를 글로 준다.
  test('마일스톤은 달성 여부를 글로 말하고 달성한 날을 붙인다', () => {
    derived.milestones = [
      { target: 100, reached: true, date: '2026-01-05' },
      { target: 5000, reached: false, date: null },
    ];
    renderPanel();

    const reached = screen.getByText('100회').closest('li');
    expect(reached).toHaveTextContent('100회달성2026-01-05');
    expect(screen.getByText('5,000회').closest('li')).toHaveTextContent(
      '5,000회미달성',
    );
  });
});
