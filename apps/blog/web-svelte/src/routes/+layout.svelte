<script lang="ts">
  import type { LayoutProps } from './$types';
  import { css } from '../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import SearchDialog from '$lib/client/SearchDialog.svelte';
  import ThemeToggle from '$lib/client/ThemeToggle.svelte';
  import NavLinks from '$lib/components/NavLinks.svelte';
  import { RSS_PATH } from '@blog/content/client';
  import { AUTHOR_GITHUB, AUTHOR_LINKEDIN } from '@blog/site-values';
  import { ABOUT_PATH, HOME_PATH, PRIVACY_PATH } from '$lib/shared/routes';
  import '../styles/globals.css';

  const { children }: LayoutProps = $props();

  const FOOTER_LINKS = [
    { href: ABOUT_PATH, label: 'About' },
    { href: PRIVACY_PATH, label: '개인정보' },
    { href: AUTHOR_GITHUB, label: 'GitHub' },
    { href: AUTHOR_LINKEDIN, label: 'LinkedIn' },
    { href: RSS_PATH, label: 'RSS' },
  ] as const;

  const footerLink = css({
    fontFamily: 'mono',
    fontSize: '[12px]',
    color: 'ink.500',
    textDecoration: 'none',
    transition: '[color 0.15s]',
    _hover: { color: 'ink.950' },
  });

  /** 저작권 연도는 빌드 시각이 아니라 렌더 시각이다 — React 판과 같다. */
  const year = new Date().getFullYear();
</script>

<header class={css({ borderBottomWidth: 'hairline', borderColor: 'ink.border' })}>
  <Rail width="wide">
    <div
      class={css({
        h: '[52px]',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: { base: '[10px]', md: '[16px]' },
      })}
    >
      <!-- 로고 표기만 sangwook.dev. metadata·JSON-LD의 사이트명(Frontend Lab)은
           검색 색인 보호를 위해 그대로 둔다 — 둘은 일부러 다르다. 예전에는
           여기가 `data.site.name`이라 헤더에 "Frontend Lab"이 찍혔다. -->
      <a
        href={HOME_PATH}
        class={css({
          fontFamily: 'mono',
          fontWeight: 'medium',
          fontSize: '[15px]',
          color: 'ink.950',
          textDecoration: 'none',
          transition: '[opacity 0.15s]',
          _hover: { opacity: '0.7' },
        })}>sangwook.dev</a
      >

      <div
        class={css({
          display: 'flex',
          alignItems: 'center',
          gap: { base: '[10px]', md: '[16px]' },
        })}
      >
        <NavLinks />
        <div class={css({ display: 'flex', alignItems: 'center', gap: '[4px]' })}>
          <SearchDialog />
          <ThemeToggle />
        </div>
      </div>
    </div>
  </Rail>
</header>

{@render children()}

<footer
  class={css({
    borderTopWidth: 'hairline',
    borderTopStyle: 'solid',
    borderColor: 'ink.border',
    mt: '[64px]',
    py: '[20px]',
  })}
>
  <Rail
    width="wide"
    class={css({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '[12px]',
    })}
  >
    <span class={css({ fontFamily: 'mono', fontSize: '[12px]', color: 'ink.500' })}>
      © {year} 한상욱
    </span>
    <div
      class={css({
        display: 'flex',
        gap: '[16px]',
        flexWrap: 'wrap',
        alignItems: 'center',
      })}
    >
      {#each FOOTER_LINKS as link (link.label)}
        <a
          href={link.href}
          target={link.href.startsWith('http') ? '_blank' : undefined}
          rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          class={footerLink}>{link.label}</a
        >
      {/each}
    </div>
  </Rail>
</footer>
