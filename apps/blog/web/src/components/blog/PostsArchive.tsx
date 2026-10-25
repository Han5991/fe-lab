'use client';

import {
  addTransitionType,
  startTransition,
  useEffect,
  useRef,
  useState,
  ViewTransition,
  type Ref,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { css } from '@blog/styled-system/css';
import {
  filterAndSortPostsByArchiveParams,
  type ArchiveSortKey,
  type PostSummary,
} from '@blog/content/client';

import { actionButton } from '@/src/components/actionButton';
import {
  ARCHIVE_FILTER_TRANSITION_TYPE,
  ARCHIVE_LIST_SWAP,
} from '@/src/shared/viewTransitions';
import {
  usePopularViewCounts,
  viewCountsSource as appViewCountsSource,
  type ViewCountsSource,
} from '@/src/hooks/usePopularViewCounts';
import { ActiveFilters } from './ActiveFilters';
import { ArchiveSearchBox } from './ArchiveSearchBox';
import { PostCard } from './PostCard';
import { PostListRow } from './PostListRow';
import { SeriesChips } from './SeriesChips';
import { SortSelect } from './SortSelect';
import { ViewToggle } from './ViewToggle';
import {
  DEFAULT_ARCHIVE_STATE,
  DEFAULT_SORT,
  SEARCH_COMMIT_MS,
  archiveHref,
  isArchiveLocation,
  readArchiveParams,
  type ArchiveSeries,
  type ArchiveState,
  type ViewMode,
} from './archiveParams';

interface PostsArchiveProps {
  posts: PostSummary[];
  series: ArchiveSeries[];
}

interface PostsArchiveViewProps extends PostsArchiveProps {
  /** 인기순 조회수의 출처 — 테스트 이음새. 페이지는 넘기지 않는다(앱 싱글턴). */
  viewCountsSource?: ViewCountsSource;
}

/** 컨트롤이 부르는 동작. 폴백에서는 전부 아무것도 하지 않는다. */
interface ArchiveActions {
  search: (q: string) => void;
  commitSearch: () => void;
  clearSearch: () => void;
  selectSeries: (id: string | null) => void;
  selectSort: (sort: ArchiveSortKey) => void;
  selectView: (view: ViewMode) => void;
  removeTag: (tag: string) => void;
  clearAll: () => void;
}

/**
 * 글 목록 — URL 쿼리(`archiveParams.ts`)를 읽어 그리고, 컨트롤이 바꾼 상태를 URL에 다시 쓴다.
 *
 * **화면의 진실은 로컬 상태이고 URL은 그 뒤를 따라 쓴다.** `useSearchParams`를 그대로 컨트롤의 값으로
 * 쓰면 안 된다 — Next는 `history.replaceState`를 라우터에 transition으로 반영하는데, React는 change
 * 핸들러가 끝나면 제어 입력을 지금 props 값으로 되돌린다. 그래서 transition이 커밋될 때까지 칩·select가
 * 옛 값으로 돌아가 있고, 검색창은 그 사이 친 글자를 잃는다. 로컬 상태는 urgent 갱신이라 되돌림 전에
 * 커밋되고, 목록도 글자마다 바로 걸러진다.
 *
 * URL은 `history.replaceState`로 쓴다 — Next가 라우터·`useSearchParams`에 동기화하고(네이티브 히스토리
 * API 통합), 내비게이션이 아니라 페이지 전환·RSC 요청·스크롤이 없으며, 필터 단계가 뒤로 가기 기록에
 * 쌓이지 않는다.
 *
 * URL이 바뀌어 오면 렌더 중에 비교한다: 내가 마지막으로 쓴 값이면(메아리) 로컬을 건드리지 않고 — 그
 * 사이 더 친 글자가 남는다 — 아니면(헤더의 '글' 링크로 같은 페이지, 뒤로·앞으로 가기) 로컬을 URL에서
 * 다시 읽는다. 비교는 정규화한 href로 한다.
 */
export const PostsArchiveView = ({
  posts,
  series,
  viewCountsSource = appViewCountsSource,
}: PostsArchiveViewProps) => {
  const params = useSearchParams();
  const fromUrl = readArchiveParams(
    params,
    series.map(s => s.id),
  );
  const urlHref = archiveHref(fromUrl);
  const [state, setState] = useState(fromUrl);
  // 목록이 그리는 상태 — 컨트롤 값(`state`)은 urgent로 먼저 커밋하고, 목록만 type을 단 transition으로 따라간다.
  const [listState, setListState] = useState(fromUrl);

  // 거른 결과 수의 상태 메시지(WCAG 4.1.3) — 목록을 바꾸는 URL 쓰기와, 밖에서 바뀐 URL을 다시 읽을 때
  // 바꾼다. 글자마다 바꾸면 읽기가 타자를 따라가지 못하고, 처음 그릴 때는 비워 둬 페이지를 열자마자 읽지
  // 않는다.
  const [announcement, setAnnouncement] = useState('');
  const announce = (next: ArchiveState) =>
    setAnnouncement(
      `글 ${filterAndSortPostsByArchiveParams(posts, next).length}편`,
    );

  const [sync, setSync] = useState({ seen: urlHref, written: urlHref });
  if (urlHref !== sync.seen) {
    if (urlHref !== sync.written) {
      setState(fromUrl);
      setListState(fromUrl);
      // 뒤로·앞으로 가기나 헤더의 '글' 링크도 사용자가 목록을 바꾼 동작이다 — 쓸 때와 같이 알린다.
      announce(fromUrl);
    }
    // 밖에서 바뀌었으면 마지막으로 쓴 값도 지금 URL로 맞춘다 — 그대로 두면 뒤로 가기로 그 값에 돌아왔을
    // 때 메아리로 오인해 다시 읽지 않는다.
    setSync({ seen: urlHref, written: urlHref });
  }

  // 검색어의 URL 쓰기만 늦춘다(SEARCH_COMMIT_MS). ref는 핸들러와 정리에서만 읽는다.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const { counts, pending } = usePopularViewCounts(
    posts,
    listState.sort === 'popular',
    viewCountsSource,
  );

  /** URL에 쓴다. 모든 쓰기는 미뤄 둔 검색어 쓰기를 지운다 — 쓰는 상태에 그 검색어가 이미 들어 있다. */
  const write = (next: ArchiveState) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = undefined;
    // 타자 직후 뒤로 가기를 누르면 이 화면이 내려가기 전에 타이머가 터질 수 있다 — 그때 주소는 이미
    // 이전 페이지의 기록 항목이라 거기에 목록 쿼리를 덮어쓰지 않는다.
    if (!isArchiveLocation(window.location.pathname)) return;
    const href = archiveHref(next);
    setSync(s => ({ ...s, written: href }));
    announce(next);
    window.history.replaceState(null, '', href);
  };
  // 칩·정렬·보기·필터 해제는 type을 단 transition이다 — 목록의 `<ViewTransition>`이 이 type에서만 이전
  // 목록을 걷고 새 목록을 띄운다(`ARCHIVE_LIST_SWAP`). 검색어(`actions.search`)는 일부러 urgent 갱신이다:
  // 글자마다 목록이 교차하지 않고, 입력도 되돌려지지 않는다. 페이지 경계는 `default="none"`이라 같은
  // transition에서도 돌지 않는다.
  const apply = (patch: Partial<ArchiveState>) => {
    const next = { ...state, ...patch };
    // 컨트롤 값은 urgent다 — transition에 넣으면 change 핸들러가 끝날 때 제어 입력이 옛 props 값으로
    // 되돌려져 transition이 커밋될 때까지 칩·select가 눌리지 않은 것처럼 보인다.
    setState(next);
    startTransition(() => {
      addTransitionType(ARCHIVE_FILTER_TRANSITION_TYPE);
      setListState(next);
    });
    write(next);
  };
  // 누른 버튼이 사라지는 동작(지우기·필터 해제) 뒤에는 초점이 <body>로 떨어지지 않게 검색 입력으로 옮긴다.
  const focusSearch = () => searchInput.current?.focus();

  const actions: ArchiveActions = {
    search: q => {
      const next = { ...state, q };
      setState(next);
      setListState(next);
      clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => write(next), SEARCH_COMMIT_MS);
    },
    // 입력을 떠나면 미뤄 둔 쓰기를 바로 낸다. 링크를 누르면 pointerdown의 blur가 먼저 나서, 늦게 터진
    // 쓰기가 진행 중인 링크 이동을 버리지 않는다(Next는 대기 중인 이동 뒤에 온 restore에 이동을 버린다).
    commitSearch: () => {
      if (searchTimer.current !== undefined) write(state);
    },
    clearSearch: () => {
      apply({ q: '' });
      focusSearch();
    },
    selectSeries: id => apply({ series: id }),
    selectSort: sort => apply({ sort }),
    selectView: view => apply({ view }),
    removeTag: tag => {
      apply({ tags: state.tags.filter(t => t !== tag) });
      focusSearch();
    },
    clearAll: () => {
      apply({ q: '', tags: [], series: null });
      focusSearch();
    },
  };

  return (
    <>
      <PostsArchiveLayout
        posts={posts}
        series={series}
        state={state}
        listState={listState}
        viewCounts={counts}
        pending={pending}
        actions={actions}
        searchInputRef={searchInput}
        controlsInert={false}
      />
      <p role="status" className={visuallyHidden}>
        {announcement}
      </p>
    </>
  );
};

