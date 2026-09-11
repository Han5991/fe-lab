<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import { linePath, type Point, type PlotBox } from './geometry.ts';

  /** KPI 카드 옆의 작은 선 — 축도 눈금도 없다. */
  const { values }: { values: number[] } = $props();

  const box: PlotBox = {
    width: 96,
    height: 28,
    padTop: 3,
    padRight: 1,
    padBottom: 3,
    padLeft: 1,
  };
  const points = $derived<Point[]>(
    values.map((value, i) => ({ label: String(i), value })),
  );
</script>

<svg viewBox="0 0 {box.width} {box.height}" width={box.width} height={box.height} aria-hidden="true">
  <path
    d={linePath(points, box)}
    class={css({ stroke: 'accent.600' })}
    fill="none"
    stroke-width="1.5"
  />
</svg>
