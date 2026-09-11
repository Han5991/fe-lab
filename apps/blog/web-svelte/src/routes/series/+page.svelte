<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { SERIES_PATH } from '$lib/shared/routes';

  const { data }: PageProps = $props();

  const description = $derived(
    `여러 편으로 이어지는 글 묶음 ${data.series.length}개입니다. 각 시리즈는 1편부터 순서대로 읽도록 정리돼 있고, 하나의 주제를 처음부터 끝까지 직접 만들어 가며 겪은 시행착오와 그때 내린 결정, 그리고 되돌아본 판단까지 순서대로 따라갈 수 있습니다.`,
  );
</script>

<Seo
  title={`시리즈 | ${data.site.name}`}
  {description}
  canonical={`${data.site.url}${SERIES_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<Rail>
  <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    시리즈
  </h1>
  <ul class={css({ listStyle: 'none', mt: '6', display: 'grid', gap: '8' })}>
    {#each data.series as s (s.id)}
      <li>
        <h2 class={css({ fontSize: 'lg', fontWeight: 'bold', color: 'ink.950' })}>
          {s.title}
        </h2>
        {#if s.description}
          <p class={css({ mt: '2', color: 'ink.600', fontSize: 'sm' })}>
            {s.description}
          </p>
        {/if}
        <p class={css({ mt: '2', color: 'ink.600', fontSize: 'xs' })}>{s.count}편</p>
      </li>
    {/each}
  </ul>
</Rail>
