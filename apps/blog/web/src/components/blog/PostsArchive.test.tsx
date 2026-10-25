/**
 * `/posts/` — 정적 HTML에는 폴백만 남으므로, URL 파라미터가 없을 때 폴백과 뷰가 같은 헤딩·링크·이미지를
 * 같은 순서로 그려야 하이드레이션 뒤 목록이 바뀌지 않는다.
 *
 * 뷰는 로컬 상태로 그리고 URL은 뒤따라 쓴다(`history.replaceState`). URL 쓰기는 `replaceState`의 세
 * 번째 인자로 본다. "URL이 따라온다"는 `nav.search`를 바꾸고 다시 렌더해 흉내 낸다 — 실제 Next는
 * `replaceState`를 `useSearchParams`에 transition으로 반영한다.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { POSTS_PATH, type PostSummary } from '@blog/content/client';

import { createViewCountsSource } from '@/src/hooks/usePopularViewCounts';

// 지금 주소의 쿼리 — 테스트가 바꾸고 다시 렌더하면 `useSearchParams`가 새 값을 돌려준다.
const nav = vi.hoisted(() => ({ search: '' }));

// 링크가 현재 경로로 이동 방향을 고른다(TransitionLink) — 이 컴포넌트가 놓이는 글 목록에 둔다.
vi.mock('next/navigation', async () => {
  const { POSTS_PATH: path } = await import('@blog/content/client');
  return {
    usePathname: () => path,
    useSearchParams: () => new URLSearchParams(nav.search),
  };
});

import { SEARCH_COMMIT_MS } from './archiveParams';
import { PostsArchiveFallback, PostsArchiveView } from './PostsArchive';

const post = (
  slug: string,
  date: string,
  tags: string[],
  extra: Partial<PostSummary> = {},
): PostSummary => ({
  slug,
  originalSlug: slug,
  relativeDir: '',
  title: `${slug} 제목`,
  date,
  readMin: 3,
  status: 'published',
  tags,
  ...extra,
});

// 실제 사이트 값과 다른 픽스처 — 시리즈 하나, 태그 셋. 태그가 둘인 글은 최신 글 하나다(`featureCard`).
const POSTS = [
  post('b-post', '2026-02-01', ['react', 'ci'], { series: 's1', readMin: 5 }),
  post('a-post', '2026-01-01', ['vitest'], { readMin: 2 }),
];
const SERIES = [{ id: 's1', title: '픽스처 연재', count: 1 }];
const props = { posts: POSTS, series: SERIES };

/** 조회수 응답을 테스트가 정하는 소스 — 케이스마다 새로 만들어 캐시가 넘지 않는다. */
const deferredSource = () => {
  let resolve: (rows: { slug: string; view_count: number }[]) => void = () =>
    undefined;
  let reject: (err: unknown) => void = () => undefined;
  const fetchRows = vi.fn(
    (_slugs: readonly string[]) =>
      new Promise<{ slug: string; view_count: number }[]>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return {
    source: createViewCountsSource(fetchRows),
    fetchRows,
    resolve: (rows: { slug: string; view_count: number }[]) => resolve(rows),
    reject: (err: unknown) => reject(err),
  };
};

let replaceState: MockInstance<History['replaceState']>;

beforeEach(() => {
  nav.search = '';
  // 주소를 글 목록에 맞춘다 — 뷰는 지금 주소가 목록일 때만 URL을 쓴다.
  window.history.replaceState(null, '', POSTS_PATH);
  // jsdom의 원래 동작을 유지한다(`location.pathname`이 실제로 바뀐다).
  replaceState = vi.spyOn(window.history, 'replaceState');
});

afterEach(() => {
  replaceState.mockRestore();
  vi.useRealTimers();
});

const ui = (source = deferredSource().source) => (
  <PostsArchiveView {...props} viewCountsSource={source} />
);

const renderView = (search = '', source = deferredSource().source) => {
  nav.search = search;
  const view = render(ui(source));
  return {
    ...view,
    rerenderAt: (next: string) => {
      nav.search = next;
      view.rerender(ui(source));
    },
  };
};

/** URL에 쓴 href 목록 — 테스트가 직접 부른 호출도 남는다. */
const written = () => replaceState.mock.calls.map(call => call[2]);

const searchbox = () => screen.getByRole('searchbox', { name: '글 검색' });
const list = () => screen.getByRole('list', { name: '글 목록' });
const titles = () =>
  screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
const items = () => within(list()).getAllByRole('listitem');
/**
 * 피처 카드 제목. 피처는 앞 태그 둘을 배지로, 그리드 카드는 첫 태그 하나만 단다(`PostCard`) — 둘째 태그
 * 배지(`#ci`)가 보이는 카드가 피처다.
 */
const featureCard = () => screen.queryByText('#ci')?.closest('article');
const featureTitle = () => {
  const card = featureCard();
  return card
    ? within(card).getByRole('heading', { level: 3 }).textContent
    : undefined;
};

/** 화면이 "같다"의 기준. 썸네일은 장식(alt="")이라 역할이 없어 요소로 센다. */
const fingerprint = () => ({
  headings: screen
    .getAllByRole('heading')
    .map(h => `${h.tagName}:${h.textContent}`),
  links: screen.getAllByRole('link').map(a => a.getAttribute('href')),
  thumbnails: document.body.querySelectorAll('img').length,
});

describe('PostsArchive 폴백 ↔ 뷰', () => {
  test('URL 파라미터가 없으면 폴백과 뷰가 같은 화면을 그린다', () => {
    render(<PostsArchiveFallback {...props} />);
    const fallback = fingerprint();
    cleanup();

    renderView();

    expect(fingerprint()).toEqual(fallback);
  });

  test('폴백은 편수 h2와 최신 글을 피처로 세운 목록을 정적 HTML에 남기고 컨트롤은 inert다', () => {
    render(<PostsArchiveFallback {...props} />);

    expect(
      screen.getByRole('heading', { level: 2, name: '2편' }),
    ).toBeInTheDocument();
    expect(featureTitle()).toBe('b-post 제목');
    expect(items()).toHaveLength(POSTS.length);
    expect(featureCard()?.closest('li')).toBe(items()[0]);
    expect(fingerprint().thumbnails).toBe(POSTS.length);
    expect(searchbox().closest('[inert]')).not.toBeNull();
    expect(list().closest('[inert]')).toBeNull();
  });
});

describe('PostsArchive 피처 카드', () => {
  test.each([
    '?view=list',
    '?sort=shortest',
    '?series=s1',
    '?q=b',
    '?tag=react',
  ])('%s면 피처를 세우지 않는다', search => {
    renderView(search);

    expect(featureTitle()).toBeUndefined();
  });

  test('?view=list는 이미지 없는 행으로 그린다', () => {
    renderView('?view=list');

    expect(fingerprint().thumbnails).toBe(0);
    expect(items()).toHaveLength(2);
  });

  // 피처가 목록 밖에 있으면 기본 상태에서 목록이 한 편 적다 — 목록으로 건너뛴 낭독기가 듣는 항목 수와
  // h2가 갈린다.
  test.each([
    ['', 2],
    ['?view=list', 2],
    ['?sort=shortest', 2],
    ['?q=%20', 2],
    ['?series=s1', 1],
    ['?q=a-post', 1],
    ['?tag=react', 1],
  ])(
    '/posts/%s — "글 목록" 항목 수가 h2의 편수(%i)와 같다',
    (search, count) => {
      renderView(search);

      expect(
        screen.getByRole('heading', { level: 2, name: `${count}편` }),
      ).toBeInTheDocument();
      expect(items()).toHaveLength(count);
    },
  );

  test('피처는 "글 목록"의 첫 항목이다', () => {
    renderView();

    expect(featureCard()?.closest('li')).toBe(items()[0]);
    expect(titles()).toEqual(['b-post 제목', 'a-post 제목']);
  });

  test('공백만 친 검색어는 필터처럼 없는 것으로 보고 피처를 남긴다', () => {
    renderView('?q=%20');

    expect(featureTitle()).toBe('b-post 제목');
  });
});

describe('PostsArchive 인기순', () => {
  test('조회수가 오기 전에는 목록을 바쁨으로 숨기고, 오면 이 목록의 slug로 받은 조회수 순으로 그린다', async () => {
    const counts = deferredSource();
    renderView('?sort=popular', counts.source);

    expect(list()).toHaveAttribute('aria-busy', 'true');
    expect(counts.fetchRows).toHaveBeenCalledWith(POSTS.map(p => p.slug));

    await act(async () => {
      counts.resolve([
        { slug: 'a-post', view_count: 10 },
        { slug: 'b-post', view_count: 1 },
      ]);
      await Promise.resolve();
    });

    expect(titles()).toEqual(['a-post 제목', 'b-post 제목']);
    expect(list()).not.toHaveAttribute('aria-busy');
  });

  test('조회가 실패하면 재시도를 기다리지 않고 곧바로 최신순으로 보인다', async () => {
    const counts = deferredSource();
    renderView('?sort=popular', counts.source);

    await act(async () => {
      counts.reject(new Error('supabase down'));
      await Promise.resolve();
    });

    expect(list()).not.toHaveAttribute('aria-busy');
    expect(titles()).toEqual(['b-post 제목', 'a-post 제목']);
    expect(counts.fetchRows).toHaveBeenCalledTimes(1);
  });
});

describe('PostsArchive 검색', () => {
  test('글자마다 바로 거르고, URL은 SEARCH_COMMIT_MS 뒤에 한 번 쓴다', () => {
    vi.useFakeTimers();
    renderView();

    fireEvent.change(searchbox(), { target: { value: 'b' } });

    expect(titles()).toEqual(['b-post 제목']);
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS - 1);
    });
    expect(written()).toEqual([]);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(written()).toEqual(['/posts/?q=b']);
  });

  test('지우기는 바로 URL을 쓰고 초점을 입력창에 둔다', () => {
    renderView('?q=b-post');

    fireEvent.click(screen.getByRole('button', { name: '지우기' }));

    expect(written()).toEqual(['/posts/']);
    expect(searchbox()).toHaveFocus();
    expect(searchbox()).toHaveValue('');
  });

  test('밖에서 바뀐 URL(헤더의 글 링크)은 다시 읽는다', () => {
    const view = renderView('?q=b-post');

    view.rerenderAt('');

    expect(searchbox()).toHaveValue('');
  });

  test('뒤로 가기로 처음 URL에 돌아오면 그 값을 메아리로 오인하지 않고 다시 읽는다', () => {
    const view = renderView('?q=b-post');

    view.rerenderAt(''); // 헤더의 글 링크
    view.rerenderAt('?q=b-post'); // 뒤로 가기

    expect(searchbox()).toHaveValue('b-post');
    expect(titles()).toEqual(['b-post 제목']);
  });

  test('내가 쓴 URL이 뒤따라 와도(메아리) 그 사이 친 글자를 덮지 않는다', () => {
    vi.useFakeTimers();
    const view = renderView();

    fireEvent.change(searchbox(), { target: { value: 'ab' } });
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });
    fireEvent.change(searchbox(), { target: { value: 'abc' } });
    view.rerenderAt('?q=ab');

    expect(searchbox()).toHaveValue('abc');
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });
    expect(written()).toEqual(['/posts/?q=ab', '/posts/?q=abc']);
  });

  test('입력을 떠나면 미뤄 둔 쓰기를 바로 내고, 타이머는 더 쓰지 않는다', () => {
    vi.useFakeTimers();
    renderView();

    fireEvent.change(searchbox(), { target: { value: 'b' } });
    fireEvent.blur(searchbox());

    expect(written()).toEqual(['/posts/?q=b']);
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });
    expect(written()).toEqual(['/posts/?q=b']);
  });

  test('타자 직후 목록을 떠났으면 늦게 터진 쓰기가 이전 페이지 주소를 덮지 않는다', () => {
    vi.useFakeTimers();
    renderView();

    fireEvent.change(searchbox(), { target: { value: 'b' } });
    // 뒤로 가기 — 주소가 먼저 바뀐다(이 호출도 스파이에 남는다).
    window.history.replaceState(null, '', '/');
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });

    expect(written()).toEqual(['/']);
  });
});

