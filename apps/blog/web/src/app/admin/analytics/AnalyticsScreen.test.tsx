/**
 * admin 분석 — 왼쪽 글 목록, 오른쪽 글 통계 패널. 고른 글은 주소가 들고 있다: 제목을 누르면
 * 주소만 바꾸고(`history.pushState`), 화면은 주소(`usePathname`)를 다시 읽는다. jsdom에는 Next
 * 라우터가 없어 pushState가 `usePathname`을 바꾸지 않으므로, "누르면 주소" 와 "주소면 패널"을
 * 따로 본다. admin 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as Service from '@/src/domain/analytics/service';
import { adminPostTagsQuery } from '@/src/hooks/useAdminPostTags';

const {
  nav,
  wide,
  getAdminPostsIndex,
  getAllPostStats,
  getPostHourlyDistribution,
} = vi.hoisted(() => ({
  nav: { pathname: '/admin/analytics/' },
  wide: { matches: true },
  getAdminPostsIndex: vi.fn<() => Promise<unknown[]>>(),
  getAllPostStats:
    vi.fn<
      () => Promise<
        { slug: string; total_views: number; today_views: number }[]
      >
    >(),
  getPostHourlyDistribution: vi.fn(() => Promise.resolve([])),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
}));
vi.mock('@/src/domain/analytics/admin', async () => {
  const { AnalyticsService } = await vi.importActual<typeof Service>(
    '@/src/domain/analytics/service',
  );
  return {
    analyticsService: new AnalyticsService(),
    getAdminPostsIndex,
    getAllPostStats,
    getAllPostsTrends: () => Promise.resolve([]),
    getPostHourlyDistribution,
    getPostDowDistribution: () => Promise.resolve([]),
  };
});
// 패널을 칼럼으로 둘지 시트로 띄울지는 lg 미디어 쿼리다 — jsdom에는 matchMedia가 없다.
vi.stubGlobal('matchMedia', () => ({
  get matches() {
    return wide.matches;
  },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
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

import { AnalyticsScreen } from './AnalyticsScreen';

const post = (slug: string, title: string, date: string, tags: string[]) => ({
  slug,
  title,
  date,
  tags,
  status: 'published',
  scheduledDate: null,
});

beforeEach(() => {
  nav.pathname = '/admin/analytics/';
  wide.matches = true;
  window.history.replaceState(null, '', '/admin/analytics/');
  getAdminPostsIndex.mockResolvedValue([
    post('a', '글 A', '2026-04-01', ['react']),
    post('b', '글 B', '2026-05-01', []),
  ]);
  getAllPostStats.mockResolvedValue([
    { slug: 'a', total_views: 7, today_views: 0 },
    { slug: 'b', total_views: 30, today_views: 2 },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderScreen(
  client = new QueryClient({
    // 재시도가 끼면 실패가 늦게 드러난다.
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return render(
    <QueryClientProvider client={client}>
      <AnalyticsScreen />
    </QueryClientProvider>,
  );
}

/** 목록 행의 제목 링크 — 화면 순서대로. */
async function rowTitles(): Promise<string[]> {
  const table = await screen.findByRole('table', { name: '글 목록' });
  return within(table)
    .queryAllByRole('link')
    .map(link => link.textContent ?? '');
}

describe('AnalyticsScreen — 목록', () => {
  test('새로고침이 실패하면 실패를 알리고 업데이트 시각을 바꾸지 않는다', async () => {
    renderScreen();

    // 마운트 직후의 재요청(refetchOnMount: 'always')까지 끝나길 기다린다.
    const refresh = await screen.findByRole('button', { name: '새로고침' });
    await waitFor(() => expect(refresh).toBeEnabled());
    const before = screen.getByText(/^업데이트:/).textContent;

    // 시계(Date)만 한 시간 옮긴다 — "지금"을 업데이트 시각으로 적는 구현이면 표시가 바뀐다.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 60 * 60 * 1000);
    getAllPostStats.mockRejectedValueOnce(new Error('Edge Function 500'));
    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '새로고침 실패',
    );
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/^업데이트:/).textContent).toBe(before);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '새로고침' })).toBeEnabled(),
    );
  });

  test('기본은 작성일 내림차순이고, 정렬 중인 열 머리를 다시 누르면 방향이 바뀐다', async () => {
    renderScreen();

    expect(await rowTitles()).toEqual(['글 B', '글 A']);
    const dateHeader = screen.getByRole('columnheader', { name: '작성일' });
    expect(dateHeader).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(within(dateHeader).getByRole('button'));

    expect(dateHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(await rowTitles()).toEqual(['글 A', '글 B']);
  });

  test('정렬 기준을 조회수로 바꾸면 그 열이 정렬 열이 된다', async () => {
    renderScreen();
    await rowTitles();

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: '정렬 기준' })).getByRole(
        'radio',
        { name: '조회수순' },
      ),
    );

    expect(
      screen.getByRole('columnheader', { name: '조회수' }),
    ).toHaveAttribute('aria-sort', 'descending');
    expect(
      screen.getByRole('columnheader', { name: '작성일' }),
    ).not.toHaveAttribute('aria-sort');
    expect(await rowTitles()).toEqual(['글 B', '글 A']);
  });

  test('제목 검색은 목록을 거르고, 맞는 글이 없으면 그렇게 말한다', async () => {
    renderScreen();
    await rowTitles();
    const search = screen.getByRole('searchbox', { name: '글 검색' });

    fireEvent.change(search, { target: { value: ' a ' } });
    expect(await rowTitles()).toEqual(['글 A']);

    fireEvent.change(search, { target: { value: '없는 글' } });
    expect(await rowTitles()).toEqual([]);
    expect(screen.getByText('‘없는 글’에 맞는 글이 없습니다.')).toBeVisible();
  });
});

