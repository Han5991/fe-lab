<script lang="ts">
  // 배럴(`@blog/content`)이 아니라 **클라이언트 문**이다 — 배럴은 `node:fs`를
  // 함께 열어 클라이언트 그래프에서 빈 스텁으로 externalize된다(이 컴포넌트가
  // 그 문을 만든 계기다: `packages/@blog/content/src/client.ts` 주석).
  import { postPath } from '@blog/content/client';
  import { goto } from '$app/navigation';
  import { css } from '../../../styled-system/css';
  import { getRecentViews, type RecentView } from './recentViews';
  import {
    filterPosts,
    highlightParts,
    parseSearchIndex,
    pickContentSnippet,
    type SearchPost,
  } from './search';

  /**
   * ⌘K 검색 — **서버 없는 클라이언트 검색.**
   *
   * 빌드 산출물 `/search-index.json`(44편)을 **다이얼로그를 처음 열 때** 받는다.
   * 레이아웃에 있으므로 첫 로드에 오지만, 인덱스는 오지 않는다 — 이 늦춤이
   * 이 컴포넌트에서 가장 중요한 한 줄이고, `check-bundle`의 규칙이 잠근다.
   *
   * React 판(`src/components/search/SearchDialog.tsx`)과 정책을 맞췄다: 같은
   * 필드로 거르고, 10건까지, 최근 본 글을 빈 검색어의 기본 목록으로 쓴다.
   * 순수 규칙은 전부 `search.ts`에 있고 여기는 화면과 입력뿐이다.
   *
   * **선택 인덱스에 트릭이 없다.** React 판은 "어느 검색어에 대한 선택인지"를
   * 함께 들고 다닌다 — 검색어가 바뀔 때 effect로 0으로 되돌리면 렌더 →
   * effect → 리렌더가 한 번 더 돌면서 한 프레임 동안 이전 인덱스가 새 결과
   * 위에 얹히기 때문이다. 여기서는 입력 핸들러가 두 값을 같은 자리에서 바꾼다.
   * 프레임워크가 달라 문제 자체가 생기지 않는 자리다.
   */

  let open = $state(false);
  let query = $state('');
  let selected = $state(0);
  let posts = $state<SearchPost[]>([]);
  let viewed = $state<RecentView[]>([]);
  let input = $state<HTMLInputElement>();
  let list = $state<HTMLDivElement>();

  /**
   * 최근 본 글은 slug·제목만 저장돼 있다. 인덱스가 도착하면 같은 slug의 항목으로
   * 바꿔 발췌·태그까지 보여준다 — 파생이라서 **열어 둔 채로 인덱스가 도착해도**
   * 목록이 채워진다. 상태로 만들어 열 때 한 번 계산하면 첫 열림에서만 빈약한
   * 줄이 남는다(인덱스 fetch가 그보다 늦기 때문에 사실상 매번이다).
   */
  const recent = $derived(
    viewed.map(view => {
      const found = posts.find(post => post.slug === view.slug);
      return (
        found ?? {
          slug: view.slug,
          title: view.title,
          date: null,
          excerpt: '',
          tags: [],
          series: null,
        }
      );
    }),
  );

  const showRecent = $derived(query.trim().length === 0 && recent.length > 0);
  const results = $derived(filterPosts(posts, query, recent));

  /** 인덱스는 한 번만 받는다 — 두 번째 열림부터는 네트워크가 없다. */
  async function loadIndex() {
    if (posts.length > 0) return;
    try {
      const res = await fetch('/search-index.json');
      posts = parseSearchIndex(await res.json());
    } catch {
      // 인덱스를 못 받으면 최근 본 글만 남는다. 다이얼로그가 아예 안 열리는
      // 것보다 낫고, 다음 열림에서 다시 시도한다.
    }
  }

  function openDialog() {
    open = true;
    query = '';
    selected = 0;
    // 열 때마다 다시 읽는다 — 다른 탭에서 읽은 글이 반영된다.
    viewed = getRecentViews();
    void loadIndex();
  }

  function closeDialog() {
    open = false;
    query = '';
    selected = 0;
  }

  function onWindowKey(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      if (open) closeDialog();
      else openDialog();
      return;
    }
    if (event.key === 'Escape' && open) closeDialog();
  }

  function onInputKey(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selected = Math.min(selected + 1, results.length - 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        selected = Math.max(selected - 1, 0);
        break;
      case 'Enter': {
        event.preventDefault();
        const target = results[selected];
        // 클릭과 같은 길로 간다 — 아래 링크는 SvelteKit이 가로채 클라이언트
        // 라우팅을 하므로, Enter만 전체 리로드면 두 경로의 체감이 갈린다.
        if (target !== undefined) {
          closeDialog();
          void goto(postPath(target.slug));
        }
        break;
      }
    }
  }

  $effect(() => {
    if (!open) return;
    // 오버레이 뒤가 스크롤되면 닫았을 때 읽던 자리를 잃는다.
    document.body.style.overflow = 'hidden';
    input?.focus();
    return () => {
      document.body.style.removeProperty('overflow');
    };
  });

  $effect(() => {
    // `selected`를 읽어 두어야 이 이펙트가 선택 변화에 반응한다.
    list?.children[selected]?.scrollIntoView({ block: 'nearest' });
  });

  // ── 스타일 ─────────────────────────────────────────────────────────────────

  const trigger = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    px: { base: '2', md: '3' },
    py: '1.5',
    rounded: 'control',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    color: 'ink.500',
    fontSize: 'sm',
    cursor: 'pointer',
    bg: 'transparent',
    _hover: { borderColor: 'ink.borderStrong', color: 'ink.700' },
  });

  const kbd = css({
    display: { base: 'none', md: 'inline' },
    px: '1.5',
    py: '0.5',
    rounded: 'control',
    bg: 'paper.100',
    fontSize: 'xs',
    color: 'ink.400',
  });

  const backdrop = css({
    position: 'fixed',
    inset: '0',
    zIndex: '[50]',
    bg: '[rgba(0,0,0,0.5)]',
  });

  const frame = css({
    position: 'fixed',
    zIndex: '[51]',
    top: { base: '0', md: '[15vh]' },
    left: { base: '0', md: '[50%]' },
    right: { base: '0', md: '[auto]' },
    bottom: { base: '0', md: '[auto]' },
    transform: { base: 'none', md: '[translateX(-50%)]' },
    w: { base: 'full', md: '[560px]' },
  });

  const panel = css({
    display: 'flex',
    flexDirection: 'column',
    h: { base: 'full', md: 'auto' },
    bg: 'paper.50',
    // dim 레이어가 이미 층을 갈라 주므로 그림자 대신 hairline 보더다(플랫 유지).
    borderWidth: { base: '[0]', md: 'hairline' },
    borderColor: 'ink.border',
    rounded: { base: '[0]', md: 'card' },
    overflow: 'hidden',
  });

  const field = css({
    flex: '1',
    px: '3',
    py: '4',
    bg: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'ink.950',
    // 모바일 Safari는 16px 미만 입력에 자동 확대를 건다.
    fontSize: { base: '[16px]', md: 'md' },
    _placeholder: { color: 'ink.400' },
  });

  const row = css({
    display: 'block',
    w: 'full',
    textAlign: 'left',
    px: '4',
    py: { base: '4', md: '3' },
    border: 'none',
    cursor: 'pointer',
    color: '[inherit]',
    textDecoration: 'none',
    _hover: { bg: 'ink.50' },
  });

  const hit = css({
    bg: 'marker.300',
    color: 'ink.950',
    fontWeight: 'medium',
    px: '0.5',
    rounded: 'control',
  });

  const tag = css({
    fontSize: '2xs',
    px: '1.5',
    py: '0.5',
    bg: 'paper.200',
    color: 'ink.600',
    rounded: 'control',
  });

  const icon = css({ flexShrink: '0' });