describe('PostsArchive 결과 수 알림', () => {
  const status = () => screen.getByRole('status');

  test('처음엔 비어 있고, 검색어는 글자마다가 아니라 URL에 쓸 때 결과 수를 알린다', () => {
    vi.useFakeTimers();
    renderView();

    expect(status()).toHaveTextContent(/^$/);
    fireEvent.change(searchbox(), { target: { value: 'b' } });
    expect(status()).toHaveTextContent(/^$/);
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });

    expect(status()).toHaveTextContent(/^글 1편$/);
  });

  test('시리즈 칩·모두 지우기는 바로 알리고, 0편도 알린다', () => {
    renderView('?q=zzzz');

    fireEvent.click(screen.getByRole('radio', { name: '픽스처 연재 (1)' }));
    expect(status()).toHaveTextContent(/^글 0편$/);
    fireEvent.click(screen.getByRole('button', { name: '모두 지우기' }));

    expect(status()).toHaveTextContent(/^글 2편$/);
  });

  test('밖에서 바뀐 URL(헤더의 글 링크, 뒤로 가기)을 다시 읽으면 그 결과 수를 알린다', () => {
    const view = renderView('?q=b-post');

    expect(status()).toHaveTextContent(/^$/);
    view.rerenderAt(''); // 헤더의 글 링크
    expect(status()).toHaveTextContent(/^글 2편$/);
    view.rerenderAt('?q=b-post'); // 뒤로 가기

    expect(status()).toHaveTextContent(/^글 1편$/);
  });
});

