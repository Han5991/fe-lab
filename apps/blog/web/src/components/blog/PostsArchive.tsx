'use client';

import { useMemo } from 'react';
import { useQueryState, parseAsString, parseAsStringLiteral } from 'nuqs';
import { css } from '@design-system/ui-lib/css';

import type { PostSummary } from '@/lib/posts';
import type { SeriesSummary, TagSummary } from '@/domain/post/aggregate';

import { Label } from './Label';
import { SearchBox } from './SearchBox';
import { SortRadio, type SortKey } from './SortRadio';
import { ViewToggle, type ViewMode } from './ViewToggle';
import { FilterGroup } from './FilterGroup';
import { ActiveFilters } from './ActiveFilters';
import { PostListRow } from './PostListRow';
import { PostGridCard } from './PostGridCard';

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
  const [tagParam, setTagParam] = useQueryState('tag', parseAsString.withDefault(''));
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
    parseAsStringLiteral(VIEW_KEYS).withDefault('list'),
  );

  const activeTags = tagParam ? tagParam.split(',').filter(Boolean) : [];

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
      sorted.sort(
        (a, b) => (a.excerpt?.length ?? 0) - (b.excerpt?.length ?? 0),
      );
    } else {
      sorted.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    }
    // popular는 별도 view 데이터가 없으므로 최신순과 같이 동작 (mock)
    return sorted;
  }, [posts, q, activeTags, seriesParam, yearParam, sort]);

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

  return (
    <div
      className={css({
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '240px 1fr' },
        gap: { base: '8', md: '12' },
      })}
    >
      <aside
        className={css({
          position: { md: 'sticky' },
          top: { md: '20' },
          alignSelf: { md: 'start' },
          maxH: { md: 'calc(100vh - 88px)' },
          overflowY: { md: 'auto' },
          display: 'flex',
          flexDir: 'column',
          gap: '7',
        })}
      >
        <SearchBox
          placeholder="검색…"
          showHotkey={false}
          onClick={() => {
            const el = document.getElementById('archive-search-input');
            el?.focus();
          }}
        />

        <input
          id="archive-search-input"
          type="search"
          value={q}
          onChange={e => setQ(e.target.value || null)}
          placeholder="검색…"
          className={css({
            display: 'none',
          })}
        />

        <SortRadio value={sort} onChange={v => setSort(v)} />
        <ViewToggle value={view} onChange={v => setView(v)} />

        {tagItems.length > 0 && (
          <FilterGroup
            label="태그"
            items={tagItems.slice(0, 12)}
            active={activeTags}
            onToggle={toggleTag}
            multi
          />
        )}

        {seriesItems.length > 0 && (
          <FilterGroup
            label="시리즈"
            items={seriesItems}
            active={seriesParam ? [seriesParam] : []}
            onToggle={id =>
              setSeriesParam(seriesParam === id ? null : id)
            }
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
      </aside>

      <div>
        <ArchiveSearchBar
          q={q}
          onChange={v => setQ(v || null)}
        />

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
                borderWidth: '1px',
                borderColor: 'ink.border',
                rounded: 'md',
                cursor: 'pointer',
                _hover: { borderColor: 'marker.600' },
                transition: 'border-color 0.15s',
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
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
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
              listStyle: 'none',
              p: 0,
              m: 0,
              borderTopWidth: '1px',
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
      mb: '4',
      borderWidth: '1px',
      borderColor: 'ink.border',
      rounded: 'lg',
      bg: 'paper.50',
      _focusWithin: { borderColor: 'ink.950' },
      transition: 'border-color 0.15s',
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
        flex: 1,
        bg: 'transparent',
        border: 'none',
        outline: 'none',
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
