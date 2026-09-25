/**
 * admin 로그아웃 — 집계 캐시와 가드의 세션 캐시를 함께 비운다.
 * auth 배럴은 import 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { describe, expect, test, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { push, signOutAdmin } = vi.hoisted(() => ({
  push: vi.fn(),
  signOutAdmin: vi.fn(() => Promise.resolve()),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/src/domain/auth', () => ({ authRepository: { signOutAdmin } }));

import { useAdminLogout } from './useAdminLogout';

describe('useAdminLogout', () => {
  test('로그아웃하면 가드의 세션 캐시가 옛 세션을 들고 있지 않다', async () => {
    const client = new QueryClient();
    client.setQueryData(['admin-auth-session'], {
      user: { email: 'me@example.com' },
    });
    client.setQueryData(['admin', 'dashboard-data'], [{ slug: 'a' }]);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAdminLogout(), { wrapper });
    await act(() => result.current.handleLogout());

    expect(signOutAdmin).toHaveBeenCalledWith({ scope: 'local' });
    // 뒤로 가기로 가드가 다시 마운트돼도 옛 세션으로 admin 화면을 그리지 않는다.
    expect(client.getQueryData(['admin-auth-session'])).toBeNull();
    expect(client.getQueryData(['admin', 'dashboard-data'])).toBeUndefined();
    expect(push).toHaveBeenCalledWith('/admin/login/');
  });
});
