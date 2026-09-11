<script lang="ts">
  import type { LayoutProps } from './$types';
  import { css } from '../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import SearchDialog from '$lib/client/SearchDialog.svelte';
  import ThemeToggle from '$lib/client/ThemeToggle.svelte';
  import { HOME_PATH } from '$lib/shared/routes';
  import '../styles/globals.css';

  const { children, data }: LayoutProps = $props();

  // 내부 href는 전부 스스로 후행 슬래시를 단다 — 호스팅의
  // force-trailing-slash와 짝이고, 어긋나면 클릭마다 리다이렉트를 한 번 더 탄다.
  // check-seo의 link-trailing-slash가 산출물에서 검사한다.
  const nav = $derived([
    { href: data.paths.posts, label: '글' },
    { href: data.paths.series, label: '시리즈' },
    { href: data.paths.about, label: '소개' },
  ]);

  const link = css({
    color: 'ink.600',
    textDecoration: 'none',
    _hover: { color: 'ink.950' },
  });
</script>

<header class={css({ borderBottomWidth: 'hairline', borderColor: 'ink.border', py: '5' })}>
  <Rail>
    <nav
      class={css({ display: 'flex', alignItems: 'baseline', gap: '6' })}
      aria-label="주요"
    >
      <a
        href={HOME_PATH}
        class={css({
          fontWeight: 'bold',
          color: 'ink.950',
          textDecoration: 'none',
          mr: 'auto',
        })}>{data.site.name}</a
      >
      {#each nav as item (item.href)}
        <a href={item.href} class={link}>{item.label}</a>
      {/each}
      <SearchDialog />
      <ThemeToggle />
    </nav>
  </Rail>
</header>

{@render children()}

<footer
  class={css({
    borderTopWidth: 'hairline',
    borderColor: 'ink.border',
    mt: '20',
    py: '8',
    color: 'ink.600',
    fontSize: 'sm',
  })}
>
  <Rail>
    <p>© {data.site.name}</p>
  </Rail>
</footer>
