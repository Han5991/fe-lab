<script lang="ts">
  import { css } from '../../../../styled-system/css';
  import { fmtNum } from '@blog/content/client';
  import {
    DEFAULT_BOX,
    monotoneAreaPath,
    monotoneLinePath,
    project,
    thinLabels,
    yTicks,
    type Point,
  } from './geometry.ts';

  /**
   * 일별 조회수 — Recharts의 `<AreaChart>` 자리다.
   *
   * 좌표는 전부 `geometry.ts`가 만든다. 여기 있는 것은 마크업과 툴팁 하나뿐이고,
   * 툴팁도 라이브러리 없이 마우스 x를 가장 가까운 점으로 반올림하는 것이 전부다.
   *
   * 색은 `currentColor`가 아니라 Panda 토큰을 CSS 변수로 받는다 — SVG 안이라
   * `css()` 클래스를 요소마다 붙이는 대신, 부모에 클래스를 하나 걸고 `stroke`·
   * `fill`을 `currentColor`로 상속시키면 선과 면의 색을 따로 줄 수 없다.
   */
  const { data, height = 240 }: { data: Point[]; height?: number } = $props();

  /**
   * **viewBox 폭은 실제 렌더 폭이다.** `bind:clientWidth`가 ResizeObserver로
   * 재 준다(Svelte가 내장하므로 라이브러리가 필요 없다 — Recharts에서는
   * `<ResponsiveContainer>`가 하던 일이다).
   *
   * 초안은 폭을 720으로 박고 `preserveAspectRatio="none"`으로 늘렸는데, 그러면
   * x만 1.5배 스케일되고 y는 1배라 **SVG 안의 모든 것이 가로로 늘어난다** —
   * 축 라벨 글자가 뭉개지고 커서 점(`<circle r="4">`)이 타원이 됐다. 도형만
   * 늘어날 것 같지만 텍스트와 원도 같이 늘어난다.
   *
   * 서버 렌더·첫 프레임에는 0이 오므로 기본 폭으로 떨어진다.
   */
  let measured = $state(0);
  const box = $derived({
    ...DEFAULT_BOX,
    width: measured > 0 ? measured : DEFAULT_BOX.width,
    height,
  });
  const coords = $derived(project(data, box));
  const ticks = $derived(yTicks(data));
  // 폭을 알게 되었으니 라벨 밀도도 폭에서 나온다. 11px mono의 `MM/DD`가 약
  // 33px이라 110px 간격이면 세 배 여유다 — 겹치기 전에 솎이는 쪽이 안전하다.
  const labelFlags = $derived(thinLabels(data, Math.max(2, Math.floor(box.width / 110))));
  const innerH = $derived(box.height - box.padTop - box.padBottom);

  let hovered = $state<number | null>(null);

  // `{@const}`는 블록의 **직속 자식**만 될 수 있어서(Svelte 규칙) 좁히기를
  // 스크립트에서 끝낸다. 인덱스 접근은 `noUncheckedIndexedAccess` 아래서
  // undefined를 낳으므로, 템플릿은 값 하나만 보면 되게 한다.
  const cursor = $derived(hovered === null ? undefined : coords[hovered]);
  const hoveredPoint = $derived(hovered === null ? undefined : data[hovered]);

  /** 마우스 x → 가장 가까운 데이터 점. */
  function onMove(event: MouseEvent & { currentTarget: SVGSVGElement }) {
    if (coords.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // viewBox가 렌더 폭과 같으므로 지금은 항등이다. 그래도 나눠 두는 이유는
    // 폭 측정이 한 프레임 늦기 때문이다 — 그 사이 마우스가 들어오면 viewBox는
    // 아직 720이고 요소는 이미 넓다.
    const x = ((event.clientX - rect.left) / rect.width) * box.width;
    let best = 0;
    for (const [i, point] of coords.entries()) {
      const current = coords[best];
      if (current === undefined) continue;
      if (Math.abs(point[0] - x) < Math.abs(current[0] - x)) best = i;
    }
    hovered = best;
  }

  const surface = css({
    color: 'ink.500',
    fontFamily: 'mono',
    fontSize: '[11px]',
  });
</script>

<div class={css({ w: 'full' })} bind:clientWidth={measured}>
  <svg
    class={surface}
    viewBox="0 0 {box.width} {box.height}"
    style="width:100%;height:{height}px"
    role="img"
    aria-label="일별 조회수 추이"
    onmousemove={onMove}
    onmouseleave={() => (hovered = null)}
  >
    <!-- 가로 격자 + y 눈금 -->
    {#each ticks as tick, i (`${tick}-${i}`)}
      {@const y = box.padTop + innerH * (1 - i / (ticks.length - 1))}
      <line
        x1={box.padLeft}
        x2={box.width - box.padRight}
        y1={y}
        y2={y}
        stroke="currentColor"
        stroke-opacity="0.2"
        stroke-dasharray="2 4"
      />
      <text x={box.padLeft - 8} y={y + 4} text-anchor="end" fill="currentColor">
        {fmtNum(tick)}
      </text>
    {/each}

    <!-- 면 → 선 순서. 반대로 두면 면이 선을 덮는다. -->
    <path
      d={monotoneAreaPath(data, box)}
      class={css({ fill: 'accent.600' })}
      fill-opacity="0.15"
    />
    <path
      d={monotoneLinePath(data, box)}
      class={css({ stroke: 'accent.600' })}
      fill="none"
      stroke-width="2"
    />

    <!-- x 라벨 -->
    {#each data as point, i (point.label)}
      {#if labelFlags[i]}
        {@const c = coords[i]}
        {#if c}
          <!-- 마지막 라벨만 오른쪽 정렬이다 — 마지막 점의 x가 곧 그림의 오른쪽
               끝이라(`width - padRight`) 가운데 정렬이면 글자 절반이 viewBox 밖으로
               나가 잘린다(`09/30`이 `09/3`이 됐다). 첫 라벨은 padLeft가 44라
               가운데 정렬로도 들어온다. -->
          <text
            x={c[0]}
            y={box.height - 8}
            text-anchor={i === data.length - 1 ? 'end' : 'middle'}
            fill="currentColor"
          >
            {point.label}
          </text>
        {/if}
      {/if}
    {/each}

    <!-- 커서 + 강조 점 -->
    {#if cursor}
      <line
        x1={cursor[0]}
        x2={cursor[0]}
        y1={box.padTop}
        y2={box.height - box.padBottom}
        stroke="currentColor"
        stroke-dasharray="2 3"
      />
      <circle
        cx={cursor[0]}
        cy={cursor[1]}
        r="4"
        class={css({ fill: 'accent.600', stroke: 'paper.50' })}
        stroke-width="1.5"
      />
    {/if}
  </svg>

  <!-- 툴팁을 SVG 밖에 둔다 — foreignObject는 Safari에서 잘리고, 이 값은
       그림 아래 한 줄로 읽어도 충분하다. -->
  <p
    class={css({
      mt: '2',
      minH: '[20px]',
      fontFamily: 'mono',
      fontSize: 'xs',
      color: 'ink.600',
    })}
  >
    {#if hoveredPoint}
      {hoveredPoint.label} · {fmtNum(hoveredPoint.value)}회
    {/if}
  </p>
</div>
