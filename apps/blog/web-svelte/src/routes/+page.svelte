<script lang="ts">
  import { css } from '../../styled-system/css';
</script>

<svelte:head>
  <title>Frontend Lab — SvelteKit 뼈대</title>
</svelte:head>

<main class={css({ maxW: '3xl', mx: 'auto', px: '6', py: '16' })}>
  <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950' })}>
    SvelteKit 뼈대
  </h1>
  <p class={css({ mt: '4', color: 'ink.600' })}>
    이 페이지는 정적 export와 Panda 토큰 배선이 살아 있는지만 확인한다. 화면은
    PR 2부터 들어온다.
  </p>
</main>
