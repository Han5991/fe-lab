<script lang="ts">
  import type { Snippet } from 'svelte';
  import { css, cx } from '../../../styled-system/css';

  /**
   * 대문자 모노 라벨. `apps/blog/web/src/components/blog/Label.tsx`의 이식이다.
   *
   * 기본 태그는 의미 없는 `span`이지만, 라벨이 섹션 제목 역할을 하는 자리에서는
   * 레벨을 건너뛰지 않도록 헤딩으로 올린다.
   */
  const {
    as = 'span',
    class: className,
    children,
  }: { as?: 'span' | 'h2'; class?: string; children: Snippet } = $props();

  const base = css({
    fontFamily: 'mono',
    fontSize: 'xs',
    fontWeight: 'medium',
    letterSpacing: 'mono',
    textTransform: 'uppercase',
    color: 'ink.500',
  });
</script>

{#if as === 'h2'}
  <h2 class={cx(base, className)}>{@render children()}</h2>
{:else}
  <span class={cx(base, className)}>{@render children()}</span>
{/if}