describe('PostsArchive 컨트롤', () => {
  test('시리즈 칩은 정렬을 남긴 채 쓰고, 전체로 돌아가면 시리즈 키를 뺀다', () => {
    renderView('?sort=shortest');

    fireEvent.click(screen.getByRole('radio', { name: '픽스처 연재 (1)' }));
    fireEvent.click(screen.getByRole('radio', { name: '전체 (2)' }));

    expect(written()).toEqual([
      '/posts/?series=s1&sort=shortest',
      '/posts/?sort=shortest',
    ]);
  });

  test('정렬은 기본값이면 키를 빼고, 보기는 리스트면 view를 싣는다', () => {
    renderView();
    const sort = screen.getByRole('combobox', { name: '정렬' });

    fireEvent.change(sort, { target: { value: 'popular' } });
    fireEvent.change(sort, { target: { value: 'recent' } });
    fireEvent.click(screen.getByRole('radio', { name: '리스트' }));

    expect(written()).toEqual([
      '/posts/?sort=popular',
      '/posts/',
      '/posts/?view=list',
    ]);
  });

  test('태그를 풀면 다른 상태는 남기고 초점을 검색 입력으로 옮긴다', () => {
    renderView('?tag=react&q=b&sort=shortest&view=list');

    fireEvent.click(screen.getByRole('button', { name: '#react 필터 해제' }));

    expect(written()).toEqual(['/posts/?q=b&sort=shortest&view=list']);
    expect(searchbox()).toHaveFocus();
  });

  test('적용된 필터의 모두 지우기는 검색어·태그·시리즈만 지우고 초점을 검색 입력으로 옮긴다', () => {
    renderView('?tag=react&series=s1&q=b&sort=shortest&view=list');

    fireEvent.click(
      within(screen.getByRole('group', { name: '적용된 필터' })).getByRole(
        'button',
        { name: '모두 지우기' },
      ),
    );

    expect(written()).toEqual(['/posts/?sort=shortest&view=list']);
    expect(searchbox()).toHaveFocus();
  });

  test('검색어 쓰기를 기다리는 중에 모두 지우면 그 검색어가 되살아나지 않는다', () => {
    vi.useFakeTimers();
    renderView('?tag=react');

    fireEvent.change(searchbox(), { target: { value: 'x' } });
    fireEvent.click(
      within(screen.getByRole('group', { name: '적용된 필터' })).getByRole(
        'button',
        { name: '모두 지우기' },
      ),
    );
    act(() => {
      vi.advanceTimersByTime(SEARCH_COMMIT_MS);
    });

    expect(written()).toEqual(['/posts/']);
    expect(searchbox()).toHaveValue('');
  });

  test('맞는 글이 없으면 빈 상태를 그리고, 그 모두 지우기는 목록으로 돌아가 초점을 검색 입력에 둔다', () => {
    renderView('?q=zzzz');

    expect(screen.getByText('조건에 맞는 글이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: '글 목록' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '모두 지우기' }));

    expect(written()).toEqual(['/posts/']);
    expect(searchbox()).toHaveFocus();
  });
});
