'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { Search } from 'lucide-react';
import { useQueryState, parseAsStringLiteral } from 'nuqs';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';

interface PostsFilterProps {
  posts: PostSummary[];
}

const filterGroupedEntries = (
  entries: [string, PostSummary[]][],
  query: string,
): [string, PostSummary[]][] => {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(
    ([name, items]) =>
      name.toLowerCase().includes(q) ||
      items.some(p => p.title.toLowerCase().includes(q)),
  );
};

const TAB_KEYS = ['all', 'series', 'tags'] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'series', label: '시리즈' },
  { key: 'tags', label: '태그' },
];

/* ─── Post Row ─── */
function PostRow({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'flex',
        flexDir: { base: 'column', md: 'row' },
        alignItems: { base: 'flex-start', md: 'baseline' },
        gap: { base: '1', md: '5' },
        py: '4',
        px: '6',
        mx: '-6',
        borderBottomWidth: '1px',
        borderColor: 'ink.border',
        transition: 'background 0.15s, box-shadow 0.15s',
        _hover: { bg: 'ink.50', boxShadow: 'accentLeft' },
      })}
    >
      {post.date && (
        <time
          dateTime={post.date}
          className={css({
            flexShrink: 0,
            minW: { md: '110px' },
            fontSize: 'xs',
            color: 'ink.500',
            letterSpacing: 'wide',
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {new Date(post.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: 'Asia/Seoul',
          })}
        </time>
      )}
      <div className={css({ flex: 1, minW: 0 })}>
        <h3
          className={css({
            fontSize: 'base',
            fontWeight: 'semibold',
            color: 'ink.950',
            mb: '1',
            lineClamp: 1,
          })}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p
            className={css({
              color: 'ink.500',
              fontSize: 'sm',
              lineClamp: 1,
            })}
          >
            {post.excerpt}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ─── Inline Search Bar ─── */
function InlineSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '2',
        px: '3',
        py: '2.5',
        mb: '2',
        borderWidth: '1px',
        borderColor: 'ink.border',
        rounded: 'lg',
        bg: 'ink.50',
        _focusWithin: { borderColor: 'accent.600', bg: 'ink.25' },
        transition: 'all 0.15s',
      })}
    >
      <Search size={14} className={css({ color: 'ink.500', flexShrink: 0 })} />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={css({
          flex: 1,
          bg: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: { base: '16px', md: 'sm' },
          color: 'ink.950',
          _placeholder: { color: 'ink.500' },
        })}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className={css({
            fontSize: 'xs',
            color: 'ink.500',
            _hover: { color: 'ink.950' },
            transition: 'color 0.15s',
            flexShrink: 0,
          })}
        >
          지우기
        </button>
      )}
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ message }: { message: string }) {
  return (
    <p
      className={css({
        py: '16',
        textAlign: 'center',
        color: 'ink.500',
        fontSize: 'sm',
      })}
    >
      {message}
    </p>
  );
}

/* ─── Group Header ─── */
function GroupHeader({ name, count, unit }: { name: string; count: number; unit: string }) {
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'baseline',
        gap: '3',
        mb: '1',
        pb: '3',
        borderBottomWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      <h2
        className={css({
          fontSize: 'sm',
          fontWeight: 'bold',
          color: 'ink.950',
          letterSpacing: 'tight',
        })}
      >
        {name}
      </h2>
      <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
        {count}{unit}
      </span>
    </div>
  );
}

