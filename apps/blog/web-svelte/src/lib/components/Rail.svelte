<script lang="ts">
  import type { Snippet } from 'svelte';
  import { css, cx } from '../../../styled-system/css';

  /**
   * 레일·거터의 단일 출처. `apps/blog/web/src/components/Rail.tsx`와 같은 계약이다.
   *
   * **페이지에서 maxW와 px를 직접 쓰지 않는다.** 거터(px)는 언제나 레일 바깥에
   * 있어서, railText를 쓴 화면의 글줄이 좁아져도 좌우 여백은 그대로다.
   */
  const {
    width = 'wide',
    class: className,
    children,
  }: {
    width?: 'wide' | 'text' | 'form';
    class?: string;
    children: Snippet;
  } = $props();

  const gutter = css({ px: { base: '5', md: '8' } });
  const widths = {
    wide: css({ maxW: 'railWide', mx: 'auto' }),
    text: css({ maxW: 'railText', mx: 'auto' }),
    form: css({ maxW: 'railForm', mx: 'auto' }),
  } as const;
</script>

<div class={gutter}>
  <div class={cx(widths[width], className)}>
    {@render children()}
  </div>
</div>