const visuallyHidden = css({ srOnly: true });

const noop = () => undefined;
const FALLBACK_ACTIONS: ArchiveActions = {
  search: noop,
  commitSearch: noop,
  clearSearch: noop,
  selectSeries: noop,
  selectSort: noop,
  selectView: noop,
  removeTag: noop,
  clearAll: noop,
};

/**
 * `/posts/`의 정적 HTML — 뷰는 `useSearchParams` 때문에 프리렌더에서 빠진다. 같은 레이아웃을 기본
 * 상태로 그려 하이드레이션 때 목록이 바뀌지 않게 한다. 컨트롤 묶음은 `inert`다 — 하이드레이션 전에
 * 네이티브 radio·select를 누르면 바뀌어 보였다가 되돌아가므로, 그때까지는 눌리지도 초점을 받지도 않는다.
 * 목록·링크는 inert가 아니다(정적 HTML의 글 링크를 check-seo가 센다).
 */
export const PostsArchiveFallback = ({ posts, series }: PostsArchiveProps) => (
  <PostsArchiveLayout
    posts={posts}
    series={series}
    state={DEFAULT_ARCHIVE_STATE}
    listState={DEFAULT_ARCHIVE_STATE}
    viewCounts={undefined}
    pending={false}
    actions={FALLBACK_ACTIONS}
    searchInputRef={null}
    controlsInert
  />
);

