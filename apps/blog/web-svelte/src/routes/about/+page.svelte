<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { ABOUT_PATH } from '$lib/shared/routes';
  import {
    AUTHOR_ALTERNATE_NAME,
    AUTHOR_GITHUB,
    AUTHOR_LINKEDIN,
    AUTHOR_NAME,
    AUTHOR_ROLE,
  } from '@blog/site-values';

  const { data }: PageProps = $props();

  const description = `${AUTHOR_NAME}(${AUTHOR_ALTERNATE_NAME}) — ${AUTHOR_ROLE}. 번들러 구조와 타입 설계를 직접 만들어 보며 실험하고, Mantine·Node.js·Next.js에 기여하며 배운 것을 글로 남깁니다. 이 블로그를 만든 사람의 소개입니다.`;
</script>

<Seo
  title={`소개 | ${data.site.name}`}
  {description}
  canonical={`${data.site.url}${ABOUT_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<Rail width="text">
  <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    소개
  </h1>
  <p class={css({ mt: '6', color: 'ink.950', lineHeight: 'relaxed' })}>
    {description}
  </p>
  <ul class={css({ listStyle: 'none', mt: '8', display: 'grid', gap: '2' })}>
    <li>
      <a href={AUTHOR_GITHUB} class={css({ color: 'accent.600' })}>GitHub</a>
    </li>
    <li>
      <a href={AUTHOR_LINKEDIN} class={css({ color: 'accent.600' })}>LinkedIn</a>
    </li>
  </ul>
</Rail>
