<script lang="ts">
  import type { PageProps } from './$types';
  import { css } from '../../../styled-system/css';
  import Rail from '$lib/components/Rail.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import {
    postRowBorderRaw,
    postRowLinkLayoutRaw,
    postRowMeta,
    postRowMetaRaw,
  } from '$lib/components/postRow';
  import { SERIES_PATH } from '$lib/shared/routes';
  import { POSTS_PATH } from '@blog/content/client';

  /** `apps/blog/web/src/app/series/page.tsx`의 이식이다. */
  const { data }: PageProps = $props();

  /**
   * 화면 헤더에도 그대로 나가는 소개 문구다 — meta description과 눈에 보이는
   * 문구가 갈라지지 않게 하나만 둔다.
   */
  const PAGE_DESCRIPTION =
    '여러 편으로 이어지는 글을 시리즈로 묶었습니다. 번들러 직접 만들기, TypeScript로 설계하는 프로젝트, 우아한 에러 핸들링, ECS 배포 파이프라인까지 — 시리즈마다 1편부터 순서대로, 중간에 길을 잃지 않고 읽을 수 있습니다.';

  const seriesBadge = css({
    display: 'inline-block',
    fontFamily: 'sans',
    fontSize: '[12px]',
    lineHeight: 'snug',
    color: 'accent.600',
    bg: 'accent.50',
    rounded: '[6px]',
    px: '[9px]',
    py: '[2px]',
  });

  // 목록 행 — 마지막 행에 아래 보더를 더해 목록이 열린 채로 끝나지 않게 한다.
  const rowItem = css(postRowBorderRaw, {
    _last: { borderBottomWidth: 'hairline', borderBottomStyle: 'solid' },
  });
  // 아카이브·시리즈 행의 hover는 제목만 색+밑줄로 반응한다.
  const rowLink = css(postRowLinkLayoutRaw, {
    textDecoration: 'none',
    _hover: { '& h3': { color: 'accent.600', textDecorationLine: 'underline' } },
  });
  const rowTitle = css({
    minW: '0',
    fontSize: '[14px]',
    fontWeight: 'normal',
    lineHeight: 'snug',
    color: 'ink.950',
    transition: '[color 0.15s]',
  });
</script>

<Seo
  title="시리즈 | Frontend Lab"
  description={PAGE_DESCRIPTION}
  canonical={`${data.site.url}${SERIES_PATH}`}
  ogImage={`${data.site.url}${data.site.ogDefaultImage}`}
  siteName={data.site.name}
/>

<div class={css({ bg: 'paper.50' })}>
  <!-- 허브 계열 페이지는 홈·글 본문과 같은 text 레일을 쓴다. -->
  <Rail width="text" class={css({ py: { base: '10', md: '16' } })}>
    <header class={css({ mb: '[30px]' })}>
      <h1
        class={css({
          fontSize: '[21px]',
          fontWeight: 'bold',
          color: 'ink.950',
          mb: '[8px]',
        })}
      >
        시리즈
      </h1>
      <p class={css({ fontSize: '[14px]', color: 'ink.600', lineHeight: 'relaxed' })}>
        {PAGE_DESCRIPTION}
      </p>
      {#if data.series.length > 0}
        <p class={css(postRowMetaRaw, { mt: '[10px]' })}>
          {data.series.length}개 시리즈 · {data.totalPosts}편
        </p>
      {/if}
    </header>

    {#if data.series.length === 0}
      <p
        class={css({
          py: '[24px]',
          borderTopWidth: '[1px]',
          borderTopStyle: 'solid',
          borderColor: 'ink.border',
          fontSize: '[14px]',
          color: 'ink.600',
        })}
      >
        아직 묶인 시리즈가 없습니다.
        <a
          href={POSTS_PATH}
          class={css({ color: 'accent.600', _hover: { textDecorationLine: 'underline' } })}
          >전체 글 목록</a
        >에서 모든 글을 볼 수 있습니다.
      </p>
    {:else}
      {#each data.series as entry (entry.id)}
        <section class={css({ mb: '[34px]', _last: { mb: '0' } })}>
          <div
            class={css({
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '[16px]',
              mb: '[8px]',
            })}
          >
            <!-- 배지 자체가 그 시리즈로 필터된 아카이브로 가는 링크다.
                 (글 목록 행이 h3라 시리즈 제목은 h2로 둔다) -->
            <h2 class={css({ minW: '0' })}>
              <a
                href={entry.href}
                class={css({
                  display: 'inline-block',
                  textDecoration: 'none',
                  _hover: { textDecorationLine: 'underline' },
                })}
              >
                <span class={seriesBadge}>{entry.title}</span>
              </a>
            </h2>
            <span class={postRowMeta}>{entry.posts.length}편</span>
          </div>

          {#if entry.description}
            <p
              class={css({
                fontSize: '[13px]',
                color: 'ink.600',
                lineHeight: 'relaxed',
                mb: '[10px]',
              })}
            >
              {entry.description}
            </p>
          {/if}

          <ol class={css({ listStyleType: 'none', p: '0', m: '0' })}>
            {#each entry.posts as post (post.slug)}
              <li class={rowItem}>
                <a href={post.href} class={rowLink}>
                  <h3 class={rowTitle}>{post.title}</h3>
                  <span class={postRowMeta}>{post.date}</span>
                </a>
              </li>
            {/each}
          </ol>
        </section>
      {/each}
    {/if}
  </Rail>
</div>
