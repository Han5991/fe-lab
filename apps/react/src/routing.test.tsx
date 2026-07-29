import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Link, Route, Routes } from 'react-router';

/**
 * react-router 라우팅 스모크 테스트.
 *
 * `main.tsx`의 라우터는 `createRoot` + MSW worker 부팅과 얽혀 있어 직접 렌더할 수 없다.
 * 대신 이 앱이 실제로 쓰는 react-router 표면 — declarative 모드의
 * `BrowserRouter` / `Routes` / `Route` / `Link` — 를 런타임에서 검증한다.
 *
 * 메이저 업그레이드(v7 -> v8 등) 때 타입 검사만으로는 드러나지 않는
 * 경로 매칭·클라이언트 사이드 네비게이션 회귀를 잡는 것이 목적이다.
 */

/** `main.tsx`의 라우트 테이블과 동일한 경로 목록. */
const ROUTE_PATHS = [
  '/',
  '/error-test',
  '/error-design',
  '/toast',
  '/socket',
  '/stok-ticker-query',
] as const;

function TestApp() {
  return (
    <BrowserRouter>
      <Routes>
        {ROUTE_PATHS.map(path => (
          <Route
            key={path}
            path={path}
            element={<div data-testid="active-route">{path}</div>}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

describe('react-router declarative routing', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it.each(ROUTE_PATHS)('경로 %s 가 해당 route element를 렌더한다', path => {
    window.history.pushState({}, '', path);

    render(<TestApp />);

    expect(screen.getByTestId('active-route')).toHaveTextContent(path);
  });

  it('매칭되는 라우트가 없으면 아무 element도 렌더하지 않는다', () => {
    window.history.pushState({}, '', '/이런-경로는-없다');

    render(<TestApp />);

    expect(screen.queryByTestId('active-route')).not.toBeInTheDocument();
  });

  it('<Link>는 실제 href를 가진 앵커를 렌더한다', () => {
    render(
      <BrowserRouter>
        <Link to="/toast">Toast</Link>
      </BrowserRouter>,
    );

    expect(screen.getByRole('link', { name: 'Toast' })).toHaveAttribute(
      'href',
      '/toast',
    );
  });

  it('<Link> 클릭 시 전체 새로고침 없이 클라이언트 사이드로 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <Link to="/error-design">에러 디자인</Link>
        <Routes>
          <Route path="/" element={<div>홈</div>} />
          <Route
            path="/error-design"
            element={<div data-testid="error-design">에러 디자인 페이지</div>}
          />
        </Routes>
      </BrowserRouter>,
    );

    expect(screen.getByText('홈')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: '에러 디자인' }));

    expect(await screen.findByTestId('error-design')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/error-design');
    expect(screen.queryByText('홈')).not.toBeInTheDocument();
  });
});
