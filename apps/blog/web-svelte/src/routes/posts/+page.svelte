<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import PostList from '$lib/components/PostList.svelte';

  const { data }: PageProps = $props();

  const description = $derived(
    `${data.site.name}에 쓴 글 ${data.posts.length}편의 목록입니다. 번들러 구조, TypeScript 도메인 설계, React 패턴, 오픈소스 기여 경험을 다루며, 각 글은 직접 짠 코드와 실제로 부딪힌 문제를 함께 담고 있습니다.`,
  );
</script>

<Seo
  title={`글 | ${data.site.name}`}
  {description}
  canonical={`${data.site.url}${data.paths.posts}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<Rail>
  <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    글
  </h1>
  <PostList posts={data.posts} />
</Rail>
