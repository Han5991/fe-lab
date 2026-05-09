'use client';

import { useMemo, useState } from 'react';
import { useQueryState, parseAsString, parseAsStringLiteral } from 'nuqs';
import { useQuery } from '@tanstack/react-query';
import { css } from '@design-system/ui-lib/css';

import type { PostSummary } from '@/domain/post';
import type { SeriesSummary, TagSummary } from '@/domain/post/aggregate';
import { client } from '@/lib/client';

import { Label } from './Label';
import { SortRadio, type SortKey } from './SortRadio';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { FilterGroup } from './FilterGroup';
import { ActiveFilters } from './ActiveFilters';
import { PostListRow } from './PostListRow';
import { PostGridCard } from './PostGridCard';
import { PostsFilterSheet } from './PostsFilterSheet';
import { PostsFilterFab } from './PostsFilterFab';

interface PostsArchiveViewProps {
  posts: PostSummary[];
  series: SeriesSummary[];
  tags: TagSummary[];
  years: { year: string; count: number }[];
}

const SORT_KEYS = ['recent', 'popular', 'shortest'] as const;
const VIEW_KEYS = ['list', 'cards'] as const;

export const PostsArchiveView = ({
  posts,
  series,
  tags,
  years,
}: PostsArchiveViewProps) => {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''));
  const [tagParam, setTagParam] = useQueryState(
    'tag',
    parseAsString.withDefault(''),
  );
  const [seriesParam, setSeriesParam] = useQueryState(
    'series',
    parseAsString.withDefault(''),
  );
  const [yearParam, setYearParam] = useQueryState(
    'year',
    parseAsString.withDefault(''),
  );
  const [sort, setSort] = useQueryState<SortKey>(
    'sort',
    parseAsStringLiteral(SORT_KEYS).withDefault('recent'),
  );
  const [view, setView] = useQueryState<ViewMode>(
    'view',
    parseAsStringLiteral(VIEW_KEYS).withDefault('cards'),
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // 인기순 정렬은 Supabase post_views 테이블 기반. 'popular'를 누르기 전까지는
  // 요청을 보내지 않습니다 (lazy). 5분 staleTime으로 재방문 시 캐시 사용.
  const { data: viewCounts } = useQuery({
    queryKey: ['posts-view-counts'],
    queryFn: async () => {
      const { data } = await client
        .from('post_views')
        .select('slug, view_count');
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        map.set(row.slug, row.view_count ?? 0);
      }
      return map;
    },
    enabled: sort === 'popular',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // tagParam을 매 렌더 새 배열로 split하면 useMemo dep가 늘 무효화됩니다.
  // tagParam(string) 자체를 dep으로 두고, activeTags는 tagParam 변경 시에만 새로 만듭니다.
  const activeTags = useMemo(
    () => (tagParam ? tagParam.split(',').filter(Boolean) : []),
    [tagParam],
  );

  const toggleTag = (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    setTagParam(next.length ? next.join(',') : null);
  };

  const filtered = useMemo(() => {
    let r = posts;
    const query = q.trim().toLowerCase();
    if (query) {
      r = r.filter(
        p =>
          p.title.toLowerCase().includes(query) ||
          (p.excerpt ?? '').toLowerCase().includes(query) ||
          (p.tags ?? []).some(t => t.toLowerCase().includes(query)),
      );
    }
    if (activeTags.length) {
      r = r.filter(p => activeTags.every(t => (p.tags ?? []).includes(t)));
    }
    if (seriesParam) {
      r = r.filter(p => p.series === seriesParam);
    }
    if (yearParam) {
      r = r.filter(p => p.date?.startsWith(yearParam));
    }
    const sorted = [...r];
    if (sort === 'shortest') {
      // 본문 분량 기반(readMin). excerpt는 자동 생성 시 160자로 잘려 동률이라
      // 상위 몇 개만 움직이는 것처럼 보였습니다.
      sorted.sort((a, b) => a.readMin - b.readMin);
    } else if (sort === 'popular') {
      // post_views가 도착하기 전엔 최신순으로 보여주고, 도착하면 view_count로.
      const counts = viewCounts;
      sorted.sort((a, b) => {
        const va = counts?.get(a.slug) ?? 0;
        const vb = counts?.get(b.slug) ?? 0;
        if (vb !== va) return vb - va;
        return (b.date ?? '').localeCompare(a.date ?? '');
      });
    } else {
      sorted.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    }
    return sorted;
  }, [posts, q, activeTags, seriesParam, yearParam, sort, viewCounts]);

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

  const clearAll = () => {
    setQ(null);
    setTagParam(null);
    setSeriesParam(null);
    setYearParam(null);
  };

  // 모바일 시트와 데스크톱 사이드바에서 동일하게 쓰이는 필터 컨트롤 블록.
  const filterControls = (
    <>
      <SortRadio value={sort} onChange={v => setSort(v)} />
      <ViewToggle value={view} onChange={v => setView(v)} />

      {tagItems.length > 0 && (
        <FilterGroup
          label="태그"
          items={tagItems.slice(0, 12)}
          active={activeTags}
          onToggle={toggleTag}
        />
      )}

      {seriesItems.length > 0 && (
        <FilterGroup
          label="시리즈"
          items={seriesItems}
          active={seriesParam ? [seriesParam] : []}
          onToggle={id => setSeriesParam(seriesParam === id ? null : id)}
        />
      )}

      {yearItems.length > 0 && (
        <FilterGroup
          label="연도"
          items={yearItems}
          active={yearParam ? [yearParam] : []}
          onToggle={id => setYearParam(yearParam === id ? null : id)}
        />
      )}
    </>
  );

  // 활성 필터 합산 (FAB·시트 헤더의 N 뱃지 + 정렬도 기본값이 아니면 카운트)
  const activeCount =
    activeTags.length +
    (seriesParam ? 1 : 0) +
    (yearParam ? 1 : 0) +
    (sort !== 'recent' ? 1 : 0) +
    (view !== 'cards' ? 1 : 0);

  return (
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
        <ArchiveSearchBar q={q} onChange={v => setQ(v || null)} />
        {filterControls}
      </aside>

      <div>
        {/* 모바일 전용 검색창. 데스크톱은 aside 안의 검색창을 그대로 사용. */}
        <div
          className={css({
            display: { base: 'block', md: 'none' },
            mb: '4',
          })}
        >
          <ArchiveSearchBar q={q} onChange={v => setQ(v || null)} />
        </div>

        <ActiveFilters
          tags={activeTags}
          series={seriesParam || null}
          year={yearParam || null}
          onRemoveTag={toggleTag}
          onClearSeries={() => setSeriesParam(null)}
          onClearYear={() => setYearParam(null)}
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
          <Label tone="meta">{filtered.length}편</Label>
        </div>

        {filtered.length === 0 ? (
          <div
            className={css({
              py: '24',
              textAlign: 'center',
              display: 'flex',
              flexDir: 'column',
              alignItems: 'center',
              gap: '4',
            })}
          >
            <p
              className={css({
                fontFamily: 'serif',
                fontStyle: 'italic',
                fontSize: 'lg',
                color: 'ink.700',
              })}
            >
              매칭되는 노트가 없어요.
            </p>
            <p
              className={css({
                fontFamily: 'sans',
                fontSize: 'sm',
                color: 'ink.500',
              })}
            >
              필터를 풀거나 다른 검색어로 시도해보세요.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className={css({
                fontFamily: 'mono',
                fontSize: 'xs',
                color: 'marker.600',
                px: '3',
                py: '2',
                borderWidth: '[1px]',
                borderColor: 'ink.border',
                rounded: 'md',
                cursor: 'pointer',
                _hover: { borderColor: 'marker.600' },
                transition: '[border-color 0.15s]',
              })}
            >
              ✕ 모두 지우기
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
            {filtered.map(p => (
              <PostGridCard key={p.slug} post={p} />
            ))}
          </div>
        ) : (
          <ol
            className={css({
              listStyleType: 'none',
              p: '0',
              m: '0',
              borderTopWidth: '[1px]',
              borderColor: 'ink.border',
            })}
          >
            {filtered.map(p => (
              <li key={p.slug}>
                <PostListRow post={p} />
              </li>
            ))}
          </ol>
        )}
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
        {filterControls}
      </PostsFilterSheet>
    </div>
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
      borderColor: 'ink.border',
      rounded: 'lg',
      bg: 'paper.50',
      _focusWithin: { borderColor: 'ink.950' },
      transition: '[border-color 0.15s]',
    })}
  >
    <span
      aria-hidden="true"
      className={css({
        fontFamily: 'mono',
        fontSize: 'xs',
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
      className={css({
        flex: '1',
        bg: 'transparent',
        border: '[none]',
        outline: '[none]',
        fontSize: 'sm',
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
          fontSize: '2xs',
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
