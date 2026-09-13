<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import { sparkFillPath, sparkPoints } from './geometry.ts';

  /**
   * KPI 숫자 옆의 작은 선 — 축도 눈금도 툴팁도 없다.
   *
   * **Recharts를 쓰지 않는 그림이다.** React 판도 손으로 그린 `<polyline>`이라
   * (`components/blog/Sparkline.tsx`) 여기만 라이브러리를 들일 이유가 없고,
   * 곡선도 주지 않는다 — 그쪽이 직선이라 부드럽게 만들면 오히려 갈린다.
   *
   * 크기를 prop으로 받는 이유는 자리마다 다르기 때문이다(KPI 카드 80×32,
   * 상위 글 표 96×24). 색은 받지 않는다 — React 판이 prop을 열어 두었지만
   * 호출자 둘 다 `ink.700`을 넘기므로, 쓰이지 않는 축을 열어 두는 대신
   * 토큰을 여기 박는다.
   */
  const {
    values,
    w = 100,
    h = 24,
  }: { values: number[]; w?: number; h?: number } = $props();

  const points = $derived(sparkPoints(values, w, h));
  const fill = $derived(sparkFillPath(values, w, h));
</script>

{#if values.length > 0}
  <svg
    width={w}
    height={h}
    viewBox="0 0 {w} {h}"
    style="display:block"
    aria-hidden="true"
  >
    {#if fill}
      <path d={fill} class={css({ fill: 'ink.700' })} opacity="0.18" />
    {/if}
    <polyline
      {points}
      fill="none"
      class={css({ stroke: 'ink.700' })}
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
{/if}
