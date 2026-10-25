'use client';

import { useState, useEffect, useId, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { css } from '@blog/styled-system/css';
import { Search, X, Clock } from 'lucide-react';
import {
  fmtDate,
  postPath,
  type PublicSearchIndexEntry,
} from '@blog/content/client';
import { getRecentViews, type RecentView } from '@/src/hooks/recentViews';
import { Portal } from '@/src/components/Portal';
import { actionButton } from '@/src/components/actionButton';
import { headerIconButton, iconButton } from '@/src/components/iconButton';
import { optionSelected, pressOption } from '@/src/components/interaction';
import { useModalDialog } from '@/src/components/useModalDialog';
import { isModifiedClick } from '@/src/components/events';
import { fetchSearchIndex } from './searchIndex';
import {
  matchesAllTokens,
  pickContentSnippet,
  searchTokens,
  splitByTokens,
} from './searchText';

/** 색인 요청의 진행 상태 — 여는 순간 요청이 걸리므로 요청 전도 'loading'이다. */
type IndexStatus = 'loading' | 'ready' | 'error';

// 일치어 강조. 틴트 면은 행 배경과 1.17 / 1.39:1(선택 행 위 1.17 / 1.50)이라 색만으로는
// 약하고, 제목 줄은 제목도 ink.950·medium이라 면 말고는 갈리는 게 없다 — 굵기를 한 단계
// 올려(semibold) 색 아닌 표식을 둔다. 메타 줄에서는 글자색(ink.500/700 대 ink.950)도 갈린다.
const markClass = css({
  bg: 'accent.muted',
  color: 'ink.950',
  fontWeight: 'semibold',
  px: '0.5',
  rounded: 'inner',
});

// 검색 닫기 — ghost 아이콘 버튼의 누름을 쓰되 모양은 예전 그대로다: 입력 옆에서 본문보다 물러난
// 보조 잉크(ink.400, hover ink.600 + paper.200)이고, 상자는 패딩 8 + 글리프 18 = 34다.
const closeButton = css(iconButton.raw({ tone: 'ghost' }), {
  boxSize: 'auto',
  p: '2',
  color: 'ink.400',
  _hover: { color: 'ink.600', bg: 'paper.200' },
});

const Highlight = ({ text, tokens }: { text: string; tokens: string[] }) =>
  splitByTokens(text, tokens).map((part, i) =>
    part.match ? (
      <mark key={i} className={markClass}>
        {part.text}
      </mark>
    ) : (
      part.text
    ),
  );

/**
 * 사이트 검색 — 헤더의 트리거 버튼과 모달 다이얼로그. 트리거는 열린 동안에도 마운트된
 * 채 남아야 닫힐 때 초점이 돌아갈 곳이 있다. 입력창은 콤보박스, 결과는 리스트박스다.
 */
export const SearchDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<PublicSearchIndexEntry[]>([]);
  const [indexStatus, setIndexStatus] = useState<IndexStatus>('loading');
  // 진행 중이거나 받은 색인 요청 — 다시 열어도 두 번 받지 않고, 실패하면 비운다.
  const indexRequest = useRef<Promise<void> | null>(null);
  // 선택 인덱스는 **어느 검색어에 대한 선택인지**와 함께 들고 다닌다. 예전에는
  // query가 바뀔 때마다 effect가 0으로 되돌렸는데, 그러면 렌더 → effect →
  // 리렌더가 한 번 더 돌고(cascading render), 그 사이 한 프레임 동안 이전
  // 검색어의 인덱스가 새 결과 위에 얹힌 채로 그려진다. 검색어를 함께 들고
  // 있으면 "과거의 선택"인지 렌더 중에 바로 판정되어 그 프레임이 없다.
  const [selection, setSelection] = useState({ query: '', index: 0 });
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // 저장된 선택이 지금 검색어의 것이 아니면 0으로 읽는다 — 되돌리는 effect 없이
  // 렌더 중에 판정된다.
  const selectedIndex = selection.query === query ? selection.index : 0;
  const moveSelection = (next: (prev: number) => number) => {
    setSelection(prev => ({
      query,
      index: next(prev.query === query ? prev.index : 0),
    }));
  };

  // 검색어는 낱말들의 AND다(searchText.ts). 빈칸 판정과 매칭이 같은 값을 본다.
  const tokens = searchTokens(query);
  const hasQuery = tokens.length > 0;
  const showRecentViews = !hasQuery && recentViews.length > 0;
  const recentAsPosts: PublicSearchIndexEntry[] = !showRecentViews
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
            seriesTitle: null,
            contentPreview: '',
          }
        );
      });

  // 검색 필터링 — query/posts/recentAsPosts에서 derived
  const filteredPosts: PublicSearchIndexEntry[] = !hasQuery
    ? recentAsPosts.length > 0
      ? recentAsPosts
      : posts.slice(0, 10)
    : posts
        .filter(post =>
          matchesAllTokens(
            [
              post.title,
              post.excerpt,
              ...post.tags,
              post.series ?? '',
              post.seriesTitle ?? '',
              post.contentPreview,
            ],
            tokens,
          ),
        )
        .slice(0, 10);

  // effect deps에 들어가는 셋만 useCallback이다 — exhaustive-deps는 컴파일러의 메모이즈를 못 본다.
  // 색인 요청은 이벤트 핸들러에서 건다(업데이터 안이면 StrictMode가 두 번 부른다).
  const loadIndex = useCallback(() => {
    if (indexRequest.current) return;
    setIndexStatus('loading');
    indexRequest.current = fetchSearchIndex().then(
      data => {
        setPosts(data);
        setIndexStatus('ready');
      },
      (err: unknown) => {
        console.error('Failed to load search index:', err);
        indexRequest.current = null;
        setIndexStatus('error');
      },
    );
  }, []);

  const openDialog = useCallback(() => {
    setIsOpen(true);
    setRecentViews(getRecentViews());
    loadIndex();
  }, [loadIndex]);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelection({ query: '', index: 0 });
  }, []);

  useModalDialog({
    open: isOpen,
    onClose: closeDialog,
    containerRef: dialogRef,
    initialFocusRef: inputRef,
  });

  // Cmd+K / Ctrl+K 단축키. `e.code`로 본다 — 한글 입력 상태에서는 e.key가
  // 'ㅏ'가 되고, Caps Lock이면 'K'가 되어 문자 비교로는 놓친다.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
        e.preventDefault();
        if (isOpen) closeDialog();
        else openDialog();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openDialog, closeDialog]);

  const handleSelect = (slug: string) => {
    closeDialog();
    // 예전엔 `/posts/${slug}`를 그대로 밀어 넣어, 인코딩도 후행 슬래시도
    // 없는 이 한 곳만 다른 링크와 형태가 달랐다(대괄호가 든 slug는 App
    // Router가 동적 세그먼트로 오해한다 — encodePostSlug가 존재하는 이유).
    router.push(postPath(slug));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 조합 중의 Enter·화살표는 조합을 끝내는 키다 — 결과 선택으로 읽지 않는다.
    if (e.nativeEvent.isComposing) return;
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
    // scrollIntoView는 Element에 있으니 HTMLElement까지 좁힐 이유가 없다.
    // children[i]는 범위를 벗어나면 undefined라 옵셔널 체이닝이 그대로 그 검사다.
    const selected = listRef.current?.children[selectedIndex];
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const activeOption = filteredPosts[selectedIndex]
    ? optionId(selectedIndex)
    : undefined;

  return (
    <>
      {/* 아이콘 버튼이라 단축키는 화면에 적지 않는다 — 마우스는 title 툴팁으로, 보조기술은
          aria-keyshortcuts로 받는다(위 핸들러가 Meta·Control 둘 다 받는다). 이름은 '검색' 그대로다. */}
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label="검색"
        aria-keyshortcuts="Meta+K Control+K"
        title="검색 (⌘K / Ctrl K)"
        className={headerIconButton}
      >
        <Search size={18} />
      </button>

      {/* body로 portal한다 — 헤더의 backdrop-filter가 fixed 자손의 containing
          block을 헤더로 바꿔, 안에 두면 풀스크린 패널이 헤더 높이로 접힌다. */}
      {isOpen && (
        <Portal>
          {/* 백드롭 클릭은 포인터 편의다 — 키보드는 Escape·닫기 버튼으로 닫는다.
              등장만 움직인다(Astryx Dialog) — 닫힘은 즉시 사라진다. @starting-style은 열 때
              삽입되는 이 요소에만 쓴다(서버가 그린 요소에 걸면 하드 로드에도 재생된다). */}
          <div
            role="presentation"
            className={css({
              pos: 'fixed',
              inset: '0',
              bg: 'scrim.dialog',
              zIndex: '50',
              transition: 'opacity',
              _starting: { opacity: '0' },
            })}
            onClick={closeDialog}
          />

          {/* 다이얼로그 — 모바일: 풀스크린, 데스크탑: 센터 모달 */}
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="글 검색"
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
            {/* 등장은 바깥 래퍼(가운데 정렬의 translateX)가 아니라 이 패널에 건다. 데스크톱
                센터 모달은 16px 아래·95%에서 떠오르고, 화면을 덮는 모바일은 투명도만 바뀐다
                (Astryx Dialog의 풀스크린과 같다). */}
            <div
              className={css({
                transitionProperty: 'opacity, transform',
                transitionDuration: 'mediumMax',
                transitionTimingFunction: 'standard',
                _starting: {
                  opacity: '0',
                  transform: { md: 'translateY(16px) scale(0.95)' },
                },
                bg: 'paper.50',
                rounded: { base: 'none', md: 'container' },
                overflow: 'hidden',
                // 센터 모달은 떠 있는 표면이라 overlay.high를 두고(AGENTS.md §9), hairline도
                // 남긴다 — 다크에서 다이얼로그 면과 dim 아래 지면은 대비가 거의 없어(1.04:1)
                // 그림자만으로는 경계가 서지 않는다. 모바일은 화면 전체를 덮어 그림자가 떨어질
                // 가장자리가 없으니 둘 다 두지 않는다.
                borderWidth: { base: 'none', md: 'hairline' },
                borderColor: 'ink.border',
                boxShadow: { md: 'overlay.high' },
                h: { base: 'full', md: 'auto' },
                // body 스크롤이 잠겨 있으니 모달 높이를 묶고 결과 목록만 스크롤한다.
                maxH: { md: '[70vh]' },
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
                  borderBottomWidth: 'hairline',
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
                  role="combobox"
                  aria-label="검색어"
                  aria-autocomplete="list"
                  aria-expanded={filteredPosts.length > 0}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOption}
                  autoComplete="off"
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
                  type="button"
                  onClick={closeDialog}
                  // 아이콘은 aria-hidden svg라 이름을 주지 못한다(axe button-name).
                  aria-label="검색 닫기"
                  className={closeButton}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 검색 결과 — 결과가 넘치면 이 상자만 스크롤된다. 옵션은 Tab 순서 밖이라
                  (선택은 콤보박스의 화살표가 맡는다) 상자 자신이 초점을 받아야 키보드로도
                  스크롤할 수 있다(axe scrollable-region-focusable). */}
              <div
                role="region"
                aria-label="검색 결과 영역"
                tabIndex={0}
                className={css({
                  flex: '1',
                  minH: '0',
                  overflowY: 'auto',
                  py: '2',
                  WebkitOverflowScrolling: 'touch',
                })}
              >
                {showRecentViews && (
                  <div
                    aria-hidden="true"
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
                {/* option 없는 listbox는 axe aria-required-children 위반이라 결과가 없으면 내리지 않는다. */}
                {filteredPosts.length > 0 && (
                  <div
                    ref={listRef}
                    id={listboxId}
                    role="listbox"
                    aria-label={showRecentViews ? '최근 본 글' : '검색 결과'}
                  >
                    {filteredPosts.map((post, index) => {
                      const snippet =
                        hasQuery && post.contentPreview
                          ? pickContentSnippet(post.contentPreview, tokens)
                          : post.excerpt;
                      const selected = index === selectedIndex;
                      return (
                        // 옵션이 곧 링크다(새 탭으로 열기). 옵션 안에 링크를 두면 옵션의
                        // 자식은 표현용이라 초점 가능한 자식이 겹친다(axe nested-interactive).
                        // 키보드 선택은 콤보박스가 맡아 Tab 순서에서 뺀다.
                        <Link
                          key={post.slug}
                          id={optionId(index)}
                          role="option"
                          aria-selected={selected}
                          // 포인터가 올라간 행이 곧 선택 행이다.
                          onMouseEnter={() => setSelection({ query, index })}
                          href={postPath(post.slug)}
                          // 결과가 글자마다 갈려 미리 받으면 입력마다 RSC 요청이 열 개씩 나간다.
                          prefetch={false}
                          tabIndex={-1}
                          onClick={e => {
                            if (!isModifiedClick(e)) closeDialog();
                          }}
                          className={css(
                            pressOption,
                            {
                              display: 'block',
                              px: '4',
                              py: { base: '4', md: '3' },
                              bg: 'transparent',
                              color: 'ink.500',
                              transition: 'colors',
                              borderBottomWidth: {
                                base: 'hairline',
                                md: 'none',
                              },
                              borderColor: 'paper.200',
                            },
                            // 선택 행의 면·글자색은 눌린 행과 같은 `optionSelected`다.
                            selected && optionSelected,
                          )}
                        >
                          <p
                            className={css({
                              fontSize: 'sm',
                              fontWeight: 'medium',
                              color: 'ink.950',
                              lineClamp: 1,
                            })}
                          >
                            <Highlight text={post.title} tokens={tokens} />
                          </p>
                          <p
                            className={css({
                              fontSize: 'xs',
                              mt: '1',
                              lineClamp: 2,
                            })}
                          >
                            {/* 예약 글의 date는 ISO 일시일 수 있다 — 목록들과 같은
                                fmtDate로 날짜만 보인다. */}
                            {post.date && <span>{fmtDate(post.date)} · </span>}
                            {post.seriesTitle && (
                              <span>📚 {post.seriesTitle} · </span>
                            )}
                            <Highlight text={snippet} tokens={tokens} />
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
                                    // paper.200 위 작은 글자 — 서브 서피스 메타 톤(ink.500)이 AA 하한이다.
                                    color: 'ink.500',
                                    rounded: 'full',
                                  })}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
                {filteredPosts.length === 0 && (
                  <div
                    role="status"
                    className={css({
                      px: '4',
                      py: '8',
                      display: 'flex',
                      flexDir: 'column',
                      alignItems: 'center',
                      gap: '3',
                      textAlign: 'center',
                      // paper.50 위 보조 문구 — --fg-sub(ink.600). ink.400은 2.97:1이다.
                      color: 'ink.600',
                      fontSize: 'sm',
                    })}
                  >
                    {indexStatus === 'error' ? (
                      <>
                        <p>검색 색인을 불러오지 못했습니다.</p>
                        <button
                          type="button"
                          onClick={loadIndex}
                          className={actionButton({ tone: 'outline' })}
                        >
                          다시 시도
                        </button>
                      </>
                    ) : indexStatus === 'loading' ? (
                      <p>검색 색인을 불러오는 중…</p>
                    ) : (
                      <p>
                        {hasQuery
                          ? '검색 결과가 없습니다'
                          : '포스트를 검색해보세요'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 하단 힌트 — 데스크탑만 */}
              <div
                aria-hidden="true"
                className={css({
                  display: { base: 'none', md: 'flex' },
                  alignItems: 'center',
                  gap: '4',
                  px: '4',
                  py: '2',
                  borderTopWidth: 'hairline',
                  borderColor: 'ink.100',
                  fontSize: 'xs',
                  // aria-hidden이어도 보이는 글자다 — 대비는 지킨다(--fg-sub).
                  color: 'ink.600',
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
      )}
    </>
  );
};