const controls = css({ display: 'flex', flexDir: 'column', gap: '4' });

const toolbar = css({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '3',
  pt: '3',
  borderTopWidth: 'hairline',
  borderTopStyle: 'solid',
  borderColor: 'ink.border',
});

const toolbarEnd = css({ display: 'flex', alignItems: 'center', gap: '2' });

const countHeading = css({ textStyle: 'supporting', color: 'ink.700' });

// 인기순 조회수가 오기 전에는 목록을 자리만 잡아 숨긴다(`aria-busy` → `_loading`) — 최신순으로 그렸다가
// 재배열하면 목록 전체가 움직인다. 숨긴 노드의 재배열은 레이아웃 이동이 아니다.
const gridList = css({
  listStyleType: 'none',
  p: '0',
  m: '0',
  display: 'grid',
  // 칼럼 폭이 열 수를 정한다 — 752 칼럼에서 2열, 칸이 320보다 좁아지면 1열(Astryx BlogIndex).
  gridTemplateColumns: '[repeat(auto-fill, minmax(min(320px, 100%), 1fr))]',
  columnGap: '5',
  rowGap: '10',
  _loading: { visibility: 'hidden' },
});

// 피처는 목록의 첫 항목으로 한 줄을 다 쓴다 — 그 아래 카드 줄과의 간격은 그리드의 rowGap(40)이라 페이지
// 칼럼의 gap(40)으로 떨어져 있던 때와 같다.
const featureItem = css({ gridColumn: '1 / -1' });

const rowList = css({
  listStyleType: 'none',
  p: '0',
  m: '0',
  _loading: { visibility: 'hidden' },
});

const empty = css({
  display: 'flex',
  flexDir: 'column',
  alignItems: 'center',
  gap: '3',
  py: '20',
  textAlign: 'center',
});

interface PostsArchiveLayoutProps extends PostsArchiveProps {
  /** 컨트롤이 보이는 값 */
  state: ArchiveState;
  /** 목록이 그리는 값 — 필터 transition에서만 `state`보다 늦게 따라온다 */
  listState: ArchiveState;
  viewCounts: Map<string, number> | undefined;
  /** 인기순 조회수를 기다리는 중 — 목록을 자리만 잡아 숨긴다 */
  pending: boolean;
  actions: ArchiveActions;
  searchInputRef: Ref<HTMLInputElement>;
  /** 하이드레이션 전(폴백) — 컨트롤 묶음을 inert로 */
  controlsInert: boolean;
}

