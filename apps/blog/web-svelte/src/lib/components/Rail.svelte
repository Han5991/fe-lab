<script lang="ts">
  import type { Snippet } from 'svelte';
  import { css, cx } from '../../../styled-system/css';

  /**
   * 레일·거터의 단일 출처. `apps/blog/web/src/components/Rail.tsx`와 같은 계약이다.
   *
   * **페이지에서 maxW와 px를 직접 쓰지 않는다.** 거터(px)는 언제나 레일 바깥에
   * 있어서, railText를 쓴 화면의 글줄이 좁아져도 좌우 여백은 그대로다.
   *
   * **기본값은 `text`다 — React 판 `defaultVariants: { width: 'text' }`와 같아야
   * 한다.** 여기가 `wide`였을 때 `<Rail>`을 그냥 쓴 화면(홈·시리즈)이 680이 아니라
   * 1200으로 퍼져서, 같은 토큰을 쓰고도 두 사이트의 글줄 폭이 달랐다. 기본값에
   * 기대지 말고 호출부가 폭을 명시하는 것이 더 안전하지만, 두 판의 계약이
   * 어긋나 있는 것 자체가 버그라 기본값도 맞춘다.
   */
  const {
    width = 'text',
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
