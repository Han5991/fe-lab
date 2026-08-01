/**
 * 헤더 네비게이션의 활성 표시 규칙.
 *
 * 글 상세(`/posts/foo/`)에서도 "글"이 활성으로 남아야 합니다 — 정확히 일치로
 * 판정하면 글을 읽는 동안 네비가 통째로 비활성처럼 보입니다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

import { NavLinks } from './NavLinks';

const renderAt = (path: string) => {
  pathname.current = path;
  render(<NavLinks />);
};

describe('NavLinks', () => {
  test('글·시리즈·About 3개만 노출한다', () => {
    renderAt('/');
    expect(screen.getAllByRole('link').map(a => a.textContent)).toEqual([
      '글',
      '시리즈',
      'About',
    ]);
  });

  // 홈은 `/posts/`가 아니지만 리뉴얼 후 대표글 + 글 목록을 얹은 글 허브라,
  // 레퍼런스 화면 1처럼 "글"을 켠다. prefix 판정만으로는 홈이 통째로
  // 비활성이 되므로 예외 분기가 필요하고, 그 분기를 여기서 고정한다.
  test('홈에서는 "글"이 활성이다', () => {
    renderAt('/');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(
      '글',
    );
  });

  test('글 상세에서도 "글"이 활성으로 남는다', () => {
    renderAt('/posts/some-post/');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(
      '글',
    );
  });

  test('시리즈 경로에서는 "시리즈"만 활성이다', () => {
    renderAt('/series/bundler/');
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(
      '시리즈',
    );
  });
});
