<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import ImageZoom from '$lib/client/ImageZoom.svelte';
  import Mermaid from '$lib/client/Mermaid.svelte';

  const { data }: PageProps = $props();

  const prose = css({
    mt: '10',
    color: 'ink.950',
    lineHeight: 'relaxed',
    '& h2': { fontSize: '2xl', fontWeight: 'bold', mt: '12', mb: '4' },
    '& h3': { fontSize: 'xl', fontWeight: 'bold', mt: '10', mb: '3' },
    '& p': { my: '4' },
    '& ul, & ol': { my: '4', pl: '6' },
    '& li': { my: '1' },
    '& a': { color: 'accent.600' },
    '& code': { fontFamily: 'mono', fontSize: 'sm' },
    '& pre': {
      my: '6',
      p: '4',
      overflowX: 'auto',
      borderRadius: 'md',
      bg: 'ink.100',
    },
    '& img': { maxW: 'full', height: 'auto' },
    '& blockquote': {
      my: '6',
      pl: '4',
      borderLeftWidth: '[2px]',
      borderColor: 'ink.border',
      color: 'ink.600',
    },
    '& table': { my: '6', width: 'full', display: 'block', overflowX: 'auto' },
  });
</script>

<Seo
  title={data.seo.title}
  description={data.seo.description}
  canonical={`${data.site.url}${data.seo.canonicalPath}`}
  ogImage={data.seo.openGraph.images[0]?.url ??
    `${data.site.url}${data.site.ogDefaultImage}`}
  ogType="article"
  siteName={data.site.name}
/>

<Rail width="text">
  <article>
    <header class={css({ mt: '16' })}>
      <h1 class={css({ fontSize: '3xl', fontWeight: 'bold', color: 'ink.950' })}>
        {data.post.title}
      </h1>
      <p class={css({ mt: '3', color: 'ink.600', fontSize: 'sm' })}>
        {#if data.post.date}<time datetime={data.post.date}>{data.post.date}</time> ·
        {/if}{data.post.readMin}분
      </p>
    </header>
    <!-- 빌드 타임에 remark/rehype로 만든 HTML. 원고는 이 저장소가 쓰는 것이라
         신뢰 경계 안이고, 파서는 클라이언트 번들에 실리지 않는다. -->
    <div id="post-content" class={prose}>{@html data.post.html}</div>
  </article>
</Rail>

<!-- 점진적 향상 — 서버는 아무 일도 하지 않고, 필요할 때만 청크를 받는다. -->
<Mermaid />
<ImageZoom />
