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
// 클라이언트 컴포넌트의 @blog/content 배럴 import — node:fs 모듈(series 등)은
// next.config.ts의 optimizePackageImports + sideEffects:false가 번들에서 걸러 준다.
import { postPath } from '@blog/content';
import { getRecentViews, type RecentView } from '@/src/hooks/useRecentViews';

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

export const SearchDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<SearchPost[]>([]);
  // 선택 인덱스는 **어느 검색어에 대한 선택인지**와 함께 들고 다닌다. 예전에는
  // query가 바뀔 때마다 effect가 0으로 되돌렸는데, 그러면 렌더 → effect →
  // 리렌더가 한 번 더 돌고(cascading render), 그 사이 한 프레임 동안 이전
  // 검색어의 인덱스가 새 결과 위에 얹힌 채로 그려진다. 검색어를 함께 들고
  // 있으면 "과거의 선택"인지 렌더 중에 바로 판정되어 그 프레임이 없다.
  const [selection, setSelection] = useState({ query: '', index: 0 });
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 저장된 선택이 지금 검색어의 것이 아니면 0으로 읽는다 — 되돌리는 effect 없이
  // 렌더 중에 판정된다.
  const selectedIndex = selection.query === query ? selection.index : 0;
  const moveSelection = (next: (prev: number) => number) => {
    setSelection(prev => ({
      query,
      index: next(prev.query === query ? prev.index : 0),
    }));
  };

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
    setSelection({ query: '', index: 0 });
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

  const handleSelect = (slug: string) => {
    closeDialog();
    // 예전엔 `/posts/${slug}`를 그대로 밀어 넣어, 인코딩도 후행 슬래시도
    // 없는 이 한 곳만 다른 링크와 형태가 달랐다(대괄호가 든 slug는 App
    // Router가 동적 세그먼트로 오해한다 — encodePostSlug가 존재하는 이유).
    router.push(postPath(slug));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveSelection(prev => Math.min(prev + 1, filteredPosts.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveSelection(prev => Math.max(prev - 1, 0));
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

  if (!isOpen) {
    return (
      <button
        onClick={openDialog}
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '2',
          px: { base: '2', md: '3' },
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
          minW: { base: '[36px]', md: 'auto' },
          justifyContent: 'center',
        })}
        aria-label="검색"
      >
        <Search size={16} />
        <span className={css({ display: { base: 'none', md: 'inline' } })}>
          검색
        </span>
        <kbd
          className={css({
            display: { base: 'none', md: 'inline' },
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
    <>
      {/* 백드롭 — 뒤를 덮는 dim 레이어다. 보조기술에 읽힐 내용이 없으므로
          role="presentation"으로 트리에서 뺀다. 클릭으로 닫히는 건 포인터
          편의일 뿐이고, 키보드로 닫는 길은 이 요소가 아니라 위 useEffect의
          Escape 핸들러와 아래 닫기 버튼이다 — 그래서 여기에 키 핸들러를
          더 달아도 초점이 오지 않아 아무도 쓰지 못한다. */}
      <div
        role="presentation"
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
    </>
  );
};
