<script lang="ts">
  import { css } from '../../../styled-system/css';
  import NavCard from './NavCard.svelte';
  import { SERIES_PATH } from '$lib/shared/routes';

  type Item = { href: string; title: string } | null;

  /**
   * 글 하단 이동 카드. `apps/blog/web/src/components/post/PostNavigation.tsx`의
   * 이식이다.
   *
   * **시리즈 글이면 시리즈 네비만, 아니면 전체 이전/다음만** 보여준다. 둘을
   * 같이 그리면 순서 개념이 둘이 되어 같은 글이 두 번 나온다 — 시리즈 네비는
   * 읽는 순서고 전체 이전/다음은 시간축이라, 연달아 발행한 시리즈에서 같은
   * 글이 `다음 편`이자 `이전 글`로 잡혔다. 라벨도 "편"과 "글" 한 글자 차이라
   * 구분이 안 됐다.
   */
  const {
    prev,
    next,
    series,
  }: {
    prev: Item;
    next: Item;
    series: { seriesName: string; prev: Item; next: Item } | null;
  } = $props();

  const row = css({
    display: 'flex',
    flexDirection: { base: 'column', md: 'row' },
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: '3',
  });

  // 한쪽만 있을 때 남은 칸을 차지해 좌/우 정렬을 유지하는 자리끝.
  const spacer = css({ flex: '1', display: { base: 'none', md: 'block' } });
</script>

<div class={css({ mb: '8' })}>
  {#if series}
    <p class={css({ fontSize: '[12px]', color: 'ink.600', mb: '[10px]' })}>
      시리즈 · {series.seriesName}
    </p>
    <div class={row}>
      {#if series.prev}
        <NavCard
          href={series.prev.href}
          title={series.prev.title}
          direction="prev"
          label="← 이전 편"
          clamp={1}
        />
      {:else}
        <div class={spacer}></div>
      {/if}
      {#if series.next}
        <NavCard
          href={series.next.href}
          title={series.next.title}
          direction="next"
          label="다음 편 →"
          clamp={1}
        />
      {:else}
        <!-- 마지막 편. 여기서 끊기면 갈 곳이 없어 시리즈 목록으로 보낸다. -->
        <NavCard
          href={SERIES_PATH}
          title="다른 시리즈 둘러보기"
          direction="next"
          label="시리즈 목록 →"
          clamp={1}
        />
      {/if}
    </div>
  {:else}
    <div class={row}>
      {#if prev}
        <NavCard href={prev.href} title={prev.title} direction="prev" label="← 이전 글" clamp={2} />
      {:else}
        <div class={spacer}></div>
      {/if}
      {#if next}
        <NavCard href={next.href} title={next.title} direction="next" label="다음 글 →" clamp={2} />
      {:else}
        <div class={spacer}></div>
      {/if}
    </div>
  {/if}
</div>
