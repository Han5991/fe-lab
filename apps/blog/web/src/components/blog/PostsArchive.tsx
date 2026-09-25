'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryStates, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useQuery } from '@tanstack/react-query';
import { css } from '@design-system/ui-lib/css';

import type { ArchiveFilters, PostSummary } from '@blog/content';
import type { SeriesSummary, TagSummary } from '@blog/content';
import {
  filterAndSortPostsByArchiveParams,
  parseTagParam,
} from '@blog/content';
import { getAllViewCounts } from '@/src/domain/analytics';
import { postPath } from '@blog/content';
import { fmtDate } from '@blog/content';

import { Label } from './Label';
import type { SortKey } from './SortRadio';
import type { ViewMode } from './ViewToggle';
import { ActiveFilters } from './ActiveFilters';
import { HiddenPostBadge } from './HiddenPostBadge';
import { PostGridCard } from './PostGridCard';
import { PopularRail } from './PopularRail';
import { PostsFilterSheet } from './PostsFilterSheet';
import { PostsFilterFab } from './PostsFilterFab';
import { PostsFilterPanel } from './PostsFilterPanel';
import { postRowItem, postRowLink, postRowMeta, postRowTitle } from './postRow';

interface PostsArchiveViewProps {
  posts: PostSummary[];
  series: SeriesSummary[];
  tags: TagSummary[];
  years: { year: string; count: number }[];
}

// `satisfies`로 각 컴포넌트의 타입에 묶어 둔다. 예전에는 useQueryState<SortKey>의
// 명시 제네릭이 이 역할을 했는데, useQueryStates는 파서에서 타입을 추론하므로
// 여기서 잡지 않으면 오타가 그대로 통과한다. 반대 방향(키 누락)은 아래
// onSortChange/onViewChange가 SortKey를 좁은 리터럴 유니온에 넣으면서 걸린다.
const SORT_KEYS = [
  'recent',
  'popular',
  'shortest',
] as const satisfies readonly SortKey[];
const VIEW_KEYS = ['list', 'cards'] as const satisfies readonly ViewMode[];

/**
 * URL에 값이 없을 때의 정렬·뷰. 파서의 `withDefault`와 정적 폴백
 * (`PostsArchiveFallback`)이 **같은 상수**를 읽는다 — 예전엔 폴백이 리스트를,
 * 클라이언트 기본값이 카드를 그려 매 첫 방문마다 하이드레이션 직후 목록이
 * 카드 그리드로 뒤바뀌었다.
 */
const DEFAULT_SORT = 'recent' satisfies SortKey;
const DEFAULT_VIEW = 'cards' satisfies ViewMode;

/** 아카이브 화면이 그리는 필터 상태 — URL에서 읽거나(뷰) 기본값으로 둔다(폴백). */
interface ArchiveState {
  q: string;
  activeTags: string[];
  series: string | null;
  year: string | null;
  sort: SortKey;
  view: ViewMode;
}

/** 필터 컨트롤이 부르는 동작. 폴백에서는 전부 아무것도 하지 않는다. */
interface ArchiveActions {
  setQuery: (q: string) => void;
  toggleTag: (tag: string) => void;
  toggleSeries: (id: string) => void;
  toggleYear: (id: string) => void;
  clearSeries: () => void;
  clearYear: () => void;
  clearAll: () => void;
  setSort: (v: SortKey) => void;
  setView: (v: ViewMode) => void;
}

/** 아카이브 목록(리스트 뷰) 한 행. */
export const ArchiveRow = ({ post }: { post: PostSummary }) => (
  <li className={postRowItem}>
    <Link href={postPath(post.slug)} className={postRowLink}>
      <h3 className={postRowTitle}>
        {post.title}
        <HiddenPostBadge post={post} />
      </h3>
      {/* 날짜가 없으면 태그 자체를 낸다 — fmtDate가 빈 문자열을 돌려주므로
          크래시는 없지만 내용 없는 span이 남는다(홈의 PostIndexRow와 같은 패턴). */}
      {post.date && <span className={postRowMeta}>{fmtDate(post.date)}</span>}
    </Link>
  </li>
);

