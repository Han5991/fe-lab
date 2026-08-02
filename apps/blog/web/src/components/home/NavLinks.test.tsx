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

  // 활성 스타일이 실제로 **적용되는지**까지 본다. 예전에는 `cx(base, active)`로
  // 합쳐서 활성 링크에 비활성 색 클래스(`c_ink.600`)가 그대로 남았고, 승자는
  // 클래스 순서가 아니라 스타일시트 순서가 정해 비활성 색이 이겼다. 그래서
  // `aria-current`만 검사하던 위 테스트들은 전부 통과하는데 화면에서는 굵기만
  // 바뀌고 색은 안 바뀌었다. Panda가 color 클래스를 하나만 내는지로 고정한다.
  test('활성 링크에 색 클래스가 하나만 붙는다', () => {
    renderAt('/series/bundler/');
    const active = screen.getByRole('link', { current: 'page' });
    const colorClasses = active.className
      .split(' ')
      .filter(c => c.startsWith('c_'));
    expect(colorClasses).toHaveLength(1);
  });
});
