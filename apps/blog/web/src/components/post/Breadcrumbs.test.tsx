/**
 * 글 상세의 빵부스러기 — `글 / {시리즈명}` 두 칸이 모두 링크이고, 둘째 칸은 시리즈 필터 목록으로 간다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Breadcrumbs } from './Breadcrumbs';

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 상세에 둔다.
vi.mock('next/navigation', async () => {
  const { postPath } = await import('@blog/content/client');
  return { usePathname: () => postPath('some-post') };
});

describe('Breadcrumbs', () => {
  test('이름이 `위치`인 내비게이션 안에 목록으로 두 칸이 있다', () => {
    render(<Breadcrumbs series={{ id: 'bundler', name: '번들러 만들기' }} />);

    const nav = screen.getByRole('navigation', { name: '위치' });
    expect(within(nav).getAllByRole('listitem')).toHaveLength(2);
  });

  test('첫 칸은 글 목록, 둘째 칸은 그 시리즈로 거른 목록으로 간다', () => {
    render(<Breadcrumbs series={{ id: 'bundler', name: '번들러 만들기' }} />);

    expect(screen.getByRole('link', { name: '글' })).toHaveAttribute(
      'href',
      '/posts/',
    );
    expect(screen.getByRole('link', { name: '번들러 만들기' })).toHaveAttribute(
      'href',
      '/posts/?series=bundler',
    );
  });

  test('시리즈 id에 쿼리 특수문자가 있어도 인코딩해서 넘긴다', () => {
    render(<Breadcrumbs series={{ id: 'c++ & rust', name: 'C++' }} />);

    expect(screen.getByRole('link', { name: 'C++' })).toHaveAttribute(
      'href',
      '/posts/?series=c%2B%2B%20%26%20rust',
    );
  });

  test('구분자는 스크린리더에서 숨긴다', () => {
    render(<Breadcrumbs series={{ id: 'a', name: 'A' }} />);

    expect(screen.getByText('/')).toHaveAttribute('aria-hidden', 'true');
  });

  test('현재 위치(aria-current)를 달지 않는다 — 현재 글은 이 줄에 없다', () => {
    const { container } = render(
      <Breadcrumbs series={{ id: 'a', name: 'A' }} />,
    );

    expect(container.querySelector('[aria-current]')).toBeNull();
  });
});