/* ─── Main Component ─── */
export const PostsFilter = ({ posts }: PostsFilterProps) => {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsStringLiteral(TAB_KEYS).withDefault('all'),
  );
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });

  const handleTabChange = useCallback(
    (tab: TabKey) => Promise.all([setActiveTab(tab), setQuery('')]),
    [setActiveTab, setQuery],
  );

  const filteredAll = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q),
    );
  }, [posts, query]);

  const seriesGroups = useMemo(() => {
    const groups: Record<string, PostSummary[]> = {};
    for (const p of posts) {
      if (p.series) {
        if (!groups[p.series]) groups[p.series] = [];
        groups[p.series].push(p);
      }
    }
    const entries = Object.entries(groups).sort((a, b) => {
      const aDate = a[1][0]?.date || '';
      const bDate = b[1][0]?.date || '';
      return bDate.localeCompare(aDate);
    });
    return filterGroupedEntries(entries, query);
  }, [posts, query]);

  const tagGroups = useMemo(() => {
    const groups: Record<string, PostSummary[]> = {};
    for (const p of posts) {
      if (p.tags) {
        for (const tag of p.tags) {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(p);
        }
      }
    }
    const entries = Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length,
    );
    return filterGroupedEntries(entries, query);
  }, [posts, query]);

  return (
    <>
      {/* 탭 바 */}
      <div
        className={css({
          display: 'flex',
          gap: '0',
          mb: '6',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={css({
              px: { base: '4', md: '5' },
              py: '3',
              fontSize: 'sm',
              fontWeight: activeTab === tab.key ? 'semibold' : 'medium',
              color: activeTab === tab.key ? 'ink.950' : 'ink.500',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor:
                activeTab === tab.key ? 'accent.600' : 'transparent',
              bg: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key
                ? '2px solid token(colors.accent.600)'
                : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s',
              _hover: {
                color: activeTab === tab.key ? 'ink.950' : 'ink.700',
              },
            })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 전체 뷰 ─── */}
      {activeTab === 'all' && (
        <>
          <InlineSearch
            value={query}
            onChange={setQuery}
            placeholder="글 제목 또는 내용 검색..."
          />
          <div
            className={css({
              mt: '4',
              borderTopWidth: '1px',
              borderColor: 'ink.border',
            })}
          >
            {filteredAll.length === 0 ? (
              <EmptyState message="검색 결과가 없습니다." />
            ) : (
              filteredAll.map(post => <PostRow key={post.slug} post={post} />)
            )}
          </div>
        </>
      )}

      {/* ─── 시리즈 뷰 ─── */}
      {activeTab === 'series' && (
        <>
          <InlineSearch
            value={query}
            onChange={setQuery}
            placeholder="시리즈 또는 글 제목 검색..."
          />
          <div
            className={css({
              mt: '6',
              display: 'flex',
              flexDir: 'column',
              gap: '10',
            })}
          >
            {seriesGroups.length === 0 ? (
              <EmptyState message={query ? '검색 결과가 없습니다.' : '시리즈가 없습니다.'} />
            ) : (
              seriesGroups.map(([seriesName, seriesPosts]) => (
                <section key={seriesName}>
                  <GroupHeader name={seriesName} count={seriesPosts.length} unit="편" />
                  <div
                    className={css({
                      display: 'flex',
                      flexDir: 'column',
                    })}
                  >
                    {seriesPosts.map(post => (
                      <PostRow key={post.slug} post={post} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {/* ─── 태그 뷰 ─── */}
      {activeTab === 'tags' && (
        <>
          <InlineSearch
            value={query}
            onChange={setQuery}
            placeholder="태그 또는 글 제목 검색..."
          />
          <div
            className={css({
              mt: '6',
              display: 'flex',
              flexDir: 'column',
              gap: '10',
            })}
          >
            {tagGroups.length === 0 ? (
              <EmptyState message={query ? '검색 결과가 없습니다.' : '태그가 없습니다.'} />
            ) : (
              tagGroups.map(([tagName, tagPosts]) => (
                <section key={tagName}>
                  <GroupHeader name={`# ${tagName}`} count={tagPosts.length} unit="개" />
                  <div className={css({ display: 'flex', flexDir: 'column' })}>
                    {tagPosts.map(post => (
                      <PostRow key={post.slug} post={post} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </>
      )}
    </>
  );
};
