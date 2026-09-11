<script lang="ts">
  import { css, cva } from '../../../../styled-system/css';
  import Label from '../Label.svelte';
  import type { FilterItem } from './types';

  /**
   * 태그·시리즈·연도 필터 그룹.
   * `apps/blog/web/src/components/blog/FilterGroup.tsx`의 이식이다.
   */
  const {
    label,
    items,
    active,
    onToggle,
  }: {
    label: string;
    items: FilterItem[];
    active: string[];
    onToggle: (id: string) => void;
  } = $props();

  const filterItem = cva({
    base: {
      width: 'full',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: '[8px]',
      px: '[8px]',
      py: '[4px]',
      rounded: '[6px]',
      fontSize: 'sm',
      textAlign: 'left',
      transition: '[color 0.15s, background-color 0.15s]',
      cursor: 'pointer',
      _hover: { color: 'ink.950', bg: 'paper.200' },
    },
    variants: {
      active: {
        true: { fontWeight: 'semibold', color: 'ink.950', bg: 'paper.200' },
        false: { fontWeight: 'normal', color: 'ink.700', bg: 'transparent' },
      },
    },
    defaultVariants: { active: false },
  });

  const countPill = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minW: '[20px]',
    px: '[6px]',
    rounded: '[2rem]',
    bg: 'paper.300',
    color: 'ink.600',
    fontSize: 'xs',
    fontWeight: 'medium',
    lineHeight: 'flat',
    fontVariantNumeric: 'tabular-nums',
  });
</script>

{#if items.length > 0}
  <div class={css({ display: 'flex', flexDir: 'column', gap: '[6px]' })}>
    <Label class={css({ display: 'block', mb: '[2px]' })}>{label}</Label>
    <ul
      class={css({
        listStyleType: 'none',
        p: '0',
        m: '0',
        display: 'flex',
        flexDir: 'column',
      })}
    >
      {#each items as item (item.id)}
        <li>
          <button
            type="button"
            aria-pressed={active.includes(item.id)}
            onclick={() => {
              onToggle(item.id);
            }}
            class={filterItem({ active: active.includes(item.id) })}
          >
            <span>{item.label}</span>
            <span class={countPill}>{item.count}</span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}
