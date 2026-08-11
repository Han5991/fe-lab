'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { css } from '@design-system/ui-lib/css';
import { Search, X, Clock } from 'lucide-react';
import { getRecentViews, type RecentView } from '@/src/hooks/useRecentViews';
import { Portal } from '@/src/components/Portal';

interface SearchPost {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  contentPreview?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, query: string): ReactNode {
  if (!query.trim() || !text) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className={css({
          bg: 'marker.300',
          color: 'ink.950',
          fontWeight: 'medium',
          px: '0.5',
          rounded: 'sm',
        })}
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function pickContentSnippet(
  content: string,
  query: string,
  radius = 60,
): string {
  if (!content) return '';
  if (!query.trim()) return content.slice(0, 140);
  const idx = content.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, 140);
  const start = Math.max(0, idx - radius);
  const end = Math.min(content.length, idx + query.length + radius);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${content.slice(start, end)}${suffix}`;
}

interface SearchDialogProps {
  /**
   * `rail`은 64px 세로 레일 안에 서는 형태다 — 넓은 화면에서도 아이콘만 남긴다.
   * 기본값(`bar`)은 `md`부터 `검색` 라벨과 `⌘K` 힌트를 함께 보여주는데,
   * 그대로 두면 레일 폭을 넘쳐 왼쪽으로 삐져나온다.
   */
  variant?: 'bar' | 'rail';
}

export const SearchDialog = ({ variant = 'bar' }: SearchDialogProps = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const showRecentViews = !query.trim() && recentViews.length > 0;
  const recentAsPosts: SearchPost[] = !showRecentViews
    ? []
    : recentViews.map(rv => {
        const found = posts.find(p => p.slug === rv.slug);
        return (
          found ?? {
            slug: rv.slug,
            title: rv.title,
            date: null,
            excerpt: '',
            tags: [],
            series: null,
          }
        );
      });

  // 검색 필터링 — query/posts/recentAsPosts에서 derived
  const filteredPosts: SearchPost[] = !query.trim()
    ? recentAsPosts.length > 0
      ? recentAsPosts
      : posts.slice(0, 10)
    : posts
        .filter(post => {
          const lowerQuery = query.toLowerCase();
          return (
            post.title.toLowerCase().includes(lowerQuery) ||
            post.excerpt.toLowerCase().includes(lowerQuery) ||
            post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            (post.series && post.series.toLowerCase().includes(lowerQuery)) ||
            (post.contentPreview &&
              post.contentPreview.toLowerCase().includes(lowerQuery))
          );
        })
        .slice(0, 10);

  // 이 둘만 useCallback을 남긴다. 아래 Cmd+K 이펙트의 deps에 들어가는데,
  // react-hooks/exhaustive-deps는 React Compiler의 런타임 메모이제이션을 보지
  // 못해 "매 렌더 바뀐다"고 경고한다. 나머지 파생값·핸들러는 컴파일러에 맡긴다.
  const openDialog = useCallback(() => {
    setIsOpen(true);
    setRecentViews(getRecentViews());
    setPosts(prev => {
      if (prev.length > 0) return prev;
      fetch('/search-index.json')
        .then(res => res.json())
        .then((data: SearchPost[]) => setPosts(data))
        .catch(err => console.error('Failed to load search index:', err));
      return prev;
    });
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  // Cmd+K / Ctrl+K 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) closeDialog();
        else openDialog();
      }
      if (e.key === 'Escape') {
        closeDialog();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openDialog, closeDialog]);

  // 열릴 때 body 스크롤 잠금 + 인풋 포커스 (외부 시스템 sync)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // query 변경 시 선택 인덱스 초기화 (검색 결과가 달라지므로)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- query 변경 추적용 1줄 reset
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (slug: string) => {
    closeDialog();
    router.push(`/posts/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
  };

  // 선택된 항목으로 스크롤
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // 레일에서는 라벨·단축키 힌트를 숨기고 아이콘만 남긴다. `md` 이상에서만
  // 보이던 것들이라, 조건을 통째로 `none`으로 덮어써야 넓은 화면에서도 접힌다.
  const compact = variant === 'rail';
  const labelDisplay = compact
    ? ('none' as const)
    : ({ base: 'none', md: 'inline' } as const);

  if (!isOpen) {
    return (
      <button
        onClick={openDialog}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '2',
          px: compact ? '2' : { base: '2', md: '3' },
          py: '1.5',
          rounded: 'lg',
          borderWidth: '[1px]',
          borderColor: 'ink.border',
          color: 'ink.500',
          fontSize: 'sm',
          cursor: 'pointer',
          _hover: { borderColor: 'ink.borderStrong', color: 'ink.700' },
          _active: { bg: 'paper.100' },
          transition: '[all 0.2s]',
          bg: 'transparent',
          minW: compact ? '[36px]' : { base: '[36px]', md: 'auto' },
          justifyContent: 'center',
        })}
        aria-label="검색"
      >
        <Search size={16} />
        <span className={css({ display: labelDisplay })}>검색</span>
        <kbd
          className={css({
            display: labelDisplay,
            px: '1.5',
            py: '0.5',
            rounded: 'md',
            bg: 'paper.100',
            fontSize: 'xs',
            color: 'ink.400',
          })}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    // body로 portal한다. 이 오버레이는 사이트 크롬(SiteRail) 안에서 렌더되는데,
    // 크롬은 좁은 화면에서 `backdrop-filter`를 쓰고 넓은 화면에서는 64px짜리
    // 세로 레일이다. `backdrop-filter`는 fixed 자손의 containing block을 만들고,
    // 레일은 애초에 폭이 64px이라 — 둘 중 무엇이든 `w:100vw` 백드롭과
    // `left:50% + translateX(-50%)` 센터 모달의 기준이 화면이 아니라 크롬 박스가
    // 된다(모달이 왼쪽 32px 근처에 찌그러져 뜬다). 루트로 빼면 기준이 화면이다.
    <Portal>
      {/* 백드롭 */}
      <div
        className={css({
          pos: 'fixed',
          inset: '0',
          bg: '[rgba(0,0,0,0.5)]',
          zIndex: '50',
          w: '[100vw]',
          h: '[100vh]',
        })}
        onClick={closeDialog}
      />

      {/* 다이얼로그 — 모바일: 풀스크린, 데스크탑: 센터 모달 */}
      <div
        className={css({
          pos: 'fixed',
          zIndex: '51',
          top: { base: '0', md: '[15vh]' },
          left: { base: '0', md: '[50%]' },
          right: { base: '0', md: '[auto]' },
          bottom: { base: '0', md: '[auto]' },
          transform: { base: 'none', md: 'translateX(-50%)' },
          w: { base: 'full', md: '[560px]' },
        })}
      >
        <div
          className={css({
            bg: 'paper.50',
            rounded: { base: '[0]', md: 'card' },
            overflow: 'hidden',
            // dim 오버레이가 레이어를 갈라주므로 그림자 대신 hairline 보더로
            // 다이얼로그 경계를 세운다(플랫 유지).
            borderWidth: { base: '[0]', md: 'hairline' },
            borderColor: 'ink.border',
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
              borderBottomWidth: '[1px]',
              borderColor: 'ink.100',
              flexShrink: 0,
            })}
          >
            <Search
              size={18}
              className={css({ color: 'ink.400', flexShrink: 0 })}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="제목, 태그, 시리즈로 검색..."
              className={css({
                flex: '1',
                px: '3',
                py: '4',
                bg: 'transparent',
                outline: 'none',
                fontSize: { base: '[16px]', md: 'md' },
                color: 'ink.950',
                border: 'none',
                _placeholder: { color: 'ink.400' },
              })}
            />
            <button
              onClick={closeDialog}
              className={css({
                p: '2',
                rounded: 'md',
                color: 'ink.400',
                _hover: { color: 'ink.600', bg: 'paper.200' },
                _active: { bg: 'paper.200' },
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
            className={css({
              flex: '1',
              overflowY: 'auto',
              py: '2',
              WebkitOverflowScrolling: 'touch',
            })}
          >
            {showRecentViews && (
              <div
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                  px: '4',
                  py: '2',
                  fontSize: 'xs',
                  fontWeight: 'semibold',
                  color: 'ink.500',
                  letterSpacing: 'wide',
                  textTransform: 'uppercase',
                })}
              >
                <Clock size={12} /> 최근 본 글
              </div>
            )}
            <div ref={listRef}>
              {filteredPosts.length === 0 ? (
                <p
                  className={css({
                    px: '4',
                    py: '8',
                    textAlign: 'center',
                    color: 'ink.400',
                    fontSize: 'sm',
                  })}
                >
                  {query ? '검색 결과가 없습니다' : '포스트를 검색해보세요'}
                </p>
              ) : (
                filteredPosts.map((post, index) => {
                  const snippet =
                    query.trim() && post.contentPreview
                      ? pickContentSnippet(post.contentPreview, query)
                      : post.excerpt;
                  return (
                    <button
                      key={post.slug}
                      type="button"
                      onClick={() => handleSelect(post.slug)}
                      className={css({
                        display: 'block',
                        w: 'full',
                        textAlign: 'left',
                        px: '4',
                        py: { base: '4', md: '3' },
                        cursor: 'pointer',
                        bg:
                          index === selectedIndex ? 'accent.50' : 'transparent',
                        _hover: { bg: 'ink.50' },
                        _active: { bg: 'accent.50' },
                        transition: '[background 0.1s]',
                        border: 'none',
                        borderBottomWidth: { base: '[1px]', md: '[0]' },
                        borderColor: 'paper.200',
                      })}
                    >
                      <p
                        className={css({
                          fontSize: 'sm',
                          fontWeight: 'medium',
                          color: 'ink.950',
                          lineClamp: 1,
                        })}
                      >
                        {highlight(post.title, query)}
                      </p>
                      <p
                        className={css({
                          fontSize: 'xs',
                          color: 'ink.500',
                          mt: '1',
                          lineClamp: 2,
                        })}
                      >
                        {post.date && <span>{post.date} · </span>}
                        {post.series && <span>📚 {post.series} · </span>}
                        {highlight(snippet, query)}
                      </p>
                      {post.tags.length > 0 && (
                        <div
                          className={css({
                            display: 'flex',
                            gap: '1',
                            mt: '1.5',
                            flexWrap: 'wrap',
                          })}
                        >
                          {post.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className={css({
                                fontSize: '2xs',
                                px: '1.5',
                                py: '0.5',
                                bg: 'paper.200',
                                color: 'ink.600',
                                rounded: 'md',
                              })}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 하단 힌트 — 데스크탑만 */}
          <div
            className={css({
              display: { base: 'none', md: 'flex' },
              alignItems: 'center',
              gap: '4',
              px: '4',
              py: '2',
              borderTopWidth: '[1px]',
              borderColor: 'ink.100',
              fontSize: 'xs',
              color: 'ink.400',
              flexShrink: 0,
            })}
          >
            <span>↑↓ 이동</span>
            <span>↵ 선택</span>
            <span>esc 닫기</span>
          </div>
        </div>
      </div>
    </Portal>
  );
};
