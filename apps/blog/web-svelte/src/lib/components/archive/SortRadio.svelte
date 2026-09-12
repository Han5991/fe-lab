<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import Label from '../Label.svelte';
  import type { SortKey } from '$lib/client/archiveParams';
  import { segmentedItem } from './segmented';

  /** 정렬 라디오. `apps/blog/web/src/components/blog/SortRadio.tsx`의 이식이다. */
  const {
    value,
    onChange,
  }: { value: SortKey; onChange: (next: SortKey) => void } = $props();

  const OPTIONS: { id: SortKey; label: string }[] = [
    { id: 'recent', label: '최신순' },
    { id: 'popular', label: '인기순' },
    { id: 'shortest', label: '짧은 글부터' },
  ];

  const group = css({
    listStyleType: 'none',
    p: '0',
    m: '0',
    display: 'inline-flex',
    alignItems: 'stretch',
    bg: 'paper.100',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: '[6px]',
    overflow: 'hidden',
  });

  const cellFirst = css({ display: 'flex', borderLeftWidth: '[0]' });
  const cell = css({
    display: 'flex',
    borderLeftWidth: '[1px]',
    borderLeftStyle: 'solid',
    borderLeftColor: 'ink.border',
  });
</script>

<div class={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
  <Label>정렬</Label>
  <ul role="radiogroup" aria-label="정렬" class={group}>
    {#each OPTIONS as opt, i (opt.id)}
      <li class={i === 0 ? cellFirst : cell}>
        <button
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          onclick={() => {
            onChange(opt.id);
          }}
          class={segmentedItem({ kind: 'radio', active: value === opt.id })}
        >
          {opt.label}
        </button>
      </li>
    {/each}
  </ul>
</div>
