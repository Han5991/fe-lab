<script lang="ts">
  import { replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import {
    filterAndSortPostsByArchiveParams,
    parseTagParam,
  } from '@blog/content/client';
  import { css } from '../../../../styled-system/css';
  import Label from '../Label.svelte';
  import {
    ARCHIVE_DEFAULTS,
    archiveSearchString,
    readArchiveParams,
    type ArchiveParams,
    type SortKey,
    type ViewMode,
  } from '$lib/client/archiveParams';
  import { getAllViewCounts } from '$lib/domain/analytics';
  import ActiveFilters from './ActiveFilters.svelte';
  import ArchiveRow from './ArchiveRow.svelte';
  import ArchiveSearchBar from './ArchiveSearchBar.svelte';
  import PopularRail from './PopularRail.svelte';
  import PostGridCard from './PostGridCard.svelte';
  import PostsFilterFab from './PostsFilterFab.svelte';
  import PostsFilterPanel from './PostsFilterPanel.svelte';
  import PostsFilterSheet from './PostsFilterSheet.svelte';
  import type { ArchivePost, FilterItem, FilterPanelProps } from './types';

  /**
   * `/posts` 아카이브의 인터랙티브 뷰 — `PostsArchive.tsx`의 `PostsArchiveView`
   * 이식이다.
   *
   * **이 컴포넌트는 브라우저에서만 렌더된다.** SvelteKit은 프리렌더 중
   * `url.searchParams`를 읽으면 던지므로(정적 산출물 하나가 모든 쿼리를
   * 대표할 수 없다는 뜻이다) 필터 상태는 마운트 후에야 존재한다. React 판도
   * 같은 자리에서 같은 선택을 한다 — nuqs가 `useSearchParams`를 쓰는 탓에
   * `/posts/`가 프리렌더에서 통째로 빠지고(BAILOUT_TO_CLIENT_SIDE_RENDERING)
   * 정적 HTML에는 Suspense 폴백 목록만 남는다. 그 폴백을 여기서는
   * `+page.svelte`가 낸다.
   *
   * 상태의 정본은 **주소**가 아니라 아래 `params`다. 쓰기는 `replaceState`로
   * 주소에 비추기만 한다(히스토리 항목을 만들지 않는 것은 nuqs의 기본값과 같다).
   */
  const {
    posts,
    seriesItems,
    tagItems,
    yearItems,
  }: {
    posts: ArchivePost[];
    seriesItems: FilterItem[];
    tagItems: FilterItem[];
    yearItems: FilterItem[];
  } = $props();

  // 마운트 시점에 딱 한 번 주소를 읽는다. 이후 주소는 우리가 쓰는 쪽이다.
  let params = $state<ArchiveParams>(readArchiveParams(page.url.search));
  let sheetOpen = $state(false);
  /** slug → 조회수. '인기순'을 누르기 전까지는 요청하지 않는다(lazy). */
  let viewCounts = $state<Record<string, number>>({});
  let viewCountsRequested = false;

  function setParams(patch: Partial<ArchiveParams>) {
    params = { ...params, ...patch };
    replaceState(`${page.url.pathname}${archiveSearchString(params)}`, page.state);
  }

  const activeTags = $derived(parseTagParam(params.tag));

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    setParams({ tag: next.join(',') });
  }

  function toggleSeries(id: string) {
    setParams({ series: params.series === id ? '' : id });
  }

  function toggleYear(id: string) {
    setParams({ year: params.year === id ? '' : id });
  }

  /** 넷을 한 번에 지운다. 정렬·뷰는 화면 설정이라 남는다(React 판과 같다). */
  function clearAll() {
    setParams({ q: '', tag: '', series: '', year: '' });
  }

  $effect(() => {
    if (params.sort !== 'popular' || viewCountsRequested) return;
    viewCountsRequested = true;
    getAllViewCounts()
      .then(rows => {
        viewCounts = Object.fromEntries(
          rows.map(row => [row.slug, row.view_count]),
        );
      })
      .catch((error: unknown) => {
        // 조회수를 못 받으면 인기순이 날짜순으로 내려앉는다. 이 앱의 Supabase는
        // 로컬만 가리키므로 배포된 프리뷰에서는 언제나 그 경로다.
        console.error('조회수 조회 실패:', error);
      });
  });

  const filtered = $derived(
    filterAndSortPostsByArchiveParams(posts, {
      q: params.q,
      tags: activeTags,
      series: params.series || null,
      year: params.year || null,
      sort: params.sort,
      viewCounts: new Map(Object.entries(viewCounts)),
    }),
  );

  /** FAB·시트 헤더의 N 뱃지. 기본값이 아닌 정렬·뷰도 하나로 센다. */
  const activeCount = $derived(
    activeTags.length +
      (params.series ? 1 : 0) +
      (params.year ? 1 : 0) +
      (params.sort !== ARCHIVE_DEFAULTS.sort ? 1 : 0) +
      (params.view !== ARCHIVE_DEFAULTS.view ? 1 : 0),
  );

  /**
   * 필터 패널의 입력 한 묶음. 사이드바와 바텀시트가 **같은 패널**을 세우므로
   * 여기서 한 번 만들어 두 자리에 편다 — 열다섯 개를 두 번 적으면 한쪽만
   * 고쳤을 때 두 화면이 조용히 갈린다. React 판은 같은 자리에 JSX를 두 번
   * 적고 그 위험을 리뷰로 진다.
   */
  const panelProps: FilterPanelProps = $derived({
    sort: params.sort,
    onSortChange: (next: SortKey) => {
      setParams({ sort: next });
    },
    view: params.view,
    onViewChange: (next: ViewMode) => {
      setParams({ view: next });
    },
    tagItems,
    activeTags,
    onToggleTag: toggleTag,
    seriesItems,
    activeSeries: params.series || null,
    onToggleSeries: toggleSeries,
    yearItems,
    activeYear: params.year || null,
    onToggleYear: toggleYear,
  });

  const grid = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', md: '[240px 1fr]' },
    gap: { base: '4', md: '12' },
  });

  const sidebar = css({
    // 모바일에서는 사이드바를 숨기고 FAB + 바텀시트로 필터를 연다.
    display: { base: 'none', md: 'flex' },
    position: { md: 'sticky' },
    top: { md: '20' },
    alignSelf: { md: 'start' },
    maxH: { md: '[calc(100vh - 88px)]' },
    overflowY: { md: 'auto' },
    flexDir: 'column',
    gap: '7',
  });

  const railBlock = css({
    pt: '6',
    borderTopWidth: '[1px]',
    borderTopStyle: 'solid',
    borderColor: 'ink.border',
  });

  const mobileOnly = css({ display: { base: 'block', md: 'none' }, mb: '4' });

  const mobileRailBlock = css({
    display: { base: 'block', md: 'none' },
    mt: '10',
    pt: '6',
    borderTopWidth: '[1px]',
    borderTopStyle: 'solid',
    borderColor: 'ink.border',
  });

  const countRow = css({
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    mb: '4',
  });

  const empty = css({
    py: '20',
    textAlign: 'center',
    display: 'flex',
    flexDir: 'column',
    alignItems: 'center',
    gap: '3',
  });

  const emptyTitle = css({
    fontSize: '[16px]',
    fontWeight: 'semibold',
    color: 'ink.950',
  });

  const emptyHint = css({ fontSize: '[13px]', color: 'ink.600' });

  const emptyButton = css({
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
  });

  const cards = css({
    display: 'grid',
    gridTemplateColumns: {
      base: '1fr',
      sm: '[repeat(2, 1fr)]',
      lg: '[repeat(3, 1fr)]',
    },
    gap: '6',
  });

  const rows = css({ listStyleType: 'none', p: '0', m: '0' });
