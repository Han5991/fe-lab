<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import { tagPillRaw } from '../tagPill';

  /**
   * 지금 걸린 필터를 칩으로 보여 주고, 칩을 누르면 그것만 푼다.
   * `apps/blog/web/src/components/blog/ActiveFilters.tsx`의 이식이다.
   */
  const {
    tags,
    series,
    year,
    onRemoveTag,
    onClearSeries,
    onClearYear,
    onClearAll,
  }: {
    tags: string[];
    series: string | null;
    year: string | null;
    onRemoveTag: (tag: string) => void;
    onClearSeries: () => void;
    onClearYear: () => void;
    onClearAll: () => void;
  } = $props();

  const total = $derived(tags.length + (series ? 1 : 0) + (year ? 1 : 0));

  const bar = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    flexWrap: 'wrap',
    py: '3',
    mb: '4',
    borderTopWidth: '[1px]',
    borderBottomWidth: '[1px]',
    borderColor: 'ink.border',
  });

  const chip = css(tagPillRaw, {
    gap: '[6px]',
    color: 'ink.800',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: '[all 0.15s]',
    _hover: { bg: 'paper.300', color: 'ink.950' },
  });

  const removeIcon = css({
    fontSize: '[10px]',
    color: 'ink.500',
    lineHeight: 'flat',
  });

  const clearAllLink = css({
    ml: '2',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'accent.600',
    cursor: 'pointer',
    textDecorationLine: 'underline',
    textDecorationColor: 'transparent',
    textUnderlineOffset: '[2px]',
    transition: '[text-decoration-color 0.15s]',
    _hover: { textDecorationColor: 'accent.600' },
  });
</script>

{#if total > 0}
  <div class={bar}>
    <span
      class={css({ fontSize: '[12px]', fontWeight: 'medium', color: 'ink.500' })}
      >필터</span
    >
    {#if series}
      <button type="button" onclick={onClearSeries} class={chip}>
        {series}
        <span class={removeIcon}>✕</span>
      </button>
    {/if}
    {#if year}
      <button type="button" onclick={onClearYear} class={chip}>
        {year}
        <span class={removeIcon}>✕</span>
      </button>
    {/if}
    {#each tags as tag (tag)}
      <button
        type="button"
        onclick={() => {
          onRemoveTag(tag);
        }}
        class={chip}
      >
        #{tag}
        <span class={removeIcon}>✕</span>
      </button>
    {/each}
    <button type="button" onclick={onClearAll} class={clearAllLink}>
      모두 지우기
    </button>
  </div>
{/if}
