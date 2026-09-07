<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { PRIVACY_PATH } from '$lib/shared/routes';

  const { data }: PageProps = $props();

  const description =
    '이 블로그가 수집하는 정보와 사용하는 서드파티 서비스, 그리고 쿠키 사용 범위를 정리한 개인정보 처리방침입니다. 방문자가 남기는 기록이 어디에 어떤 형태로 쌓이고 얼마나 보관되는지, 무엇을 끄고 켤 수 있는지 밝혀 둡니다.';
</script>

<Seo
  title={`개인정보 처리방침 | ${data.site.name}`}
  {description}
  canonical={`${data.site.url}${PRIVACY_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<Rail width="text">
  <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950', mt: '16' })}>
    개인정보 처리방침
  </h1>
  <p class={css({ mt: '6', color: 'ink.950', lineHeight: 'relaxed' })}>
    {description}
  </p>
  <p class={css({ mt: '4', color: 'ink.600', fontSize: 'sm' })}>
    이 페이지는 React 판(<code>apps/blog/web</code>)의 내용을 아직 옮기지 않았습니다.
    분석·댓글 등 서드파티가 붙는 PR에서 함께 채웁니다.
  </p>
</Rail>
