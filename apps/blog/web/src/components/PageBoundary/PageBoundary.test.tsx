/**
 * 페이지 경계가 링크 이동의 transition type을 CSS가 읽는 클래스로 바꾸는지 — `panda.config.ts`의
 * `::view-transition-old/new(.nav-forward)` 규칙은 type과 **같은 이름**의 클래스를 기다린다. 다른 이름을
 * 붙이거나 type별 객체를 문자열 하나로 되돌리면 방향 있는 이동이 진단 없이 페이드로 돌아간다.
 * 그리고 페이지가 아닌 라우트 화면(404·admin)도 경계 안에 있는지.
 *
 * jsdom에는 View Transitions가 없으므로 `<ViewTransition>`을 받은 props를 data 속성으로 드러내는
 * 상자로 바꿔 끼운다.
 */
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as ReactModule from 'react';
import { postPath } from '@blog/content/client';
import NotFound from '@/src/app/not-found';
import AdminLayout from '@/src/app/admin/layout';
import { ADMIN_LOGIN_PATH } from '@/src/shared/routes';
import {
  ARCHIVE_FILTER_TRANSITION_TYPE,
  NAV_TRANSITION,
  VIEW_TRANSITION,
} from '@/src/shared/viewTransitions';
import { PageBoundary } from './PageBoundary';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof ReactModule>('react');
  return {
    ...actual,
    ViewTransition: (props: ReactModule.ViewTransitionProps) => (
      <div
        data-vt-enter={JSON.stringify(props.enter)}
        data-vt-exit={JSON.stringify(props.exit)}
        data-vt-update={JSON.stringify(props.update)}
        data-vt-default={props.default}
      >
        {props.children}
      </div>
    ),
  };
});

describe('PageBoundary', () => {
  test('방향 type마다 같은 이름의 클래스를, type이 없으면 페이드 클래스를 붙인다', () => {
    const { container } = render(<PageBoundary>본문</PageBoundary>);
    const box = container.querySelector<HTMLElement>('[data-vt-default]');
    if (!box) throw new Error('ViewTransition이 없다');
    const { forward, back } = NAV_TRANSITION;
    const byType = (fallback: string) => ({
      [forward]: forward,
      [back]: back,
      default: fallback,
    });
    expect(JSON.parse(box.dataset['vtEnter'] ?? 'null')).toEqual(
      byType(VIEW_TRANSITION.pageEnter),
    );
    expect(JSON.parse(box.dataset['vtExit'] ?? 'null')).toEqual(
      byType(VIEW_TRANSITION.pageExit),
    );
    // 페이지 안의 갱신은 움직이지 않는다.
    expect(box.dataset['vtDefault']).toBe('none');
  });

  test('글 목록의 필터 type에는 반응하지 않는다 — 쿼리 변경에 페이지 전환은 돌지 않는다', () => {
    const { container } = render(<PageBoundary>본문</PageBoundary>);
    const box = container.querySelector<HTMLElement>('[data-vt-default]');
    if (!box) throw new Error('ViewTransition이 없다');
    // enter·exit의 키(방향 type들과 default)에 필터 type이 없다 — JSON 문자열에 그 이름이 나오지 않는다.
    for (const key of ['vtEnter', 'vtExit'] as const) {
      expect(box.dataset[key]).not.toContain(ARCHIVE_FILTER_TRANSITION_TYPE);
    }
    // update는 아예 없다 — 같은 페이지 안의 갱신은 `default="none"`이다.
    expect(box.dataset['vtUpdate']).toBeUndefined();
  });
});

describe('페이지가 아닌 라우트 화면도 경계 안에 있다', () => {
  // 경계 밖 화면은 전환 스냅샷에 담기지 않아 첫 프레임에 사라지고, 방향 있는 이동은 들어오는
  // 페이지가 fast 뒤에 나타나 그 사이 헤더만 남은 빈 지면이 보인다(404 → 헤더 '글'에서 175ms 실측).
  // 에러 경계는 일부러 뺐다(PageBoundary 주석).
  test.each([
    {
      route: '404',
      at: postPath('missing-post'),
      ui: () => <NotFound />,
      heading: '페이지를 찾을 수 없습니다',
    },
    {
      // 로그인 경로라 가드 없이 children을 그대로 그린다.
      route: 'admin 영역',
      at: ADMIN_LOGIN_PATH,
      ui: () => (
        <AdminLayout>
          <h1>관리자 로그인</h1>
        </AdminLayout>
      ),
      heading: '관리자 로그인',
    },
  ])('$route', ({ at, ui, heading }) => {
    pathname.current = at;
    render(ui());
    const title = screen.getByRole('heading', { level: 1, name: heading });
    expect(title.closest('[data-vt-default="none"]')).not.toBeNull();
  });
});
