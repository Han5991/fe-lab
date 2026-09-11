<script lang="ts">
  import { onMount } from 'svelte';
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import ArchiveRow from '$lib/components/archive/ArchiveRow.svelte';
  import PostsArchive from '$lib/components/archive/PostsArchive.svelte';

  const { data }: PageProps = $props();

  const description = $derived(
    `${data.site.name}에 쓴 글 ${data.posts.length}편의 목록입니다. 번들러 구조, TypeScript 도메인 설계, React 패턴, 오픈소스 기여 경험을 다루며, 각 글은 직접 짠 코드와 실제로 부딪힌 문제를 함께 담고 있습니다.`,
  );

  /**
   * 필터 상태는 주소의 쿼리에서 오는데, 프리렌더에서는 그것을 읽을 수 없다
   * (SvelteKit이 `url.searchParams` 접근을 던진다 — 정적 파일 하나가 모든
   * 쿼리를 대표할 수 없다는 뜻이다). 그래서 산출물에는 **필터 없는 목록**이
   * 구워지고, 마운트 후에 인터랙티브 뷰로 갈린다.
   *
   * 그 폴백이 스피너가 아니라 글 목록인 것이 중요하다 — 아카이브 허브의
   * 내부 링크가 0개가 되면 크롤러가 글에 닿는 길이 하나 사라진다. React 판도
   * 같은 이유로 Suspense 폴백에 같은 행 컴포넌트를 세운다(회귀 이력이 있다).
   */
  let interactive = $state(false);
  onMount(() => {
    interactive = true;
  });

  const header = css({
    mb: '[30px]',
    pb: '[16px]',
    borderBottomWidth: '[1px]',
    borderBottomStyle: 'solid',
    borderColor: 'ink.border',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '[16px]',
    flexWrap: 'wrap',
  });

  const heading = css({
    fontSize: '[21px]',
    fontWeight: 'bold',
    color: 'ink.950',
  });

  const count = css({
    fontFamily: 'mono',
    fontWeight: 'normal',
    fontSize: '[12px]',
    color: 'ink.500',
    fontVariantNumeric: 'tabular-nums',
  });
</script>

<Seo
  title={`글 | ${data.site.name}`}
  {description}
  canonical={`${data.site.url}${data.paths.posts}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<Rail width="wide" class={css({ py: { base: '10', md: '16' } })}>
  <!-- 허브 문법에 맞춘 헤더 — 큰 타이틀 대신 21px 산세리프 + 모노 수치 한 줄,
       구분은 hairline 보더 하나로만. -->
  <header class={header}>
    <h1 class={heading}>모든 노트</h1>
    <span class={count}>{data.posts.length}편</span>
  </header>

  {#if interactive}
    <PostsArchive
      posts={data.posts}
      seriesItems={data.seriesItems}
      tagItems={data.tagItems}
      yearItems={data.yearItems}
    />
  {:else}
    <ol class={css({ listStyleType: 'none', p: '0', m: '0' })}>
      {#each data.posts as post (post.slug)}
        <ArchiveRow
          href={post.href}
          title={post.title}
          dateLabel={post.dateLabel}
        />
      {/each}
    </ol>
  {/if}
</Rail>
