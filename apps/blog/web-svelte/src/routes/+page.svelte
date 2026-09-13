<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import Hero from '$lib/components/Hero.svelte';
  import FeaturedPost from '$lib/components/FeaturedPost.svelte';
  import PostIndexRow from '$lib/components/PostIndexRow.svelte';
  import OssStrip from '$lib/components/OssStrip.svelte';
  import { POSTS_PATH } from '@blog/content/client';
  import { SITE_DESCRIPTION_EXPANDED } from '@blog/site-values';
  import { HOME_PATH } from '$lib/shared/routes';

  const { data }: PageProps = $props();
</script>

<Seo
  title={data.site.name}
  description={SITE_DESCRIPTION_EXPANDED}
  canonical={`${data.site.url}${HOME_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<div class={css({ bg: 'paper.50' })}>
  <Rail width="text" class={css({ pt: '[36px]', pb: '[48px]' })}>
    <Hero />

    {#if data.featured}
      <FeaturedPost {...data.featured} />
    {/if}

    <!-- 장식 없는 텍스트 리스트. 행이 스스로 "마지막"인지 알 수 없어 목록을
         닫는 아래 보더는 여기서 :last-child로 붙인다. -->
    <ol
      aria-label="최근 글"
      class={css({
        listStyleType: 'none',
        p: '0',
        m: '0',
        '& > li:last-child > a': {
          borderBottomWidth: 'hairline',
          borderBottomStyle: 'solid',
          borderBottomColor: 'ink.border',
        },
      })}
    >
      {#each data.recent as post (post.slug)}
        <li><PostIndexRow href={post.href} title={post.title} date={post.date} /></li>
      {/each}
    </ol>

    <a
      href={POSTS_PATH}
      class={css({
        display: 'inline-block',
        mt: '[14px]',
        fontSize: '[13px]',
        color: 'accent.600',
        textDecoration: 'none',
        _hover: { textDecoration: 'underline' },
      })}>모든 글 →</a
    >

    <OssStrip />
  </Rail>
</div>
