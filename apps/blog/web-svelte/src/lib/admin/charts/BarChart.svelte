<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import { fmtNum } from '@blog/content/client';
  import { scaleMax, type Point } from './geometry.ts';

  /**
   * 분포 막대 — 시간대(24칸)·요일(7칸)에 쓴다.
   *
   * 좌표 계산이랄 것이 높이 비율 하나라 SVG 대신 flex + CSS 높이로 그린다.
   * 값이 전부 0이어도 칸은 남는다(`scaleMax`가 1로 떨어진다) — "데이터가
   * 없다"와 "그림이 안 그려졌다"를 화면에서 구분할 수 있어야 한다.
   */
  const { data, label }: { data: Point[]; label: string } = $props();
  const max = $derived(scaleMax(data.map(d => d.value)));
</script>

<div class={css({ display: 'flex', flexDirection: 'column', gap: '2' })}>
  <div
    class={css({
      display: 'flex',
      alignItems: 'flex-end',
      gap: '1',
      h: '[120px]',
    })}
    role="img"
    aria-label={label}
  >
    {#each data as point (point.label)}
      <div
        class={css({
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          h: 'full',
        })}
        title="{point.label} · {fmtNum(point.value)}회"
      >
        <div
          class={css({ bg: 'accent.600', borderTopRadius: '[2px]', minH: '[2px]' })}
          style="height:{(point.value / max) * 100}%"
        ></div>
      </div>
    {/each}
  </div>
  <div
    class={css({
      display: 'flex',
      gap: '1',
      fontFamily: 'mono',
      fontSize: '[10px]',
      color: 'ink.500',
    })}
  >
    {#each data as point (point.label)}
      <span class={css({ flex: '1', textAlign: 'center' })}>{point.label}</span>
    {/each}
  </div>
</div>