/**
 * 컨트롤 묶음(검색·시리즈 칩·툴바·적용된 필터) 다음에 목록이 온다. Fragment라 이 형제들이 페이지
 * 칼럼(flex col)의 항목이 된다.
 */
const PostsArchiveLayout = ({
  posts,
  series,
  state,
  listState,
  viewCounts,
  pending,
  actions,
  searchInputRef,
  controlsInert,
}: PostsArchiveLayoutProps) => {
  const filtered = filterAndSortPostsByArchiveParams(posts, {
    q: listState.q,
    tags: listState.tags,
    series: listState.series,
    sort: listState.sort,
    viewCounts,
  });

  // 피처 카드는 아무것도 거르지 않은 최신순 카드 보기에서만 맨 앞 글을 크게 세운다. 검색어 공백 처리는
  // 필터와 같다 — 공백만 친 검색어가 피처만 내리는 점프를 막는다. 피처는 "글 목록"의 첫 항목이다 —
  // 목록 밖에 두면 목록 항목 수가 h2의 "N편"보다 하나 적고, 목록으로 건너뛴 낭독기 사용자가 최신 글을
  // 놓친다. 글마다 카드가 하나라 공유 요소 이름이 겹치지 않는다(겹치면 전환이 통째로 빠진다).
  const showFeature =
    listState.view === 'cards' &&
    listState.sort === DEFAULT_SORT &&
    listState.q.trim() === '' &&
    listState.tags.length === 0 &&
    listState.series === null;

  return (
    <>
      <div inert={controlsInert} className={controls}>
        <ArchiveSearchBox
          value={state.q}
          onChange={actions.search}
          onClear={actions.clearSearch}
          onBlur={actions.commitSearch}
          inputRef={searchInputRef}
        />
        <SeriesChips
          series={series}
          total={posts.length}
          value={state.series}
          onChange={actions.selectSeries}
        />
        <div className={toolbar}>
          {/* 목록의 섹션 헤딩 — 카드·행 제목(h3) 위의 h2다(axe heading-order). */}
          <h2 className={countHeading}>{filtered.length}편</h2>
          <div className={toolbarEnd}>
            <SortSelect value={state.sort} onChange={actions.selectSort} />
            <ViewToggle value={state.view} onChange={actions.selectView} />
          </div>
        </div>
        <ActiveFilters
          tags={state.tags}
          onRemoveTag={actions.removeTag}
          onClearAll={actions.clearAll}
        />
      </div>

      {/* 목록 경계 — 필터 transition에서만 교차한다. 0편 빈 상태와 카드·행 목록이 같은 경계 안에서 서로
          바뀌고, 피처 카드가 생기고 사라지는 것도 이 안이다. 래퍼 하나라 페이지 칼럼의 항목 수는 그대로다. */}
      <ViewTransition update={ARCHIVE_LIST_SWAP} default="none">
        <div>
          {filtered.length === 0 ? (
            <div className={empty}>
              <p className={css({ textStyle: 'h3' })}>
                조건에 맞는 글이 없습니다.
              </p>
              <p className={css({ textStyle: 'body', color: 'ink.700' })}>
                필터를 풀거나 다른 검색어로 시도해보세요.
              </p>
              <button
                type="button"
                onClick={actions.clearAll}
                className={actionButton({ tone: 'ghost', size: 'md' })}
              >
                모두 지우기
              </button>
            </div>
          ) : listState.view === 'cards' ? (
            <ol
              aria-label="글 목록"
              aria-busy={pending || undefined}
              className={gridList}
            >
              {filtered.map((post, index) => {
                const isFeature = showFeature && index === 0;
                return (
                  <li
                    key={post.slug}
                    className={isFeature ? featureItem : undefined}
                  >
                    {/* 첫 화면의 가장 큰 이미지 하나만 우선 받는다 — 피처가 있으면 피처, 없으면 그리드 첫 카드. */}
                    <PostCard
                      post={post}
                      variant={isFeature ? 'feature' : 'grid'}
                      priority={index === 0}
                    />
                  </li>
                );
              })}
            </ol>
          ) : (
            <ol
              aria-label="글 목록"
              aria-busy={pending || undefined}
              className={rowList}
            >
              {filtered.map(post => (
                <PostListRow key={post.slug} post={post} />
              ))}
            </ol>
          )}
        </div>
      </ViewTransition>
    </>
  );
};
