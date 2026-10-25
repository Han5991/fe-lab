/**
 * admin 셸 — 모든 admin 화면이 같은 관리자 바(워드마크·Admin | 대시보드·분석 | 블로그·테마·로그아웃)와
 * 본문을 쓴다. 가드는 따로 검사하므로(AdminGuard.test) 여기서는 통과시킨다. auth 배럴은 import
 * 시점에 supabase 클라이언트를 만들어 가짜로 바꾼다.
 */
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { nav, push, signOutAdmin } = vi.hoisted(() => ({
  nav: { pathname: '/admin/' },
  push: vi.fn(),
  signOutAdmin: vi.fn(() => Promise.resolve()),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock('@/src/domain/auth', () => ({ authRepository: { signOutAdmin } }));
vi.mock('./AdminGuard', () => ({
  AdminGuard: ({ children }: { children: ReactNode }) => children,
}));

import { AdminShell } from './AdminShell';

function renderShell(pathname: string) {
  nav.pathname = pathname;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AdminShell>
        <p>본문</p>
      </AdminShell>
    </QueryClientProvider>,
  );
}

function currentItem(): string | null {
  const menu = screen.getByRole('navigation', { name: '관리자 메뉴' });
  return (
    within(menu)
      .getAllByRole('link')
      .find(link => link.getAttribute('aria-current') === 'page')
      ?.textContent ?? null
  );
}

describe('AdminShell', () => {
  afterEach(() => {
    delete document.documentElement.dataset['theme'];
    document.cookie = 'theme=; path=/; max-age=0';
  });

  test('관리자 바는 배너 랜드마크이고 화면 내용은 그 아래 main에 든다', () => {
    renderShell('/admin/');

    expect(screen.getByRole('banner')).toHaveTextContent('Admin');
    expect(screen.getByRole('main')).toHaveTextContent('본문');
  });

  // 사이트 셸의 건너뛰기 링크는 admin에 없다(`ShellSwitch`) — 바의 탭 정지점 다섯을 건너뛰는 길.
  test('건너뛰기 링크가 바보다 먼저 오고 main을 가리킨다', () => {
    renderShell('/admin/');

    const skip = screen.getByRole('link', { name: '본문으로 건너뛰기' });
    const main = screen.getByRole('main');
    expect(skip).toHaveAttribute('href', `#${main.id}`);
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(
      skip.compareDocumentPosition(screen.getByRole('banner')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  test.each([
    ['/admin/', '대시보드'],
    // dev 서버는 무슬래시형도 서빙한다.
    ['/admin', '대시보드'],
    ['/admin/analytics/', '분석'],
    // 글을 고른 분석 화면도 분석이다 — 대시보드(`/admin/`)는 모든 admin 경로의 접두다.
    ['/admin/analytics/react/component/toast/', '분석'],
  ])('%s에서 현재 위치는 %s다', (pathname, current) => {
    renderShell(pathname);

    expect(currentItem()).toBe(current);
  });

  test('내비는 대시보드와 분석으로 간다', () => {
    renderShell('/admin/');

    expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute(
      'href',
      '/admin/',
    );
    expect(screen.getByRole('link', { name: '분석' })).toHaveAttribute(
      'href',
      '/admin/analytics/',
    );
  });

  test('블로그는 새 탭으로 연다', () => {
    renderShell('/admin/');

    const blog = screen.getByRole('link', { name: '블로그 열기' });
    expect(blog).toHaveAttribute('href', '/');
    expect(blog).toHaveAttribute('target', '_blank');
    expect(blog).toHaveAttribute('rel', 'noopener noreferrer');
  });

  // 사이트 헤더와 같은 컴포넌트(`ThemeToggle`)다 — 접근 이름이 같고, 누르면 같은 쿠키·data-theme를 바꾼다.
  test('테마 토글이 이름으로 잡히고 누르면 라이트와 다크가 바뀌며 쿠키에 남는다', () => {
    document.documentElement.dataset['theme'] = 'dark';
    renderShell('/admin/');

    const toggle = within(screen.getByRole('banner')).getByRole('button', {
      name: '테마 전환 (라이트/다크)',
    });
    fireEvent.click(toggle);
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(document.cookie).toContain('theme=light');

    fireEvent.click(toggle);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.cookie).toContain('theme=dark');
  });

  test('로그아웃은 이 탭의 세션을 끝내고 로그인 화면으로 보낸다', async () => {
    renderShell('/admin/analytics/');

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/login/'));
    expect(signOutAdmin).toHaveBeenCalledWith({ scope: 'local' });
  });
});
