/**
 * admin 가드 — 세션이 없으면 로그인 화면으로, OAuth 실패 사유는 함께 실어 보낸다.
 * auth 배럴은 import 시점에 supabase 클라이언트를 만들어 저장소만 가짜로 바꾼다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Suspense } from 'react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as AdminAccess from '@/src/domain/auth/adminAccess';

const { replace, auth } = vi.hoisted(() => ({
  replace: vi.fn(),
  auth: {
    session: null as { user: { email: string } } | null,
    listener: undefined as
      ((session: unknown, event: string) => void) | undefined,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => '/admin/',
}));
vi.mock('@/src/domain/auth', async () => ({
  ...(await vi.importActual<typeof AdminAccess>(
    '@/src/domain/auth/adminAccess',
  )),
  authRepository: {
    getAdminSession: () => Promise.resolve(auth.session),
    subscribeAdminSession: (
      listener: (session: unknown, event: string) => void,
    ) => {
      auth.listener = listener;
      return () => {
        if (auth.listener === listener) auth.listener = undefined;
      };
    },
    // auth-js의 signOut처럼 resolve하기 전에 같은 탭 구독자에게 SIGNED_OUT을 보낸다.
    signOutAdmin: () => {
      auth.listener?.(null, 'SIGNED_OUT');
      return Promise.resolve();
    },
  },
}));

import { ADMIN_LOGIN_UNAUTHORIZED_PATH } from '@/src/shared/routes';
import { AdminGuard } from './AdminGuard';

function renderGuard(client = new QueryClient()) {
  render(
    <QueryClientProvider client={client}>
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
  auth.session = null;
  auth.listener = undefined;
  vi.unstubAllEnvs();
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

  // 다른 탭의 로그아웃도 로그아웃 버튼과 같은 비우기를 거친다 — 예전엔 로그인 화면으로 보내기만 해서
  // 뒤로 가기에 옛 세션 화면과 집계 캐시가 그대로 남았다.
  test('다른 탭에서 로그아웃하면 이 탭의 admin 집계와 세션 캐시를 비운다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_EMAIL', 'admin@example.com');
    auth.session = { user: { email: 'admin@example.com' } };
    const client = new QueryClient();
    client.setQueryData(['admin', 'dashboard-data'], { views: 1 });
    renderGuard(client);
    await waitFor(() => expect(auth.listener).toBeDefined());

    auth.listener?.(null, 'SIGNED_OUT');

    expect(client.getQueryData(['admin', 'dashboard-data'])).toBeUndefined();
    expect(client.getQueryData(['admin-auth-session'])).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/login/'));
  });

  test('다른 탭에서 관리자가 아닌 계정으로 바뀌면 집계를 비우고 권한 없음 화면으로 보낸다', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADMIN_EMAIL', 'admin@example.com');
    auth.session = { user: { email: 'admin@example.com' } };
    const client = new QueryClient();
    client.setQueryData(['admin', 'dashboard-data'], { views: 1 });
    renderGuard(client);
    await waitFor(() => expect(auth.listener).toBeDefined());

    auth.listener?.({ user: { email: 'someone@example.com' } }, 'SIGNED_IN');

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(ADMIN_LOGIN_UNAUTHORIZED_PATH),
    );
    // 로그아웃이 보낸 SIGNED_OUT이 일반 로그인 리다이렉트로 이 안내를 덮지 않는다 — 렌더가
    // 가라앉은 뒤의 마지막 목적지가 권한 없음이어야 한다.
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(replace.mock.calls.at(-1)?.[0]).toBe(ADMIN_LOGIN_UNAUTHORIZED_PATH);
    expect(client.getQueryData(['admin', 'dashboard-data'])).toBeUndefined();
  });
});
