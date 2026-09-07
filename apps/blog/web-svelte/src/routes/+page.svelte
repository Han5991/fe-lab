<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import PostList from '$lib/components/PostList.svelte';
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

<Rail>
  <h1 class={css({ fontSize: '4xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    {data.site.name}
  </h1>
  <p class={css({ mt: '4', color: 'ink.600', maxW: 'railText' })}>
    {SITE_DESCRIPTION_EXPANDED}
  </p>

  <h2 class={css({ fontSize: 'xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    최근 글
  </h2>
  <PostList posts={data.posts} />
</Rail>
