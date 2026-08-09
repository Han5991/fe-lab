'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryStates, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useQuery } from '@tanstack/react-query';
import { css } from '@design-system/ui-lib/css';

import type { PostSummary } from '@/domain/post';
import type { SeriesSummary, TagSummary } from '@/domain/post/aggregate';
import {
  filterAndSortPostsByArchiveParams,
  parseTagParam,
} from '@/domain/post/filtering';
import { getAllViewCounts } from '@/domain/analytics';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate } from '@/lib/format';

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

// 홈 글 목록과 같은 문법: 장식 없이 hairline 보더로만 구분하고
// 제목 좌측 / 날짜 우측(모노). 마지막 행에만 아래 보더를 더한다.
const rowItem = css({
  borderTopWidth: '[1px]',
  borderTopStyle: 'solid',
  borderColor: 'ink.border',
  _last: { borderBottomWidth: '[1px]', borderBottomStyle: 'solid' },
});

const rowLink = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '[16px]',
  py: '[12px]',
  px: '[2px]',
  _hover: { '& h3': { color: 'accent.600', textDecorationLine: 'underline' } },
});

/**
 * 아카이브 목록(리스트 뷰) 한 행.
 *
 * `/posts/`는 nuqs 때문에 빌드 타임 프리렌더에서 빠지므로, 정적 HTML에 남는
 * 폴백 목록(page.tsx)과 하이드레이션 후의 목록이 같은 컴포넌트를 써야
 * 화면이 바뀌지 않습니다. 그래서 여기서 export합니다.
 */
export const ArchiveRow = ({ post }: { post: PostSummary }) => (
  <li className={rowItem}>
    <Link href={`/posts/${encodePostSlug(post.slug)}/`} className={rowLink}>
      <h3
        className={css({
          minW: '0',
          fontSize: '[14px]',
          fontWeight: 'normal',
          lineHeight: 'snug',
          color: 'ink.950',
          transition: '[color 0.15s]',
        })}
      >
        {post.title}
        <HiddenPostBadge post={post} />
      </h3>
      {/* 날짜가 없으면 태그 자체를 낸다 — fmtDate가 빈 문자열을 돌려주므로
          크래시는 없지만 내용 없는 span이 남는다(홈의 PostIndexRow와 같은 패턴). */}
      {post.date && (
        <span
          className={css({
            fontFamily: 'mono',
            fontWeight: 'normal',
            fontSize: '[12px]',
            color: 'ink.500',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {fmtDate(post.date)}
        </span>
      )}
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
  const [
    { q, tag: tagParam, series: seriesParam, year: yearParam, sort, view },
    setParams,
  ] = useQueryStates({
    q: parseAsString.withDefault(''),
    tag: parseAsString.withDefault(''),
    series: parseAsString.withDefault(''),
    year: parseAsString.withDefault(''),
    sort: parseAsStringLiteral(SORT_KEYS).withDefault('recent'),
    view: parseAsStringLiteral(VIEW_KEYS).withDefault('cards'),
  });
  const [sheetOpen, setSheetOpen] = useState(false);

  // 인기순 정렬은 Supabase post_views 테이블 기반. 'popular'를 누르기 전까지는
  // 요청을 보내지 않습니다 (lazy). 5분 staleTime으로 재방문 시 캐시 사용.
  const { data: viewCounts } = useQuery({
    queryKey: ['posts-view-counts'],
    queryFn: async () => {
      const rows = await getAllViewCounts();
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

  const toggleTag = async (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    await setParams({ tag: next.length ? next.join(',') : null });
  };

  const toggleSeries = (id: string) =>
    setParams({ series: seriesParam === id ? null : id });

  const toggleYear = (id: string) =>
    setParams({ year: yearParam === id ? null : id });

  const filtered = filterAndSortPostsByArchiveParams(posts, {
    q,
    tags: activeTags,
    series: seriesParam || null,
    year: yearParam || null,
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

  // 네 개를 한 번에 지운다. 개별 setter를 연달아 부르는 것과 URL 쓰기 횟수는
  // 같지만(nuqs가 전역 큐로 합친다), 무엇을 지우는지가 한 객체로 드러나고
  // Promise.all 없이 하나의 promise만 기다리면 된다.
  const clearAll = async () => {
    await setParams({ q: null, tag: null, series: null, year: null });
  };

  // 활성 필터 합산 (FAB·시트 헤더의 N 뱃지 + 정렬도 기본값이 아니면 카운트)
  const activeCount =
    activeTags.length +
    (seriesParam ? 1 : 0) +
    (yearParam ? 1 : 0) +
    (sort !== 'recent' ? 1 : 0) +
    (view !== 'cards' ? 1 : 0);

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
          <ArchiveSearchBar q={q} onChange={v => setParams({ q: v || null })} />
          <PostsFilterPanel
            sort={sort}
            onSortChange={v => setParams({ sort: v })}
            view={view}
            onViewChange={v => setParams({ view: v })}
            tagItems={tagItems}
            activeTags={activeTags}
            onToggleTag={toggleTag}
            seriesItems={seriesItems}
            activeSeries={seriesParam || null}
            onToggleSeries={toggleSeries}
            yearItems={yearItems}
            activeYear={yearParam || null}
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
            <ArchiveSearchBar
              q={q}
              onChange={v => setParams({ q: v || null })}
            />
          </div>

          <ActiveFilters
            tags={activeTags}
            series={seriesParam || null}
            year={yearParam || null}
            onRemoveTag={toggleTag}
            onClearSeries={() => setParams({ series: null })}
            onClearYear={() => setParams({ year: null })}
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
          onSortChange={v => setParams({ sort: v })}
          view={view}
          onViewChange={v => setParams({ view: v })}
          tagItems={tagItems}
          activeTags={activeTags}
          onToggleTag={toggleTag}
          seriesItems={seriesItems}
          activeSeries={seriesParam || null}
          onToggleSeries={toggleSeries}
          yearItems={yearItems}
          activeYear={yearParam || null}
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

const ArchiveSearchBar = ({ q, onChange }: ArchiveSearchBarProps) => (
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
      type="search"
      value={q}
      onChange={e => onChange(e.target.value)}
      placeholder="제목, 본문, 태그 검색…"
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
        onClick={() => onChange('')}
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