</script>

<svelte:window onkeydown={onWindowKey} />

<button type="button" class={trigger} onclick={openDialog} aria-label="검색">
  <!-- lucide의 `search`·`x`·`clock`을 인라인으로 옮겼다. React 판은
       `lucide-react`를 들이는데, 아이콘 세 개 때문에 런타임 의존을 하나 더
       두는 것이 이 비교에서는 잡음이다. -->
  <svg
    class={icon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
  </svg>
  <span class={css({ display: { base: 'none', md: 'inline' } })}>검색</span>
  <kbd class={kbd}>⌘K</kbd>
</button>

{#if open}
  <!-- 백드롭 — 뒤를 덮는 dim 레이어다. 보조기술에 읽힐 내용이 없어
       role="presentation"으로 트리에서 뺀다. 클릭으로 닫는 것은 포인터
       편의일 뿐이고, 키보드로 닫는 길은 위 `onWindowKey`의 Escape와 아래
       닫기 버튼이다. -->
  <div
    role="presentation"
    class={backdrop}
    onclick={closeDialog}
  ></div>

  <div class={frame}>
    <div
      class={panel}
      role="dialog"
      aria-modal="true"
      aria-label="글 검색"
    >
      <div
        class={css({
          display: 'flex',
          alignItems: 'center',
          px: '4',
          borderBottomWidth: 'hairline',
          borderColor: 'ink.100',
          flexShrink: '0',
        })}
      >
        <svg
          class={css({ flexShrink: '0', color: 'ink.400' })}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          bind:this={input}
          class={field}
          type="text"
          placeholder="제목, 태그, 시리즈로 검색..."
          value={query}
          oninput={event => {
            // 검색어와 선택을 **같은 자리에서** 바꾼다 — 이게 React 판의
            // `{query, index}` 트릭을 대신한다.
            query = event.currentTarget.value;
            selected = 0;
          }}
          onkeydown={onInputKey}
        />
        <button
          type="button"
          class={css({
            p: '2',
            rounded: 'control',
            border: 'none',
            bg: 'transparent',
            color: 'ink.400',
            cursor: 'pointer',
            _hover: { color: 'ink.600', bg: 'paper.200' },
          })}
          onclick={closeDialog}
          aria-label="검색 닫기"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div class={css({ flex: '1', overflowY: 'auto', py: '2' })}>
        {#if showRecent}
          <div
            class={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              px: '4',
              py: '2',
              fontSize: 'xs',
              fontWeight: 'semibold',
              color: 'ink.500',
              letterSpacing: 'wide',
            })}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            최근 본 글
          </div>
        {/if}

        <div bind:this={list}>
          {#if results.length === 0}
            <p
              class={css({
                px: '4',
                py: '8',
                textAlign: 'center',
                color: 'ink.400',
                fontSize: 'sm',
              })}
            >
              {query.trim().length > 0
                ? '검색 결과가 없습니다'
                : '포스트를 검색해보세요'}
            </p>
          {:else}
            {#each results as post, index (post.slug)}
              <!-- 버튼이 아니라 **링크**다. 목적지가 있는 이동이라 가운데
                   클릭·새 탭이 그냥 되고, JS가 늦게 와도 동작한다. React 판은
                   `router.push`를 쓰느라 이 셋을 잃었다. -->
              <a
                href={postPath(post.slug)}
                class="{row} {index === selected
                  ? css({ bg: 'accent.50' })
                  : ''}"
                onclick={closeDialog}
              >
                <p
                  class={css({
                    fontSize: 'sm',
                    fontWeight: 'medium',
                    color: 'ink.950',
                    lineClamp: '1',
                  })}
                >
                  {#each highlightParts(post.title, query) as part, i (i)}
                    {#if part.hit}<mark class={hit}>{part.text}</mark
                      >{:else}{part.text}{/if}
                  {/each}
                </p>
                <p
                  class={css({
                    fontSize: 'xs',
                    color: 'ink.500',
                    mt: '1',
                    lineClamp: '2',
                  })}
                >
                  {#if post.date}<span>{post.date} · </span>{/if}
                  {#if post.series}<span>📚 {post.series} · </span>{/if}
                  {#each highlightParts(
                    query.trim().length > 0 && post.contentPreview !== undefined
                      ? pickContentSnippet(post.contentPreview, query)
                      : post.excerpt,
                    query,
                  ) as part, i (i)}
                    {#if part.hit}<mark class={hit}>{part.text}</mark
                      >{:else}{part.text}{/if}
                  {/each}
                </p>
                {#if post.tags.length > 0}
                  <div
                    class={css({
                      display: 'flex',
                      gap: '1',
                      mt: '1.5',
                      flexWrap: 'wrap',
                    })}
                  >
                    {#each post.tags.slice(0, 3) as name (name)}
                      <span class={tag}>{name}</span>
                    {/each}
                  </div>
                {/if}
              </a>
            {/each}
          {/if}
        </div>
      </div>

      <div
        class={css({
          display: { base: 'none', md: 'flex' },
          alignItems: 'center',
          gap: '4',
          px: '4',
          py: '2',
          borderTopWidth: 'hairline',
          borderColor: 'ink.100',
          fontSize: 'xs',
          color: 'ink.400',
          flexShrink: '0',
        })}
      >
        <span>↑↓ 이동</span>
        <span>↵ 선택</span>
        <span>esc 닫기</span>
      </div>
    </div>
  </div>
{/if}