export const PostsArchiveView = ({
  posts,
  series,
  tags,
  years,
}: PostsArchiveViewProps) => {
  // 아카이브의 URL 상태 6개는 한 덩어리로 움직인다(검색어·태그·시리즈·연도·정렬·뷰).
  // 파서 맵 하나로 묶으면 "이 화면의 URL 계약"이 한자리에 남고, clearAll처럼 여러
  // 개를 동시에 지우는 동작이 setParams 한 번으로 표현된다.
  //
  // `satisfies`의 Record 절반이 링크 쪽 계약과 잠근다 — 필터 링크를 만드는
  // `archivePath`(`@blog/content`의 ArchiveFilters: q·tag·series)가 내보내는
  // 쿼리 키는 전부 이 파서 맵에 있어야 읽힌다. 키 이름이 한쪽만 바뀌면 태그·
  // 시리즈 필터 링크가 경고 없이 빈 목록으로 떨어지는데, 예전엔 두 정의가
  // 독립이라 그 어긋남을 아무것도 잡지 않았다. year·sort·view는 이 화면만
  // 아는 상태라 링크 계약 밖이다(인덱스 시그니처 쪽이 받는다).
  const [
    { q, tag: tagParam, series: seriesParam, year: yearParam, sort, view },
    setParams,
  ] = useQueryStates({
    q: parseAsString.withDefault(''),
    tag: parseAsString.withDefault(''),
    series: parseAsString.withDefault(''),
    year: parseAsString.withDefault(''),
    sort: parseAsStringLiteral(SORT_KEYS).withDefault(DEFAULT_SORT),
    view: parseAsStringLiteral(VIEW_KEYS).withDefault(DEFAULT_VIEW),
  } satisfies Record<keyof Required<ArchiveFilters>, unknown> &
    Record<string, unknown>);

  // 인기순 정렬은 Supabase post_views 테이블 기반. 'popular'를 누르기 전까지는
  // 요청을 보내지 않습니다 (lazy). 5분 staleTime으로 재방문 시 캐시 사용.
  //
  // 조회수는 이 빌드에 실린 글의 slug로 **서버에서** 거른다(getAllViewCounts
  // 주석). post_views는 anon RPC로 아무 slug나 늘릴 수 있어서, 거르지 않으면
  // 가짜 slug가 응답 상한(1000행)을 채워 실제 글의 조회수가 잘려 나간다.
  // 거른 집합이 곧 응답이므로 slug 목록을 캐시 키에 싣는다.
  const slugs = posts.map(p => p.slug);
  const { data: viewCounts } = useQuery({
    queryKey: ['posts-view-counts', slugs],
    queryFn: async () => {
      const rows = await getAllViewCounts(slugs);
      const map = new Map<string, number>();
      for (const row of rows) {
        map.set(row.slug, row.view_count);
      }
      return map;
    },
    enabled: sort === 'popular',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const activeTags = parseTagParam(tagParam);

  // 핸들러들은 전부 JSX prop(`() => void` 자리)으로만 쓰인다. setParams의
  // promise는 아무도 기다리지 않으므로 void로 명시해 버린다(no-misused-promises).
  const actions: ArchiveActions = {
    setQuery: v => void setParams({ q: v || null }),
    toggleTag: tag => {
      const next = activeTags.includes(tag)
        ? activeTags.filter(t => t !== tag)
        : [...activeTags, tag];
      void setParams({ tag: next.length ? next.join(',') : null });
    },
    toggleSeries: id =>
      void setParams({ series: seriesParam === id ? null : id }),
    toggleYear: id => void setParams({ year: yearParam === id ? null : id }),
    clearSeries: () => void setParams({ series: null }),
    clearYear: () => void setParams({ year: null }),
    // 네 개를 한 번에 지운다. 개별 setter를 연달아 부르는 것과 URL 쓰기 횟수는
    // 같지만(nuqs가 전역 큐로 합친다), 무엇을 지우는지가 한 객체로 드러난다.
    clearAll: () =>
      void setParams({ q: null, tag: null, series: null, year: null }),
    setSort: v => void setParams({ sort: v }),
    setView: v => void setParams({ view: v }),
  };

  return (
    <PostsArchiveLayout
      posts={posts}
      series={series}
      tags={tags}
      years={years}
      viewCounts={viewCounts}
      state={{
        q,
        activeTags,
        series: seriesParam || null,
        year: yearParam || null,
        sort,
        view,
      }}
      actions={actions}
    />
  );
};

const noop = () => undefined;
const FALLBACK_ACTIONS: ArchiveActions = {
  setQuery: noop,
  toggleTag: noop,
  toggleSeries: noop,
  toggleYear: noop,
  clearSeries: noop,
  clearYear: noop,
  clearAll: noop,
  setSort: noop,
  setView: noop,
};
const FALLBACK_STATE: ArchiveState = {
  q: '',
  activeTags: [],
  series: null,
  year: null,
  sort: DEFAULT_SORT,
  view: DEFAULT_VIEW,
};

/**
 * `/posts/`의 정적 HTML.
 *
 * `PostsArchiveView`는 nuqs(useSearchParams)라 `output: 'export'`의 빌드 타임
 * 프리렌더에서 빠지고(BAILOUT_TO_CLIENT_SIDE_RENDERING), 정적 HTML에는 Suspense
 * 폴백만 구워진다. 그 폴백이 **URL 파라미터가 없을 때의 뷰와 같은 화면**이어야
 * 하이드레이션 때 목록이 바뀌지 않는다 — 그래서 별도 마크업이 아니라 같은
 * 레이아웃을 기본 상태로 그린다. 컨트롤은 하이드레이션 전까지 동작하지 않는다.
 */
export const PostsArchiveFallback = (props: PostsArchiveViewProps) => (
  <PostsArchiveLayout
    {...props}
    viewCounts={undefined}
    state={FALLBACK_STATE}
    actions={FALLBACK_ACTIONS}
  />
);

interface PostsArchiveLayoutProps extends PostsArchiveViewProps {
  viewCounts: Map<string, number> | undefined;
  state: ArchiveState;
  actions: ArchiveActions;
}

const PostsArchiveLayout = ({
  posts,
  series,
  tags,
  years,
  viewCounts,
  state,
  actions,
}: PostsArchiveLayoutProps) => {
  const {
    q,
    activeTags,
    series: seriesParam,
    year: yearParam,
    sort,
    view,
  } = state;
  const {
    setQuery,
    toggleTag,
    toggleSeries,
    toggleYear,
    clearSeries,
    clearYear,
    clearAll,
    setSort,
    setView,
  } = actions;
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = filterAndSortPostsByArchiveParams(posts, {
    q,
    tags: activeTags,
    series: seriesParam,
    year: yearParam,
    sort,
    viewCounts,
  });

  const seriesItems = series.map(s => ({
    id: s.id,
    label: s.title,
    count: s.count,
  }));
  const tagItems = tags.map(t => ({
    id: t.id,
    label: `#${t.id}`,
    count: t.count,
  }));
  const yearItems = years.map(y => ({
    id: y.year,
    label: y.year,
    count: y.count,
  }));

  // 활성 필터 합산 (FAB·시트 헤더의 N 뱃지 + 정렬도 기본값이 아니면 카운트)
  const activeCount =
    activeTags.length +
    (seriesParam ? 1 : 0) +
    (yearParam ? 1 : 0) +
    (sort !== DEFAULT_SORT ? 1 : 0) +
    (view !== DEFAULT_VIEW ? 1 : 0);

  return (
    // FAB·시트는 grid 자식으로 두면 fixed 포지션이라도 DOM상 grid item이 되어
    // 접근성/레이아웃 어색함이 있으므로, 둘은 grid 바깥의 sibling으로 분리합니다.
    <>
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: '[240px 1fr]' },
          gap: { base: '4', md: '12' },
        })}
      >
        <aside
          className={css({
            // 모바일에서는 사이드바를 숨기고 FAB+바텀시트로 필터 노출.
            display: { base: 'none', md: 'flex' },
            position: { md: 'sticky' },
            top: { md: '20' },
            alignSelf: { md: 'start' },
            maxH: { md: '[calc(100vh - 88px)]' },
            overflowY: { md: 'auto' },
            flexDir: 'column',
            gap: '7',
          })}
        >
          <ArchiveSearchBar q={q} onChange={setQuery} />
          <PostsFilterPanel
            sort={sort}
            onSortChange={setSort}
            view={view}
            onViewChange={setView}
            tagItems={tagItems}
            activeTags={activeTags}
            onToggleTag={toggleTag}
            seriesItems={seriesItems}
            activeSeries={seriesParam}
            onToggleSeries={toggleSeries}
            yearItems={yearItems}
            activeYear={yearParam}
            onToggleYear={toggleYear}
          />
          {/*
            홈에서 내려온 인기글 레일(Supabase 조회수 기반). 데스크톱은 사이드바
            하단, 모바일은 목록 아래에 같은 컴포넌트를 한 번씩 둡니다 — 위 검색창과
            동일한 패턴으로, 둘은 브레이크포인트상 배타적으로만 보이고 React Query
            캐시 키가 같아 요청은 한 번만 나갑니다.
          */}
          <div
            className={css({
              pt: '6',
              borderTopWidth: '[1px]',
              borderTopStyle: 'solid',
              borderColor: 'ink.border',
              // 레일은 조회 실패·순위 없음이면 아무것도 그리지 않는다 — 그때
              // 구분선과 여백만 남은 빈 띠가 되지 않게 래퍼째 접는다.
              _empty: { display: 'none' },
            })}
          >
            <PopularRail posts={posts} />
          </div>
        </aside>

        <div>
          {/* 모바일 전용 검색창. 데스크톱은 aside 안의 검색창을 그대로 사용. */}
          <div
            className={css({
              display: { base: 'block', md: 'none' },
              mb: '4',
            })}
          >
            <ArchiveSearchBar q={q} onChange={setQuery} />
          </div>

          <ActiveFilters
            tags={activeTags}
            seriesLabel={
              seriesParam === null
                ? null
                : (series.find(s => s.id === seriesParam)?.title ?? seriesParam)
            }
            year={yearParam}
            onRemoveTag={toggleTag}
            onClearSeries={clearSeries}
            onClearYear={clearYear}
            onClearAll={clearAll}
          />

          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              mb: '4',
            })}
          >
            {/* 아래 목록 카드/행 제목이 h3라, 이 라벨이 span이면 페이지 h1에서
                h3로 건너뛴다(axe heading-order). 목록의 섹션 헤딩으로 올린다. */}
            <Label as="h2" tone="meta">
              {filtered.length}편
            </Label>
          </div>

          {filtered.length === 0 ? (
            <div
              className={css({
                py: '20',
                textAlign: 'center',
                display: 'flex',
                flexDir: 'column',
                alignItems: 'center',
                gap: '3',
              })}
            >
              <p
                className={css({
                  fontSize: '[16px]',
                  fontWeight: 'semibold',
                  color: 'ink.950',
                })}
              >
                조건에 맞는 글이 없습니다.
              </p>
              <p
                className={css({
                  fontSize: '[13px]',
                  color: 'ink.600',
                })}
              >
                필터를 풀거나 다른 검색어로 시도해보세요.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className={css({
                  fontFamily: 'mono',
                  fontSize: '[12px]',
                  color: 'accent.600',
                  px: '[11px]',
                  py: '[5px]',
                  borderWidth: '[1px]',
                  borderStyle: 'solid',
                  borderColor: 'ink.border',
                  rounded: 'control',
                  cursor: 'pointer',
                  _hover: { borderColor: 'accent.500' },
                  transition: '[border-color 0.15s]',
                })}
              >
                모두 지우기
              </button>
            </div>
          ) : view === 'cards' ? (
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: {
                  base: '1fr',
                  sm: '[repeat(2, 1fr)]',
                  lg: '[repeat(3, 1fr)]',
                },
                gap: '6',
              })}
            >
              {/* 앞의 2개만 우선 로드하고 나머지는 lazy — 목록 전체를 한꺼번에 받으면
                  첫 화면 이미지가 대역폭을 뺏겨 LCP가 밀린다. loading/fetchPriority는
                  정적 속성이라 브레이크포인트별로 달리 줄 수 없는데, 그리드는 모바일
                  1열 / sm 2열 / lg 3열이다. 가장 좁은 화면에 맞춰 잡아야 "안 보이는
                  이미지를 high로 요청"하는 일이 없다. 나머지도 뷰포트에 들어오면
                  lazy가 곧바로 로드하므로 손해가 아니다. */}
              {filtered.map((p, i) => (
                <PostGridCard key={p.slug} post={p} priority={i < 2} />
              ))}
            </div>
          ) : (
            <ol className={css({ listStyleType: 'none', p: '0', m: '0' })}>
              {filtered.map(p => (
                <ArchiveRow key={p.slug} post={p} />
              ))}
            </ol>
          )}

          {/* 모바일 전용 인기글 레일 — 목록을 밀어내지 않도록 아래에 둔다. */}
          <div
            className={css({
              display: { base: 'block', md: 'none' },
              mt: '10',
              pt: '6',
              borderTopWidth: '[1px]',
              borderTopStyle: 'solid',
              borderColor: 'ink.border',
              // 데스크톱 래퍼와 같은 이유 — 레일이 비면 빈 띠를 남기지 않는다.
              _empty: { display: 'none' },
            })}
          >
            <PopularRail posts={posts} />
          </div>
        </div>
      </div>

      <PostsFilterFab
        onClick={() => setSheetOpen(true)}
        activeCount={activeCount}
      />
      <PostsFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onClearAll={clearAll}
        activeCount={activeCount}
      >
        <PostsFilterPanel
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
          tagItems={tagItems}
          activeTags={activeTags}
          onToggleTag={toggleTag}
          seriesItems={seriesItems}
          activeSeries={seriesParam}
          onToggleSeries={toggleSeries}
          yearItems={yearItems}
          activeYear={yearParam}
          onToggleYear={toggleYear}
        />
      </PostsFilterSheet>
    </>
  );
};

