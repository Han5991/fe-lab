<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import FilterGroup from './FilterGroup.svelte';
  import SortRadio from './SortRadio.svelte';
  import ViewToggle from './ViewToggle.svelte';
  import type { FilterPanelProps } from './types';

  /**
   * 아카이브 필터 컨트롤 패널 — **데스크톱 사이드바와 모바일 바텀시트 두 곳에서
   * 똑같이 렌더된다.** `PostsFilterPanel.tsx`의 이식이다.
   */
  const {
    sort,
    onSortChange,
    view,
    onViewChange,
    tagItems,
    activeTags,
    onToggleTag,
    seriesItems,
    activeSeries,
    onToggleSeries,
    yearItems,
    activeYear,
    onToggleYear,
  }: FilterPanelProps = $props();

  /** 그룹 사이 구분은 hairline 보더 하나로만. */
  const groupBlock = css({
    display: 'flex',
    flexDir: 'column',
    gap: '[12px]',
    pt: '[12px]',
    borderTopWidth: '[1px]',
    borderTopStyle: 'solid',
    borderTopColor: 'ink.border',
  });

  /** 태그는 상위 12개만. 전부 세우면 사이드바가 목록보다 길어진다. */
  const visibleTags = $derived(tagItems.slice(0, 12));
</script>

<div class={css({ display: 'flex', flexDir: 'column', gap: '[16px]' })}>
  <div class={css({ display: 'flex', flexDir: 'column', gap: '[12px]' })}>
    <SortRadio value={sort} onChange={onSortChange} />
    <ViewToggle value={view} onChange={onViewChange} />
  </div>

  {#if tagItems.length > 0}
    <div class={groupBlock}>
      <FilterGroup
        label="태그"
        items={visibleTags}
        active={activeTags}
        onToggle={onToggleTag}
      />
    </div>
  {/if}

  {#if seriesItems.length > 0}
    <div class={groupBlock}>
      <FilterGroup
        label="시리즈"
        items={seriesItems}
        active={activeSeries ? [activeSeries] : []}
        onToggle={onToggleSeries}
      />
    </div>
  {/if}

  {#if yearItems.length > 0}
    <div class={groupBlock}>
      <FilterGroup
        label="연도"
        items={yearItems}
        active={activeYear ? [activeYear] : []}
        onToggle={onToggleYear}
      />
    </div>
  {/if}
</div>
