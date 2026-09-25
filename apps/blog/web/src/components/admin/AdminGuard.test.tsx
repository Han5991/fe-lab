/**
 * admin 가드 — 세션 없이 들어오면 로그인 화면으로 보내되, OAuth가 실패해 돌아온
 * 경우엔 Supabase가 붙여 둔 사유를 함께 실어 보낸다.
 *
 * 세션 API는 auth 배럴이 import 시점에 supabase 클라이언트를 바인딩하므로 그
 * 배럴의 저장소만 가짜로 바꾸고, 순수 판정(adminAccess)은 진짜를 쓴다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as AdminAccess from '@/src/domain/auth/adminAccess';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/admin/',
}));
vi.mock('@/src/domain/auth', async () => ({
  ...(await vi.importActual<typeof AdminAccess>(
    '@/src/domain/auth/adminAccess',
  )),
  authRepository: {
    getAdminSession: () => Promise.resolve(null),
    subscribeAdminSession: () => () => undefined,
  },
}));

import { AdminGuard } from './AdminGuard';

function renderGuard() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Suspense fallback={null}>
        <AdminGuard>
          <p>관리자 화면</p>
        </AdminGuard>
      </Suspense>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  replace.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('AdminGuard', () => {
  test('세션이 없으면 로그인 화면으로 보낸다', async () => {
    window.history.replaceState(null, '', '/admin/');
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login/'));
  });

  test('OAuth 실패로 돌아왔으면 사유를 로그인 화면에 실어 보낸다', async () => {
    window.history.replaceState(
      null,
      '',
      '/admin/?error=access_denied&error_description=Signups+not+allowed+for+this+instance',
    );
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalled());
    const target = new URL(String(replace.mock.calls[0]?.[0]), 'http://x');
    expect(target.pathname).toBe('/admin/login/');
    expect(target.searchParams.get('error')).toBe('oauth');
    expect(target.searchParams.get('error_description')).toBe(
      'Signups not allowed for this instance',
    );
  });
});
