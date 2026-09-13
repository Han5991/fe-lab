<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import Label from '../Label.svelte';
  import type { ViewMode } from '$lib/client/archiveParams';
  import { segmentedItem } from './segmented';

  /** 리스트/카드 전환. `apps/blog/web/src/components/blog/ViewToggle.tsx`의 이식이다. */
  const {
    value,
    onChange,
  }: { value: ViewMode; onChange: (next: ViewMode) => void } = $props();

  const OPTIONS: { id: ViewMode; label: string }[] = [
    { id: 'list', label: '리스트' },
    { id: 'cards', label: '카드' },
  ];

  const tabs = css({
    display: 'flex',
    borderWidth: '[1px]',
    borderColor: 'ink.border',
    rounded: '[6px]',
    overflow: 'hidden',
  });
</script>

<div class={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
  <Label>뷰</Label>
  <div role="tablist" aria-label="뷰" class={tabs}>
    {#each OPTIONS as opt (opt.id)}
      <button
        type="button"
        role="tab"
        aria-selected={value === opt.id}
        onclick={() => {
          onChange(opt.id);
        }}
        class={segmentedItem({ kind: 'tab', active: value === opt.id })}
      >
        {opt.label}
      </button>
    {/each}
  </div>
</div>
