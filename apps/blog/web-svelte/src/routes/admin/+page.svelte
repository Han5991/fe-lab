<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../styled-system/css';
  import { fmtNum, postPath } from '@blog/content/client';
  import { TIMEZONE } from '@blog/site-values';
  import { getKSTDateISO } from '@blog/content/client';
  import type { AnalyticsOverview, AnalyticsRange, PostStatDetail } from '@blog/analytics';
  import Rail from '$lib/components/Rail.svelte';
  import AreaChart from '$lib/admin/charts/AreaChart.svelte';
  import Sparkline from '$lib/admin/charts/Sparkline.svelte';
  import { analyticsService } from '$lib/domain/admin';
  import { loadDashboard } from '$lib/admin/store.svelte';
  import { ADMIN_ANALYTICS_PATH } from '$lib/shared/routes';

  /**
   * 대시보드 — 기간 합계·증감·상위 글·일별 추이.
   *
   * 계산은 전부 `@blog/analytics`의 `computeOverview`가 한다(React 판과 **같은
   * 함수**다 — 두 화면의 숫자가 갈리면 프레임워크 비교가 아니라 계산 비교가 된다).
   * 여기 있는 것은 데이터를 받아 넘기고, 결과를 그리는 것뿐이다.
   */
  const RANGES: { value: AnalyticsRange; label: string }[] = [
    { value: '7d', label: '7일' },
    { value: '30d', label: '30일' },
    { value: '90d', label: '90일' },
  ];

  let range = $state<AnalyticsRange>('30d');
  let posts = $state<PostStatDetail[] | null>(null);
  let error = $state<string | null>(null);

  // KST 오늘. React 판은 자정에 setTimeout으로 갱신하는데, 여기서는 마운트
  // 시점에 한 번 읽는다 — 자정을 넘겨 열어 둔 대시보드가 하루치 어긋나는 것은
  // 알려진 차이다(후속으로 남긴다).
  const todayISO = getKSTDateISO(TIMEZONE);

  const overview = $derived<AnalyticsOverview | null>(
    posts === null ? null : analyticsService.computeOverview(posts, range, todayISO),
  );

  onMount(() => {
    loadDashboard().then(
      data => (posts = data),
      (cause: unknown) => (error = String(cause)),
    );
  });

  const card = css({
    p: '5',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    rounded: 'card',
    display: 'flex',
    flexDirection: 'column',
    gap: '2',
  });
  const kpiNum = css({
    fontSize: '3xl',
    fontWeight: 'bold',
    color: 'ink.950',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 'flat',
  });
  const kpiLabel = css({ fontSize: 'xs', color: 'ink.500', fontFamily: 'mono' });
  const rangeButton = (active: boolean) =>
    css({
      px: '3',
      py: '1',
      rounded: 'control',
      borderWidth: 'hairline',
      borderColor: active ? 'ink.borderStrong' : 'ink.border',
      bg: active ? 'paper.100' : 'transparent',
      color: active ? 'ink.950' : 'ink.600',
      fontSize: 'sm',
      cursor: 'pointer',
    });
</script>

<Rail>
  <div class={css({ my: '10', display: 'flex', flexDirection: 'column', gap: '8' })}>
    <div class={css({ display: 'flex', alignItems: 'baseline', gap: '3' })}>
      <h1 class={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950', mr: 'auto' })}>
        대시보드
      </h1>
      {#each RANGES as option (option.value)}
        <button
          type="button"
          class={rangeButton(range === option.value)}
          onclick={() => (range = option.value)}>{option.label}</button
        >
      {/each}
    </div>

    {#if error}
      <p class={css({ color: 'ink.700', fontSize: 'sm', fontFamily: 'mono' })}>
        데이터를 받지 못했습니다 — {error}
      </p>
      <p class={css({ color: 'ink.500', fontSize: 'xs' })}>
        이 앱의 Supabase는 로컬 인스턴스만 가리킵니다. <code>supabase start</code>가
        떠 있어야 합니다.
      </p>
    {:else if overview === null}
      <p class={css({ color: 'ink.500', fontSize: 'sm' })}>불러오는 중…</p>
    {:else}
      <div
        class={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          gap: '4',
        })}
      >
        <div class={card}>
          <span class={kpiLabel}>기간 조회수 ({overview.rangeDays}일)</span>
          <div
            class={css({
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '3',
            })}
          >
            <span class={kpiNum}>{fmtNum(overview.total)}</span>
            <Sparkline values={overview.totalSeries.map(p => p.value)} />
          </div>
          {#if overview.totalDelta !== null}
            <span class={kpiLabel}>
              직전 동기간 대비 {overview.totalDelta > 0 ? '+' : ''}{overview.totalDelta}%
            </span>
          {/if}
        </div>
        <div class={card}>
          <span class={kpiLabel}>추정 순방문</span>
          <span class={kpiNum}>{fmtNum(overview.uniques)}</span>
          {#if overview.uniquesDelta !== null}
            <span class={kpiLabel}>
              {overview.uniquesDelta > 0 ? '+' : ''}{overview.uniquesDelta}%
            </span>
          {/if}
        </div>
        <div class={card}>
          <span class={kpiLabel}>발행 글 · 글당 평균</span>
          <span class={kpiNum}>{fmtNum(overview.postsPublished)}</span>
          <span class={kpiLabel}>평균 {fmtNum(overview.avgPerPost)}회</span>
        </div>
      </div>

      <section class={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
        <h2 class={css({ fontSize: 'lg', fontWeight: 'bold', color: 'ink.950' })}>
          일별 추이
        </h2>
        <AreaChart data={overview.totalSeries.map(p => ({ label: p.date, value: p.value }))} />
      </section>

      <section class={css({ display: 'flex', flexDirection: 'column', gap: '3' })}>
        <h2 class={css({ fontSize: 'lg', fontWeight: 'bold', color: 'ink.950' })}>
          상위 글
        </h2>
        <ul class={css({ listStyle: 'none', p: '0', m: '0' })}>
          {#each overview.topPosts as post (post.slug)}
            <li
              class={css({
                display: 'flex',
                gap: '3',
                py: '2',
                borderBottomWidth: 'hairline',
                borderColor: 'ink.border',
                fontSize: 'sm',
              })}
            >
              <a
                href={`${ADMIN_ANALYTICS_PATH}${post.slug}/`}
                class={css({ color: 'ink.950', textDecoration: 'none', mr: 'auto' })}
                >{post.title}</a
              >
              <a
                href={postPath(post.slug)}
                class={css({ color: 'ink.500', fontSize: 'xs' })}>보기</a
              >
              <span
                class={css({
                  fontFamily: 'mono',
                  color: 'ink.600',
                  fontVariantNumeric: 'tabular-nums',
                })}>{fmtNum(post.views)}</span
              >
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</Rail>
