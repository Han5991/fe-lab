<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../../styled-system/css';
  import Seo from '$lib/components/Seo.svelte';
  import PostHeader from '$lib/components/PostHeader.svelte';
  import PostHero from '$lib/components/PostHero.svelte';
  import PostNavigation from '$lib/components/PostNavigation.svelte';
  import Rail from '$lib/components/Rail.svelte';
  import { postProse } from '$lib/shared/postProse';
  import Comments from '$lib/client/Comments.svelte';
  import ImageZoom from '$lib/client/ImageZoom.svelte';
  import Mermaid from '$lib/client/Mermaid.svelte';
  import RecordRecentView from '$lib/client/RecordRecentView.svelte';
  import ViewCount from '$lib/client/ViewCount.svelte';

  const { data }: PageProps = $props();

  /**
   * 셸은 wide 레일이라 헤더·/posts와 좌우 끝이 같고, 그 안에서 본문이 text
   * 레일(680)을 차지하고 차례가 오른쪽 끝에 붙는다.
   *
   * 차례 칼럼 268px은 React 판과 같은 폭이다. 240px에서는 한국어 헤딩이
   * 대부분 두 줄로 접혀 목록이 두 배로 길어진다. wide(1200) − 차례(268) −
   * 간격(64) = 868px이라 본문 칼럼(railText 680)에는 영향이 없다.
   */
  const shell = css({
    display: 'grid',
    gridTemplateColumns: { base: '1fr', lg: '[1fr 268px]' },
    gap: { base: '0', lg: '16' },
    alignItems: 'start',
  });

  const article = css({
    maxW: 'railText',
    minW: '0',
    mx: { base: 'auto', lg: '0' },
    w: 'full',
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

<div class={css({ py: { base: '10', md: '14' }, bg: 'paper.50' })}>
  <Rail width="wide" class={shell}>
    <article class={article}>
      <PostHeader
        title={data.post.title}
        date={data.post.date}
        dateLabel={data.post.dateLabel}
        readMin={data.post.readMin}
        excerpt={data.post.excerpt}
        tags={data.post.tags}
        seriesIndex={data.seriesIndex}
      />

      <PostHero
        title={data.post.title}
        hero={data.post.hero}
        thumbnailUrl={data.post.thumbnailUrl}
      />

      <!-- 빌드 타임에 remark/rehype로 만든 HTML. 원고는 이 저장소가 쓰는
           것이라 신뢰 경계 안이고, 파서는 클라이언트 번들에 실리지 않는다. -->
      <div id="post-content" class={postProse}>{@html data.post.html}</div>

      <div class={css({ mt: '10' })}><Comments /></div>
    </article>
  </Rail>
</div>

<!-- 본문 셸과 같은 wide 레일이라 왼쪽 끝이 본문과 맞는다. -->
<Rail width="wide">
  <PostNavigation prev={data.nav.prev} next={data.nav.next} series={data.nav.series} />
</Rail>

<!-- 점진적 향상 — 서버는 아무 일도 하지 않고, 필요할 때만 청크를 받는다. -->
<Mermaid />
<ImageZoom />
<RecordRecentView slug={data.post.slug} title={data.post.title} />
<ViewCount slug={data.post.slug} />
