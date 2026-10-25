/**
 * 헤더 네비게이션의 활성 표시 규칙.
 *
 * 글 상세(`/posts/foo/`)에서도 "글"이 활성으로 남아야 합니다 — 정확히 일치로
 * 판정하면 글을 읽는 동안 네비가 통째로 비활성처럼 보입니다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

import {
  ACTIVE_NAV_INDICATOR_SELECTOR,
  NAV_INDICATOR_ATTRIBUTE,
} from '@/src/shared/viewTransitions';
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

  // 홈은 글 허브지만 내비의 어느 링크도 홈을 가리키지 않는다 — "글"을 켜면 `/posts/`가
  // 현재 페이지라고 알리는 셈이다. 예전엔 홈에서 "글"을 켜는 예외 분기가 있었다.
  test('홈에서는 활성 항목이 없다', () => {
    renderAt('/');
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.queryByRole('link', { current: 'page' })).toBeNull();
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

  // 현재 위치 표식은 globalCss가 이 속성으로 모양과 이름(`view-transition-name`)을 줘 페이지 전환에서
  // 옛 링크에서 새 링크로 옮겨 간다. NavLinks는 속성 이름을 상수 없이 JSX에 직접 적으므로(첫 로드 JS)
  // 그 사본을 여기서 잠근다. 막대와 이름은 현재 페이지 링크의 span에만 붙는다 — 이름이 둘이면
  // 브라우저가 전환을 통째로 건너뛰는데(페이지 이동이 전부 즉시가 된다) 렌더 결과로는 보이지 않는다.
  describe('현재 위치 표식', () => {
    const named = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(ACTIVE_NAV_INDICATOR_SELECTOR),
      );

    test('링크마다 빈 표식이 하나씩 있고, 보조 기술에는 숨긴다', () => {
      renderAt('/series/bundler/');
      const links = screen.getAllByRole('link');
      for (const link of links) {
        const spans = link.querySelectorAll(`[${NAV_INDICATOR_ATTRIBUTE}]`);
        expect(spans).toHaveLength(1);
        const [span] = spans;
        expect(span).toHaveAttribute('aria-hidden', 'true');
        expect(span).toBeEmptyDOMElement();
      }
      // 링크 이름은 라벨 그대로다
      expect(links.map(link => link.textContent)).toEqual([
        '글',
        '시리즈',
        'About',
      ]);
      expect(
        screen.getByRole('link', { current: 'page' }),
      ).toHaveAccessibleName('시리즈');
    });

    test('막대가 그려지는 표식은 현재 페이지 링크의 것 하나뿐이다', () => {
      renderAt('/series/bundler/');
      const found = named();
      expect(found).toHaveLength(1);
      expect(screen.getByRole('link', { current: 'page' })).toContainElement(
        found[0] ?? null,
      );
    });

    test('홈에는 활성 링크가 없어 막대도 없다', () => {
      renderAt('/');
      expect(named()).toHaveLength(0);
    });

    // 404.html은 빌드 때 활성 링크 없이 미리 그려지고(`/_not-found`), 정적 호스트는 없는 경로 어디에나
    // 그 파일을 준다. `/posts/없는-글/`에서는 클라이언트만 "글"을 활성으로 보므로, 활성 여부로 자식이
    // 갈리면 서버 HTML과 트리가 달라 하이드레이션이 깨진다(React #418 — 루트가 클라이언트에서 다시
    // 그려지며 `<html data-theme>`가 서버 값으로 덮였다). 속성(aria-current·class)만 다르면 React는
    // 서버 값을 두고 넘어가 복구 에러가 나지 않는다.
    test('미리 그린 404를 섹션 아래 경로에서 하이드레이트해도 트리가 어긋나지 않는다', () => {
      pathname.current = '/_not-found';
      const container = document.createElement('div');
      container.innerHTML = renderToString(<NavLinks />);
      document.body.append(container);
      pathname.current = '/posts/no-such-post/';
      const onRecoverableError = vi.fn();
      // 속성 차이는 개발 빌드에서 console.error 경고로만 나온다 — 여기서 보는 건 복구 에러다.
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
      try {
        render(<NavLinks />, { container, hydrate: true, onRecoverableError });
        expect(onRecoverableError).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });
});