</script>

<div class={grid}>
  <aside class={sidebar}>
    <ArchiveSearchBar
      value={params.q}
      onChange={(next: string) => {
        setParams({ q: next });
      }}
    />
    <PostsFilterPanel {...panelProps} />
    <!-- 인기 글 레일은 데스크톱 사이드바 하단과 모바일 목록 아래에 한 번씩
         선다. 브레이크포인트상 배타적으로만 보인다. -->
    <div class={railBlock}>
      <PopularRail {posts} />
    </div>
  </aside>

  <div>
    <!-- 모바일 전용 검색창. 데스크톱은 사이드바 안의 것을 그대로 쓴다. -->
    <div class={mobileOnly}>
      <ArchiveSearchBar
        value={params.q}
        onChange={(next: string) => {
          setParams({ q: next });
        }}
      />
    </div>

    <ActiveFilters
      tags={activeTags}
      series={params.series || null}
      year={params.year || null}
      onRemoveTag={toggleTag}
      onClearSeries={() => {
        setParams({ series: '' });
      }}
      onClearYear={() => {
        setParams({ year: '' });
      }}
      onClearAll={clearAll}
    />

    <div class={countRow}>
      <!-- 아래 카드·행 제목이 h3라 이 라벨이 span이면 페이지 h1에서 h3로
           건너뛴다(axe heading-order). 목록의 섹션 헤딩으로 올린다. -->
      <Label as="h2">{filtered.length}편</Label>
    </div>

    {#if filtered.length === 0}
      <div class={empty}>
        <p class={emptyTitle}>조건에 맞는 글이 없습니다.</p>
        <p class={emptyHint}>필터를 풀거나 다른 검색어로 시도해보세요.</p>
        <button type="button" onclick={clearAll} class={emptyButton}>
          모두 지우기
        </button>
      </div>
    {:else if params.view === 'cards'}
      <div class={cards}>
        <!-- 앞의 2개만 우선 로드하고 나머지는 lazy — 목록 전체를 한꺼번에 받으면
             첫 화면 이미지가 대역폭을 뺏겨 LCP가 밀린다. `loading`은 정적
             속성이라 브레이크포인트별로 달리 줄 수 없는데 그리드는 모바일 1열 /
             sm 2열 / lg 3열이다. 가장 좁은 화면에 맞춰 잡아야 "안 보이는 이미지를
             high로 요청"하는 일이 없다. -->
        {#each filtered as post, i (post.slug)}
          <PostGridCard {post} priority={i < 2} />
        {/each}
      </div>
    {:else}
      <ol class={rows}>
        {#each filtered as post (post.slug)}
          <ArchiveRow
            href={post.href}
            title={post.title}
            dateLabel={post.dateLabel}
          />
        {/each}
      </ol>
    {/if}

    <!-- 모바일 전용 인기 글 레일 — 목록을 밀어내지 않도록 아래에 둔다. -->
    <div class={mobileRailBlock}>
      <PopularRail {posts} />
    </div>
  </div>
</div>

<!-- FAB·시트는 grid 자식으로 두면 fixed여도 DOM상 grid item이 되므로 바깥의
     형제로 분리한다(React 판과 같은 이유). -->
<PostsFilterFab
  onClick={() => {
    sheetOpen = true;
  }}
  {activeCount}
/>
<PostsFilterSheet
  open={sheetOpen}
  onClose={() => {
    sheetOpen = false;
  }}
  onClearAll={clearAll}
  {activeCount}
>
  <PostsFilterPanel {...panelProps} />
</PostsFilterSheet>
