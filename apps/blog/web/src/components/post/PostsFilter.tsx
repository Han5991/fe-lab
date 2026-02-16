'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { Search } from 'lucide-react';

interface PostItem {
    slug: string;
    title: string;
    date: string | null;
    excerpt: string;
    tags?: string[];
    series?: string;
}

interface PostsFilterProps {
    posts: PostItem[];
    allTags: string[];
    allSeries: string[];
}

type TabKey = 'all' | 'series' | 'tags';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'series', label: '시리즈' },
    { key: 'tags', label: '태그' },
];

/* ─── Post Card ─── */
function PostCard({ post }: { post: PostItem }) {
    return (
        <article className="group">
            <Link href={`/posts/${post.slug}`} className={css({ display: 'block' })}>
                <div className={css({ mb: '2', display: 'flex', alignItems: 'center', gap: '2', flexWrap: 'wrap' })}>
                    {post.date && (
                        <time dateTime={post.date} className={css({ fontSize: 'sm', color: 'gray.400' })}>
                            {new Date(post.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </time>
                    )}
                </div>
                <h3
                    className={css({
                        fontSize: { base: 'lg', md: 'xl' }, fontWeight: 'bold', color: 'gray.900',
                        mb: '2', transition: 'color 0.2s', _groupHover: { color: 'blue.600' },
                    })}
                >
                    {post.title}
                </h3>
                <p
                    className={css({
                        color: 'gray.600', lineHeight: 'relaxed',
                        lineClamp: 2, overflow: 'hidden', fontSize: { base: 'sm', md: 'md' },
                    })}
                >
                    {post.excerpt}
                </p>
            </Link>
        </article>
    );
}

/* ─── Inline Search Bar ─── */
function InlineSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
    return (
        <div
            className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
                px: '3',
                py: '2',
                mb: '6',
                borderWidth: '1px',
                borderColor: 'gray.200',
                borderRadius: 'lg',
                _focusWithin: { borderColor: 'gray.400' },
                transition: 'border-color 0.15s',
            })}
        >
            <Search size={15} className={css({ color: 'gray.400', flexShrink: 0 })} />
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
                    color: 'gray.900',
                    _placeholder: { color: 'gray.400' },
                })}
            />
        </div>
    );
}

