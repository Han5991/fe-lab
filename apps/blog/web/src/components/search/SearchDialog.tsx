'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { css } from '@design-system/ui-lib/css';
import { Search, X } from 'lucide-react';

interface SearchPost {
    slug: string;
    title: string;
    date: string | null;
    excerpt: string;
    tags: string[];
    series: string | null;
}

interface SearchDialogProps {
    posts: SearchPost[];
}

export const SearchDialog = ({ posts }: SearchDialogProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [filteredPosts, setFilteredPosts] = useState<SearchPost[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Cmd+K / Ctrl+K 단축키
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 열릴 때 body 스크롤 잠금 (모바일에서 중요)
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = '';
            setQuery('');
            setSelectedIndex(0);
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // 검색 필터링
    useEffect(() => {
        if (!query.trim()) {
            setFilteredPosts(posts.slice(0, 10));
            setSelectedIndex(0);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const results = posts.filter(
            post =>
                post.title.toLowerCase().includes(lowerQuery) ||
                post.excerpt.toLowerCase().includes(lowerQuery) ||
                post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
                (post.series && post.series.toLowerCase().includes(lowerQuery))
        );
        setFilteredPosts(results.slice(0, 10));
        setSelectedIndex(0);
    }, [query, posts]);

    const handleSelect = useCallback(
        (slug: string) => {
            setIsOpen(false);
            router.push(`/posts/${slug}`);
        },
        [router]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, filteredPosts.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredPosts[selectedIndex]) {
                        handleSelect(filteredPosts[selectedIndex].slug);
                    }
                    break;
            }
        },
        [filteredPosts, selectedIndex, handleSelect]
    );

    // 선택된 항목으로 스크롤
    useEffect(() => {
        if (listRef.current) {
            const selected = listRef.current.children[selectedIndex] as HTMLElement;
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                    px: { base: '2', md: '3' },
                    py: '1.5',
                    borderRadius: 'lg',
                    borderWidth: '1px',
                    borderColor: 'gray.200',
                    color: 'gray.500',
                    fontSize: 'sm',
                    cursor: 'pointer',
                    _hover: { borderColor: 'gray.400', color: 'gray.700' },
                    _active: { bg: 'gray.100' },
                    transition: 'all 0.2s',
                    bg: 'transparent',
                    minW: { base: '36px', md: 'auto' },
                    justifyContent: 'center',
                })}
                aria-label="검색"
            >
                <Search size={16} />
                <span className={css({ display: { base: 'none', md: 'inline' } })}>검색</span>
                <kbd
                    className={css({
                        display: { base: 'none', md: 'inline' },
                        px: '1.5',
                        py: '0.5',
                        borderRadius: 'md',
                        bg: 'gray.100',
                        fontSize: 'xs',
                        color: 'gray.400',
                    })}
                >
                    ⌘K
                </kbd>
            </button>
        );
    }

    return (
        <>
            {/* 백드롭 */}
            <div
                className={css({
                    position: 'fixed',
                    inset: 0,
                    bg: 'black/50',
                    zIndex: 50,
                })}
                onClick={() => setIsOpen(false)}
            />

            {/* 다이얼로그 — 모바일: 풀스크린, 데스크탑: 센터 모달 */}
            <div
                className={css({
                    position: 'fixed',
                    zIndex: 51,
                    /* 모바일: 전체 화면 */
                    top: { base: 0, md: '15%' },
                    left: { base: 0, md: '50%' },
                    right: { base: 0, md: 'auto' },
                    bottom: { base: 0, md: 'auto' },
                    transform: { base: 'none', md: 'translateX(-50%)' },
                    w: { base: 'full', md: '560px' },
                })}
            >
                <div
                    className={css({
                        bg: 'white',
                        borderRadius: { base: '0', md: 'xl' },
                        overflow: 'hidden',
                        shadow: { base: 'none', md: '2xl' },
                        h: { base: 'full', md: 'auto' },
                        display: 'flex',
                        flexDirection: 'column',
                    })}
                >
                    {/* 검색 입력 */}
                    <div
                        className={css({
                            display: 'flex',
                            alignItems: 'center',
                            px: '4',
                            borderBottomWidth: '1px',
                            borderColor: 'gray.100',
                            flexShrink: 0,
                        })}
                    >
                        <Search size={18} className={css({ color: 'gray.400', flexShrink: 0 })} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="제목, 태그, 시리즈로 검색..."
                            className={css({
                                flex: 1,
                                px: '3',
                                py: '4',
                                bg: 'transparent',
                                outline: 'none',
                                fontSize: { base: '16px', md: 'md' },
                                color: 'gray.900',
                                border: 'none',
                                _placeholder: { color: 'gray.400' },
                            })}
                        />
                        <button
                            onClick={() => setIsOpen(false)}
                            className={css({
                                p: '2',
                                borderRadius: 'md',
                                color: 'gray.400',
                                _hover: { color: 'gray.600', bg: 'gray.100' },
                                _active: { bg: 'gray.200' },
                                cursor: 'pointer',
                                bg: 'transparent',
                                border: 'none',
                            })}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 검색 결과 */}
                    <div
                        ref={listRef}
                        className={css({
                            flex: 1,
                            overflowY: 'auto',
                            py: '2',
                            WebkitOverflowScrolling: 'touch',
                        })}
                    >
                        {filteredPosts.length === 0 ? (
                            <p className={css({ px: '4', py: '8', textAlign: 'center', color: 'gray.400', fontSize: 'sm' })}>
                                {query ? '검색 결과가 없습니다' : '포스트를 검색해보세요'}
                            </p>
                        ) : (
                            filteredPosts.map((post, index) => (
                                <button
                                    key={post.slug}
                                    onClick={() => handleSelect(post.slug)}
                                    className={css({
                                        display: 'block',
                                        w: 'full',
                                        textAlign: 'left',
                                        px: '4',
                                        py: { base: '4', md: '3' },
                                        cursor: 'pointer',
                                        bg: index === selectedIndex ? 'blue.50' : 'transparent',
                                        _hover: { bg: 'gray.50' },
                                        _active: { bg: 'blue.50' },
                                        transition: 'background 0.1s',
                                        border: 'none',
                                        borderBottomWidth: { base: '1px', md: '0' },
                                        borderColor: 'gray.50',
                                    })}
                                >
                                    <p
                                        className={css({
                                            fontSize: 'sm',
                                            fontWeight: 'medium',
                                            color: 'gray.900',
                                            lineClamp: 1,
                                        })}
                                    >
                                        {post.title}
                                    </p>
                                    <p
                                        className={css({
                                            fontSize: 'xs',
                                            color: 'gray.500',
                                            mt: '1',
                                            lineClamp: 1,
                                        })}
                                    >
                                        {post.date && <span>{post.date} · </span>}
                                        {post.series && <span>📚 {post.series} · </span>}
                                        {post.excerpt}
                                    </p>
                                    {post.tags.length > 0 && (
                                        <div className={css({ display: 'flex', gap: '1', mt: '1.5', flexWrap: 'wrap' })}>
                                            {post.tags.slice(0, 3).map(tag => (
                                                <span
                                                    key={tag}
                                                    className={css({
                                                        fontSize: '2xs',
                                                        px: '1.5',
                                                        py: '0.5',
                                                        bg: 'gray.100',
                                                        color: 'gray.600',
                                                        borderRadius: 'md',
                                                    })}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    {/* 하단 힌트 — 데스크탑만 */}
                    <div
                        className={css({
                            display: { base: 'none', md: 'flex' },
                            alignItems: 'center',
                            gap: '4',
                            px: '4',
                            py: '2',
                            borderTopWidth: '1px',
                            borderColor: 'gray.100',
                            fontSize: 'xs',
                            color: 'gray.400',
                            flexShrink: 0,
                        })}
                    >
                        <span>↑↓ 이동</span>
                        <span>↵ 선택</span>
                        <span>esc 닫기</span>
                    </div>
                </div>
            </div>
        </>
    );
};
