/**
 * admin 에러 경계 — 에러로 굳은 suspense 쿼리는 React Query의 에러 리셋 없이는
 * 다시 요청하지 않는다. "다시 시도"가 실제로 다시 불러오는지 본다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { AdminApiError } from '@/src/domain/analytics/adminErrors';
import AdminError from './error';

/** Next의 error.js 래퍼를 흉내 낸 최소 경계 — 잡은 값을 AdminError에 넘긴다. */
class Boundary extends Component<
  { children: ReactNode },
  { caught: { error: unknown } | null }
> {
  override state: { caught: { error: unknown } | null } = { caught: null };

  static getDerivedStateFromError(error: unknown) {
    return { caught: { error } };
  }

  override render() {
    return this.state.caught ? (
      <AdminError
        error={this.state.caught.error}
        reset={() => this.setState({ caught: null })}
      />
    ) : (
      this.props.children
    );
  }
}

function Stats({ load }: { load: () => Promise<string> }) {
  const { data } = useSuspenseQuery({
    queryKey: ['admin', 'test'],
    queryFn: load,
    retry: false,
  });
  return <p>{data}</p>;
}

function renderWithBoundary(load: () => Promise<string>) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <Boundary>
        <Suspense fallback={<p>불러오는 중</p>}>
          <Stats load={load} />
        </Suspense>
      </Boundary>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // React가 잡힌 에러를 console.error로 한 번 더 찍는다 — 테스트 출력만 조용히.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AdminError', () => {
  test.each([
    [
      '서버 실패',
      new Error('admin-analytics Edge Function 오류'),
      '관리자 데이터를 불러오지 못했습니다',
      'admin-analytics Edge Function 오류',
    ],
    [
      '401',
      new AdminApiError({
        action: 'all_post_stats',
        status: 401,
        serverMessage: '인증에 실패했습니다.',
        fallbackMessage: 'Edge Function returned a non-2xx status code',
      }),
      '로그인이 만료됐습니다 — 다시 로그인해 주세요',
      '인증에 실패했습니다.',
    ],
  ])(
    '%s는 흰 화면 대신 원인에 맞는 안내를 보인다',
    async (_kind, error, title, detail) => {
      renderWithBoundary(() => Promise.reject(error));

      expect(
        await screen.findByRole('heading', { name: title }),
      ).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(detail);
      expect(screen.getByRole('link', { name: '다시 로그인' })).toHaveAttribute(
        'href',
        '/admin/login/',
      );
    },
  );

  test('"다시 시도"는 실패한 쿼리를 실제로 다시 불러온다', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('일시 장애'))
      .mockResolvedValueOnce('회복된 데이터');
    renderWithBoundary(load);

    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('회복된 데이터')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
