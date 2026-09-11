<script lang="ts">
  import { onMount } from 'svelte';
  import { css } from '../../../../../styled-system/css';
  import { fmtNum, getKSTDateISO, postPath } from '@blog/content/client';
  import { TIMEZONE } from '@blog/site-values';
  import type {
    DowDistribution,
    HourlyDistribution,
    PostStatDetail,
  } from '@blog/analytics';
  import { dowPoints, hourlyPoints } from '$lib/admin/distribution';
  import Rail from '$lib/components/Rail.svelte';
  import AreaChart from '$lib/admin/charts/AreaChart.svelte';
  import BarChart from '$lib/admin/charts/BarChart.svelte';
  import {
    analyticsService,
    getPostDowDistribution,
    getPostHourlyDistribution,
  } from '$lib/domain/admin';
  import { loadDashboard } from '$lib/admin/store.svelte';
  import { ADMIN_ANALYTICS_PATH } from '$lib/shared/routes';
  import type { PageProps } from './$types';

  /**
   * 글 하나의 통계 — 일별 추이 + 시간대·요일 분포 + 파생 통계.
   *
   * 분포 둘은 이 화면에서만 쓰는 RPC라 **여기서 받는다**(대시보드 캐시에 넣지
   * 않는다 — 글마다 다른 데이터를 한 캐시에 담으면 키가 필요해지고, 그 순간
   * 정말로 쿼리 라이브러리가 필요해진다). 파생 통계는 `@blog/analytics`의
   * `computeDerivedStats`가 계산한다 — React 판과 같은 함수다.
   */
  const { data }: PageProps = $props();

  let post = $state<PostStatDetail | null>(null);
  let hourly = $state<HourlyDistribution[]>([]);
  let dow = $state<DowDistribution[]>([]);
  let error = $state<string | null>(null);

  const todayISO = getKSTDateISO(TIMEZONE);
  const derived = $derived(
    post === null ? null : analyticsService.computeDerivedStats(post, todayISO),
  );

  onMount(() => {
    // 대시보드와 분포 둘을 **따로** 다룬다. 한 묶음(`Promise.all`)으로 두면
    // 분포 RPC 하나가 실패할 때 성공한 대시보드까지 버려져 화면 전체가 에러가
    // 된다 — KPI와 추이는 그것 없이도 그릴 수 있다. React 판이 분포 둘만
    // try/catch로 감싸 빈 배열로 떨어뜨리는 것과 같은 판단이다.
    loadDashboard().then(
      posts => {
        post = posts.find(p => p.slug === data.slug) ?? null;
        if (post === null) error = '이 글의 통계를 찾지 못했습니다.';
      },
      (cause: unknown) => (error = String(cause)),
    );

    void getPostHourlyDistribution(data.slug)
      .then(rows => (hourly = rows))
      .catch((cause: unknown) => {
        console.error('시간대 분포를 받지 못했습니다:', cause);
      });
    void getPostDowDistribution(data.slug)
      .then(rows => (dow = rows))
      .catch((cause: unknown) => {
        console.error('요일 분포를 받지 못했습니다:', cause);
      });
  });

  const card = css({
    p: '5',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    rounded: 'card',
    display: 'flex',
    flexDirection: 'column',
    gap: '1',
  });
  const label = css({ fontSize: 'xs', color: 'ink.500', fontFamily: 'mono' });
  const value = css({
    fontSize: '2xl',
    fontWeight: 'bold',
    color: 'ink.950',
    fontVariantNumeric: 'tabular-nums',
  });
  const section = css({ display: 'flex', flexDirection: 'column', gap: '3' });
  const h2 = css({ fontSize: 'lg', fontWeight: 'bold', color: 'ink.950' });
</script>

<Rail>
  <div class={css({ my: '10', display: 'flex', flexDirection: 'column', gap: '8' })}>
    <div class={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
      <a
        href={ADMIN_ANALYTICS_PATH}
        class={css({ fontSize: 'xs', color: 'ink.500', textDecoration: 'none' })}
        >← 글별 통계</a
      >
      <h1 class={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950' })}>
        {post?.title ?? data.slug}
      </h1>
      <a
        href={postPath(data.slug)}
        class={css({ fontSize: 'sm', color: 'accent.600' })}>글 보기</a
      >
    </div>

    {#if error}
      <p class={css({ color: 'ink.700', fontSize: 'sm', fontFamily: 'mono' })}>
        {error}
      </p>
    {:else if post === null || derived === null}
      <p class={css({ color: 'ink.500', fontSize: 'sm' })}>불러오는 중…</p>
    {:else}
      <div
        class={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(4, 1fr)' },
          gap: '4',
        })}
      >
        <div class={card}>
          <span class={label}>누적</span><span class={value}>{fmtNum(post.totalViews)}</span>
        </div>
        <div class={card}>
          <span class={label}>오늘</span><span class={value}>{fmtNum(post.todayViews)}</span>
        </div>
        <div class={card}>
          <span class={label}>일 평균</span>
          <span class={value}>{fmtNum(derived.dailyAverage)}</span>
        </div>
        <div class={card}>
          <span class={label}>주간 성장률</span>
          <span class={value}>
            {derived.weekGrowthRate === null
              ? '—'
              : `${derived.weekGrowthRate > 0 ? '+' : ''}${derived.weekGrowthRate}%`}
          </span>
        </div>
      </div>

      {#if derived.peakDay}
        <p class={css({ fontSize: 'sm', color: 'ink.600' })}>
          최고 기록 · {derived.peakDay.date} · {fmtNum(derived.peakDay.count)}회
        </p>
      {/if}

      <section class={section}>
        <h2 class={h2}>일별 추이</h2>
        <AreaChart
          data={post.trends.map(t => ({ label: t.view_date, value: t.view_count }))}
        />
      </section>

      <section class={section}>
        <h2 class={h2}>시간대 분포 (KST)</h2>
        <BarChart label="시간대별 조회수" data={hourlyPoints(hourly)} />
      </section>

      <section class={section}>
        <h2 class={h2}>요일 분포 (KST)</h2>
        <BarChart label="요일별 조회수" data={dowPoints(dow)} />
      </section>

      <section class={section}>
        <h2 class={h2}>마일스톤</h2>
        <ul class={css({ listStyle: 'none', p: '0', m: '0', display: 'flex', gap: '4', flexWrap: 'wrap' })}>
          {#each derived.milestones as milestone (milestone.target)}
            <li
              class={css({
                fontSize: 'sm',
                color: milestone.reached ? 'ink.950' : 'ink.400',
                fontFamily: 'mono',
              })}
            >
              {fmtNum(milestone.target)}
              {milestone.reached ? `· ${milestone.date ?? '달성'}` : '· 미달성'}
            </li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</Rail>
