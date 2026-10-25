/**
 * `/posts/` 목록의 교차 전환 — 칩·정렬·보기·필터 해제는 `ARCHIVE_FILTER_TRANSITION_TYPE`을 단 transition이고,
 * 검색어 타자는 아니다(글자마다 교차하지 않는다). 목록 경계는 그 type에서만 움직이는 `update`이고, 카드의
 * 공유 요소가 짝을 짓는 `post-open`과 겹치지 않는다. 페이지 경계(`PageBoundary`)가 이 type에 반응하지
 * 않는 것은 `PageBoundary.test.tsx`가 본다.
 *
 * jsdom에는 View Transitions가 없다 — `<ViewTransition>`은 받은 props를 data 속성으로 드러내는 상자로,
 * `addTransitionType`은 부른 type을 적는 스파이로 바꿔 끼운다.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type * as ReactModule from 'react';
import { POSTS_PATH, type PostSummary } from '@blog/content/client';

import { createViewCountsSource } from '@/src/hooks/usePopularViewCounts';
import {
  ARCHIVE_FILTER_TRANSITION_TYPE,
  ARCHIVE_LIST_SWAP,
  POST_OPEN_TRANSITION_TYPE,
} from '@/src/shared/viewTransitions';
import { PostsArchiveView } from './PostsArchive';

const nav = vi.hoisted(() => ({ search: '' }));
const types = vi.hoisted(() => ({
  added: [] as string[],
  /** true면 startTransition의 콜백을 바로 돌리지 않고 쌓아 둔다 — transition이 아직 커밋되지 않은 순간을 만든다 */
  hold: false,
  held: [] as (() => void)[],
}));

vi.mock('next/navigation', async () => {
  const { POSTS_PATH: path } = await import('@blog/content/client');
  return {
    usePathname: () => path,
    useSearchParams: () => new URLSearchParams(nav.search),
  };
});

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof ReactModule>('react');
  return {
    ...actual,
    startTransition: (scope: () => void) => {
      if (types.hold) types.held.push(() => actual.startTransition(scope));
      else actual.startTransition(scope);
    },
    addTransitionType: (type: string) => {
      types.added.push(type);
    },
    ViewTransition: (props: ReactModule.ViewTransitionProps) => (
      <div
        data-vt-update={JSON.stringify(props.update)}
        data-vt-enter={JSON.stringify(props.enter)}
        data-vt-exit={JSON.stringify(props.exit)}
        data-vt-share={JSON.stringify(props.share)}
        data-vt-default={props.default}
      >
        {props.children}
      </div>
    ),
  };
});

const post = (slug: string, date: string, extra: Partial<PostSummary> = {}) =>
  ({
    slug,
    originalSlug: slug,
    relativeDir: '',
    title: `${slug} 제목`,
    date,
    readMin: 3,
    status: 'published',
    tags: ['vitest'],
    ...extra,
  }) satisfies PostSummary;

const POSTS = [
  post('b-post', '2026-02-01', { series: 's1' }),
  post('a-post', '2026-01-01'),
];
const SERIES = [{ id: 's1', title: '픽스처 연재', count: 1 }];

beforeEach(() => {
  nav.search = '';
  types.added = [];
  types.hold = false;
  types.held = [];
  window.history.replaceState(null, '', POSTS_PATH);
});

afterEach(cleanup);

const renderView = () =>
  render(
    <PostsArchiveView
      posts={POSTS}
      series={SERIES}
      viewCountsSource={createViewCountsSource(() => Promise.resolve([]))}
    />,
  );

