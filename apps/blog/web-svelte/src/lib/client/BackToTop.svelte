<script lang="ts">
  import { onMount } from 'svelte';
  import { scale } from 'svelte/transition';
  import { css } from '../../../styled-system/css';

  /**
   * 맨 위로. `apps/blog/web/src/components/mobile/BackToTop.tsx`의 이식이다.
   * 300px 넘게 내려가면 나타난다.
   *
   * React 판은 motion으로 스케일 인/아웃 한다. 여기서는 svelte/transition의
   * `scale`이 같은 일을 한다.
   */
  const THRESHOLD = 300;

  let visible = $state(false);

  onMount(() => {
    const update = () => {
      visible = window.scrollY > THRESHOLD;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
    };
  });

  const button = css({
    pos: 'fixed',
    bottom: '6',
    right: '6',
    w: '12',
    h: '12',
    bg: 'paper.100',
    rounded: 'full',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'ink.900',
    // 떠 있는 버튼이지만 그림자 대신 hairline 보더로 본문과 분리한다.
    borderWidth: 'hairline',
    borderColor: 'ink.borderStrong',
    cursor: 'pointer',
    zIndex: '[40]',
    _hover: { color: 'accent.600', borderColor: 'accent.200' },
  });

  const icon = css({ w: '[24px]', h: '[24px]' });
</script>

{#if visible}
  <button
    type="button"
    onclick={() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }}
    transition:scale={{ duration: 200, start: 0.8 }}
    aria-label="맨 위로 이동"
    class={button}
  >
    <!-- lucide `arrow-up`과 같은 path다. -->
    <svg
      class={icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  </button>
{/if}