/* ─── Main Component ─── */
export const PostsFilter = ({ posts }: PostsFilterProps) => {
    const [activeTab, setActiveTab] = useState<TabKey>('all');
    const [allQuery, setAllQuery] = useState('');
    const [seriesQuery, setSeriesQuery] = useState('');
    const [tagQuery, setTagQuery] = useState('');

    // 시리즈별 그룹
    const seriesGroups = useMemo(() => {
        const groups: Record<string, PostItem[]> = {};
        for (const p of posts) {
            if (p.series) {
                if (!groups[p.series]) groups[p.series] = [];
                groups[p.series].push(p);
            }
        }
        let entries = Object.entries(groups).sort((a, b) => {
            const aDate = a[1][0]?.date || '';
            const bDate = b[1][0]?.date || '';
            return bDate.localeCompare(aDate);
        });
        if (seriesQuery.trim()) {
            const q = seriesQuery.toLowerCase();
            entries = entries.filter(([name, items]) =>
                name.toLowerCase().includes(q) ||
                items.some(p => p.title.toLowerCase().includes(q))
            );
        }
        return entries;
    }, [posts, seriesQuery]);

    // 태그별 그룹
    const tagGroups = useMemo(() => {
        const groups: Record<string, PostItem[]> = {};
        for (const p of posts) {
            if (p.tags) {
                for (const tag of p.tags) {
                    if (!groups[tag]) groups[tag] = [];
                    groups[tag].push(p);
                }
            }
        }
        let entries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
        if (tagQuery.trim()) {
            const q = tagQuery.toLowerCase();
            entries = entries.filter(([name, items]) =>
                name.toLowerCase().includes(q) ||
                items.some(p => p.title.toLowerCase().includes(q))
            );
        }
        return entries;
    }, [posts, tagQuery]);

    return (
        <>
            {/* 탭 바 */}
            <div
                className={css({
                    display: 'flex',
                    gap: '0',
                    mb: '8',
                    borderBottomWidth: '1px',
                    borderColor: 'gray.200',
                })}
            >
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={css({
                            px: { base: '4', md: '5' },
                            py: '3',
                            fontSize: 'sm',
                            fontWeight: activeTab === tab.key ? 'semibold' : 'medium',
                            color: activeTab === tab.key ? 'gray.900' : 'gray.400',
                            borderBottom: '2px solid',
                            borderBottomColor: activeTab === tab.key ? 'gray.900' : 'transparent',
                            bg: 'transparent',
                            border: 'none',
                            borderBottomWidth: '2px',
                            borderBottomStyle: 'solid',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            _hover: { color: activeTab === tab.key ? 'gray.900' : 'gray.600' },
                        })}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── 전체 뷰 ─── */}
            {activeTab === 'all' && (() => {
                const q = allQuery.toLowerCase().trim();
                const filtered = q
                    ? posts.filter(p => p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q))
                    : posts;
                return (
                    <>
                        <InlineSearch
                            value={allQuery}
                            onChange={setAllQuery}
                            placeholder="글 제목 또는 내용 검색..."
                        />
                        <div className={css({ display: 'flex', flexDirection: 'column', gap: '8' })}>
                            {filtered.length === 0 ? (
                                <p className={css({ py: '12', textAlign: 'center', color: 'gray.400' })}>
                                    검색 결과가 없습니다.
                                </p>
                            ) : (
                                filtered.map(post => (
                                    <PostCard key={post.slug} post={post} />
                                ))
                            )}
                        </div>
                    </>
                );
            })()}

            {/* ─── 시리즈 뷰 ─── */}
            {activeTab === 'series' && (
                <>
                    <InlineSearch
                        value={seriesQuery}
                        onChange={setSeriesQuery}
                        placeholder="시리즈 또는 글 제목 검색..."
                    />
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '10' })}>
                        {seriesGroups.length === 0 ? (
                            <p className={css({ py: '12', textAlign: 'center', color: 'gray.400' })}>
                                {seriesQuery ? '검색 결과가 없습니다.' : '시리즈가 없습니다.'}
                            </p>
                        ) : (
                            seriesGroups.map(([seriesName, seriesPosts]) => (
                                <section key={seriesName}>
                                    <div
                                        className={css({
                                            display: 'flex', alignItems: 'center', gap: '3',
                                            mb: '4', pb: '3', borderBottomWidth: '1px', borderColor: 'gray.100',
                                        })}
                                    >
                                        <h2 className={css({ fontSize: 'lg', fontWeight: 'bold', color: 'gray.800' })}>
                                            📚 {seriesName}
                                        </h2>
                                        <span className={css({ fontSize: 'sm', color: 'gray.400' })}>
                                            {seriesPosts.length}편
                                        </span>
                                    </div>
                                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '6', pl: { base: '0', md: '4' } })}>
                                        {seriesPosts.map(post => (
                                            <PostCard key={post.slug} post={post} />
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
                        value={tagQuery}
                        onChange={setTagQuery}
                        placeholder="태그 또는 글 제목 검색..."
                    />
                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '10' })}>
                        {tagGroups.length === 0 ? (
                            <p className={css({ py: '12', textAlign: 'center', color: 'gray.400' })}>
                                {tagQuery ? '검색 결과가 없습니다.' : '태그가 없습니다.'}
                            </p>
                        ) : (
                            tagGroups.map(([tagName, tagPosts]) => (
                                <section key={tagName}>
                                    <div
                                        className={css({
                                            display: 'flex', alignItems: 'center', gap: '3',
                                            mb: '4', pb: '3', borderBottomWidth: '1px', borderColor: 'gray.100',
                                        })}
                                    >
                                        <h2 className={css({ fontSize: 'lg', fontWeight: 'bold', color: 'gray.800' })}>
                                            # {tagName}
                                        </h2>
                                        <span className={css({ fontSize: 'sm', color: 'gray.400' })}>
                                            {tagPosts.length}개
                                        </span>
                                    </div>
                                    <div className={css({ display: 'flex', flexDirection: 'column', gap: '6', pl: { base: '0', md: '4' } })}>
                                        {tagPosts.map(post => (
                                            <PostCard key={post.slug} post={post} />
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
