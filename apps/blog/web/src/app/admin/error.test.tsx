/**
 * admin 에러 경계 — 실패한 suspense 쿼리를 안내하고, "다시 시도"로 실제로
 * 다시 불러온다.
 *
 * 두 번째가 이 테스트의 핵심이다. 에러로 굳은 suspense 쿼리는 React Query의
 * 에러 리셋 없이 다시 마운트되면 재요청하지 않고 같은 에러를 다시 던진다 —
 * 경계만 비우는 버튼은 눌러도 같은 화면으로 돌아온다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Component, Suspense, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from '@tanstack/react-query';
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
  test('실패 원인을 흰 화면 대신 안내로 보여 준다', async () => {
    renderWithBoundary(() =>
      Promise.reject(new Error('admin-analytics Edge Function 오류')),
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('관리자 데이터를 불러오지 못했습니다');
    expect(alert).toHaveTextContent('admin-analytics Edge Function 오류');
    expect(screen.getByRole('link', { name: '다시 로그인' })).toHaveAttribute(
      'href',
      '/admin/login/',
    );
  });

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
