<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../../styled-system/css';
  import { fmtNum } from '@blog/content/client';
  import type { PostStatDetail } from '@blog/analytics';
  import Rail from '$lib/components/Rail.svelte';
  import { loadDashboard } from '$lib/admin/store.svelte';
  import { adminAnalyticsPostPath } from '$lib/shared/routes';

  /**
   * 글별 통계 목록 — 검색 + 정렬.
   *
   * 여기는 **비공개 글까지** 보여준다(`admin-posts-index.json`이 draft·scheduled를
   * 포함한다). 공개 검색(`SearchDialog`)과 다른 인덱스를 읽는 이유가 그것이다.
   */
  type SortKey = 'views' | 'today' | 'date';

  let posts = $state<PostStatDetail[] | null>(null);
  let error = $state<string | null>(null);
  let query = $state('');
  let sort = $state<SortKey>('views');

  onMount(() => {
    loadDashboard().then(
      data => (posts = data),
      (cause: unknown) => (error = String(cause)),
    );
  });

  const rows = $derived.by(() => {
    if (posts === null) return [];
    const needle = query.trim().toLowerCase();
    const filtered =
      needle.length === 0
        ? posts
        : posts.filter(p => p.title.toLowerCase().includes(needle));
    return [...filtered].sort((a, b) => {
      if (sort === 'views') return b.totalViews - a.totalViews;
      if (sort === 'today') return b.todayViews - a.todayViews;
      return (b.date ?? '').localeCompare(a.date ?? '');
    });
  });

  const th = css({
    textAlign: 'left',
    py: '2',
    fontSize: 'xs',
    fontFamily: 'mono',
    color: 'ink.500',
    fontWeight: 'normal',
    borderBottomWidth: 'hairline',
    borderColor: 'ink.border',
  });
  const td = css({
    py: '2',
    fontSize: 'sm',
    borderBottomWidth: 'hairline',
    borderColor: 'ink.border',
  });
  const num = css({
    fontFamily: 'mono',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    color: 'ink.700',
  });
  const sortButton = (active: boolean) =>
    css({
      border: 'none',
      bg: 'transparent',
      p: '0',
      cursor: 'pointer',
      fontFamily: 'mono',
      fontSize: 'xs',
      color: active ? 'ink.950' : 'ink.500',
      textDecoration: active ? 'underline' : 'none',
    });
</script>

<Rail width="wide">
  <div class={css({ my: '10', display: 'flex', flexDirection: 'column', gap: '5' })}>
    <h1 class={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950' })}>
      글별 통계
    </h1>

    <input
      type="search"
      placeholder="제목으로 좁히기"
      bind:value={query}
      class={css({
        px: '3',
        py: '2',
        rounded: 'control',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        bg: 'transparent',
        color: 'ink.950',
        fontSize: 'sm',
        outline: 'none',
        _focus: { borderColor: 'ink.borderStrong' },
      })}
    />

    {#if error}
      <p class={css({ color: 'ink.700', fontSize: 'sm', fontFamily: 'mono' })}>
        데이터를 받지 못했습니다 — {error}
      </p>
    {:else if posts === null}
      <p class={css({ color: 'ink.500', fontSize: 'sm' })}>불러오는 중…</p>
    {:else}
      <p class={css({ color: 'ink.500', fontSize: 'xs', fontFamily: 'mono' })}>
        {rows.length}편
      </p>
      <table class={css({ width: 'full', borderCollapse: 'collapse' })}>
        <thead>
          <tr>
            <th class={th}>제목</th>
            <th class="{th} {css({ textAlign: 'right' })}">
              <button type="button" class={sortButton(sort === 'views')} onclick={() => (sort = 'views')}>
                누적
              </button>
            </th>
            <th class="{th} {css({ textAlign: 'right' })}">
              <button type="button" class={sortButton(sort === 'today')} onclick={() => (sort = 'today')}>
                오늘
              </button>
            </th>
            <th class="{th} {css({ textAlign: 'right' })}">
              <button type="button" class={sortButton(sort === 'date')} onclick={() => (sort = 'date')}>
                발행일
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {#each rows as post (post.slug)}
            <tr>
              <td class={td}>
                <a
                  href={adminAnalyticsPostPath(post.slug)}
                  class={css({ color: 'ink.950', textDecoration: 'none' })}>{post.title}</a
                >
                {#if post.status !== 'published'}
                  <span
                    class={css({
                      ml: '2',
                      px: '1.5',
                      py: '0.5',
                      rounded: 'control',
                      bg: 'paper.200',
                      color: 'ink.600',
                      fontSize: '2xs',
                      fontFamily: 'mono',
                    })}>{post.status}</span
                  >
                {/if}
              </td>
              <td class="{td} {num}">{fmtNum(post.totalViews)}</td>
              <td class="{td} {num}">{fmtNum(post.todayViews)}</td>
              <td class="{td} {num}">{post.date ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</Rail>