describe('글 목록의 교차 전환', () => {
  test('목록 경계는 필터 type에서만 움직이고 그 밖의 갱신에는 움직이지 않는다', () => {
    renderView();
    const box = screen
      .getByRole('list', { name: '글 목록' })
      .closest<HTMLElement>('[data-vt-update]');
    if (!box) throw new Error('목록 경계가 없다');
    expect(JSON.parse(box.dataset['vtUpdate'] ?? 'null')).toEqual(
      ARCHIVE_LIST_SWAP,
    );
    expect(box.dataset['vtDefault']).toBe('none');
    // 나타나고 사라지는 것은 페이지 경계의 일이다 — 목록 경계는 update만 가진다.
    expect(box.dataset['vtEnter']).toBeUndefined();
    expect(box.dataset['vtExit']).toBeUndefined();
    expect(box.dataset['vtShare']).toBeUndefined();
  });

  test('필터 type은 카드의 공유 요소 type(post-open)과 다른 이름이다', () => {
    expect(ARCHIVE_FILTER_TRANSITION_TYPE).not.toBe(POST_OPEN_TRANSITION_TYPE);
    expect(Object.keys(ARCHIVE_LIST_SWAP)).not.toContain(
      POST_OPEN_TRANSITION_TYPE,
    );
  });

  test('시리즈 칩·정렬·보기 전환은 필터 type을 단다', () => {
    renderView();
    fireEvent.click(screen.getByRole('radio', { name: '픽스처 연재 (1)' }));
    fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), {
      target: { value: 'shortest' },
    });
    fireEvent.click(screen.getByRole('radio', { name: '리스트' }));
    expect(types.added).toEqual(Array(3).fill(ARCHIVE_FILTER_TRANSITION_TYPE));
  });

  test('검색어 타자는 type을 달지 않는다 — 글자마다 교차하지 않는다', () => {
    renderView();
    const box = screen.getByRole('searchbox', { name: '글 검색' });
    fireEvent.change(box, { target: { value: 'b' } });
    fireEvent.change(box, { target: { value: 'b-' } });
    expect(types.added).toEqual([]);
  });

  test('검색어를 지우는 버튼은 한 번의 동작이라 type을 단다', () => {
    nav.search = '?q=b-post';
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '지우기' }));
    expect(types.added).toEqual([ARCHIVE_FILTER_TRANSITION_TYPE]);
  });

  test('태그 해제 칩은 필터 type을 단다', () => {
    nav.search = '?tag=vitest';
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '#vitest 필터 해제' }));
    expect(types.added).toEqual([ARCHIVE_FILTER_TRANSITION_TYPE]);
  });

  test('모두 지우기는 필터 type을 단다', () => {
    nav.search = '?tag=vitest&q=b-post';
    renderView();
    fireEvent.click(screen.getByRole('button', { name: '모두 지우기' }));
    expect(types.added).toEqual([ARCHIVE_FILTER_TRANSITION_TYPE]);
  });

  test('밖에서 바뀐 URL(뒤로·앞으로 가기)은 목록을 다시 읽고 type을 달지 않는다', () => {
    const { rerender } = renderView();
    const list = () => screen.getAllByRole('listitem').length;
    expect(list()).toBe(2);
    nav.search = '?series=s1';
    rerender(
      <PostsArchiveView
        posts={POSTS}
        series={SERIES}
        viewCountsSource={createViewCountsSource(() => Promise.resolve([]))}
      />,
    );
    // 컨트롤과 목록이 함께 URL을 따라가고, 쓰는 동작이 아니라 교차하지 않는다.
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: '픽스처 연재 (1)' })
        .checked,
    ).toBe(true);
    expect(list()).toBe(1);
    expect(types.added).toEqual([]);
  });

  test('누른 컨트롤의 값은 목록 transition이 커밋되기 전에 이미 새 값이다', () => {
    renderView();
    types.hold = true;
    const list = () => screen.getAllByRole('listitem').length;
    expect(list()).toBe(2);
    fireEvent.click(screen.getByRole('radio', { name: '픽스처 연재 (1)' }));
    fireEvent.change(screen.getByRole('combobox', { name: '정렬' }), {
      target: { value: 'shortest' },
    });
    // 제어 입력이 옛 값으로 되돌려지지 않는다 — 목록은 아직 그대로다.
    expect(
      screen.getByRole<HTMLInputElement>('radio', { name: '픽스처 연재 (1)' })
        .checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: '정렬' }).value,
    ).toBe('shortest');
    expect(list()).toBe(2);
    act(() => {
      for (const flush of types.held) flush();
    });
    expect(list()).toBe(1);
  });
});
