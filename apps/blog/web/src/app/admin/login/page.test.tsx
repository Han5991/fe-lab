/**
 * admin 로그인 화면 — OAuth 실패를 조용히 삼키지 않는다.
 *
 * 세션 API는 auth 배럴이 import 시점에 supabase 클라이언트를 바인딩하므로 그
 * 배럴을, 쿼리스트링은 라우터 훅을 가짜로 바꾼다.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { search, signInAdminWithGoogle } = vi.hoisted(() => ({
  search: { current: '' },
  signInAdminWithGoogle: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search.current),
}));
vi.mock('@/src/domain/auth', () => ({
  authRepository: { signInAdminWithGoogle },
}));

import AdminLoginPage from './page';

function renderPage(query: string) {
  search.current = query;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminLoginPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  signInAdminWithGoogle.mockReset();
});

describe('AdminLoginPage', () => {
  test('OAuth가 실패해 돌아오면 실패와 Supabase가 준 사유를 보여 준다', () => {
    renderPage(
      '?error=oauth&error_description=Signups%20not%20allowed%20for%20this%20instance',
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Google 로그인에 실패했습니다.');
    expect(alert).toHaveTextContent('Signups not allowed for this instance');
  });

  test('로그인 시작이 { error }로 실패하면 alert 창이 아니라 화면에 알린다', async () => {
    signInAdminWithGoogle.mockResolvedValue({
      data: { provider: 'google', url: null },
      error: { message: 'provider is not enabled' },
    });
    renderPage('');

    fireEvent.click(
      screen.getByRole('button', { name: 'Google 계정으로 계속하기' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'provider is not enabled',
    );
  });

  test('허용되지 않은 계정 안내는 그대로다', () => {
    renderPage('?error=unauthorized');

    expect(screen.getByText(/등록되지 않은 이메일입니다/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