interface ArchiveSearchBarProps {
  q: string;
  onChange: (v: string) => void;
}

const ArchiveSearchBar = ({ q, onChange }: ArchiveSearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        px: '3',
        py: '2.5',
        borderWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
        rounded: 'control',
        bg: 'paper.100',
        _focusWithin: { borderColor: 'accent.500' },
        transition: '[border-color 0.15s]',
      })}
    >
      <span
        aria-hidden="true"
        className={css({
          fontFamily: 'mono',
          fontSize: '[12px]',
          color: 'ink.500',
          flexShrink: 0,
        })}
      >
        ⌕
      </span>
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={e => onChange(e.target.value)}
        // 검색 대상은 제목·요약(excerpt)·태그다(@blog/content의
        // filterAndSortPostsByArchiveParams). 예전 문구는 "본문"을 약속했다.
        placeholder="제목, 요약, 태그 검색…"
        aria-label="글 검색"
        className={css({
          flex: '1',
          bg: 'transparent',
          border: '[none]',
          outline: '[none]',
          fontSize: '[13px]',
          color: 'ink.950',
          fontFamily: 'sans',
          _placeholder: { color: 'ink.500' },
        })}
      />
      {q && (
        <button
          type="button"
          // 누르면 이 버튼은 q가 비면서 사라진다 — 초점이 <body>로 떨어지지
          // 않게 입력창으로 되돌린다.
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className={css({
            fontFamily: 'mono',
            fontSize: '[12px]',
            color: 'ink.500',
            flexShrink: 0,
            cursor: 'pointer',
            _hover: { color: 'ink.950' },
          })}
        >
          지우기
        </button>
      )}
    </div>
  );
};