describe('AnalyticsScreen — 고른 글', () => {
  test('제목을 누르면 주소만 그 글의 통계 주소로 바꾼다', async () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    renderScreen();

    const link = await screen.findByRole('link', { name: '글 A' });
    expect(link).toHaveAttribute('href', '/admin/analytics/a/');

    // 새 탭으로 여는 클릭은 가로채지 않는다 — 링크 그대로 간다.
    fireEvent.click(link, { ctrlKey: true });
    expect(pushState).not.toHaveBeenCalled();

    fireEvent.click(link);
    expect(pushState).toHaveBeenCalledWith(null, '', '/admin/analytics/a/');
  });

  test('주소가 고른 글을 오른쪽 패널이 그리고, 닫기는 목록 주소로 돌아간다', async () => {
    nav.pathname = '/admin/analytics/a/';
    window.history.replaceState(null, '', nav.pathname);
    const pushState = vi.spyOn(window.history, 'pushState');
    renderScreen();

    // 데이터를 기다리는 동안의 칼럼(스켈레톤)과 내용이 든 칼럼은 다른 요소다 — 내용이 선 뒤에 칼럼을 찾는다.
    const heading = await screen.findByRole('heading', {
      name: '글 A',
      level: 2,
    });
    const panel = screen.getByRole('region', { name: '글 통계' });
    expect(panel).toContainElement(heading);
    // 태그는 대시보드 데이터가 아니라 글 인덱스에서 온다.
    expect(within(panel).getByText('#react')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '글 A' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: '글 B' })).not.toHaveAttribute(
      'aria-current',
    );

    fireEvent.click(within(panel).getByRole('button', { name: '통계 닫기' }));
    expect(pushState).toHaveBeenCalledWith(null, '', '/admin/analytics/');
  });

  // 고른 글이 없으면 보일 통계가 없다 — 칼럼도 스켈레톤도 없이 목록이 폭을 다 쓴다(데이터를 기다리는
  // 동안에도 빈 칼럼이 서지 않는다).
  test('아무 글도 고르지 않으면 패널 칼럼이 없다', () => {
    getAdminPostsIndex.mockReturnValueOnce(new Promise(() => undefined));
    renderScreen();

    expect(
      screen.queryByRole('region', { name: '글 통계' }),
    ).not.toBeInTheDocument();
  });

  test('좁은 화면에서는 패널이 목록을 덮는 시트(다이얼로그)로 뜨고 Escape로 닫는다', async () => {
    wide.matches = false;
    nav.pathname = '/admin/analytics/a/';
    window.history.replaceState(null, '', nav.pathname);
    const pushState = vi.spyOn(window.history, 'pushState');
    renderScreen();

    const sheet = await screen.findByRole('dialog', { name: '글 A' });
    expect(sheet).toHaveAttribute('aria-modal', 'true');
    expect(
      screen.queryByRole('region', { name: '글 통계' }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(pushState).toHaveBeenCalledWith(null, '', '/admin/analytics/');
  });

  test('목록에 없는 글은 찾을 수 없다고 안내하고 목록으로 돌려보낸다', async () => {
    nav.pathname = '/admin/analytics/series/missing-post/';
    renderScreen();

    expect(
      await screen.findByRole('heading', {
        name: '이 글의 통계를 찾을 수 없습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('series/missing-post')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '조회수 분석 목록으로' }),
    ).toHaveAttribute('href', '/admin/analytics/');
  });

  // 대시보드 데이터가 온 뒤에야 태그를 기다리면 패널이 두 번 suspend해, 데이터가 React의 드러냄 throttle
  // 창(300ms) 뒤에 오면(프로덕션) 패널이 목록보다 300ms 늦게 드러난다(실측).
  test('패널은 글 태그를 대시보드 데이터와 함께 기다린다', async () => {
    nav.pathname = '/admin/analytics/a/';
    window.history.replaceState(null, '', nav.pathname);
    getAllPostStats.mockReturnValueOnce(new Promise(() => undefined));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    renderScreen(client);

    await waitFor(() =>
      expect(client.getQueryState(adminPostTagsQuery.queryKey)?.status).toBe(
        'success',
      ),
    );
  });

  // 대시보드를 기다린 뒤에 요청하면 패널이 왕복 둘을 차례로 기다린다.
  test('분포 요청은 대시보드 데이터를 기다리지 않고 함께 시작한다', () => {
    nav.pathname = '/admin/analytics/series/missing-post/';
    getAdminPostsIndex.mockReturnValueOnce(new Promise(() => undefined));
    renderScreen();

    expect(getPostHourlyDistribution).toHaveBeenCalledWith(
      'series/missing-post',
    );
  });
});
