<script lang="ts">
  import { css } from '../../../styled-system/css';

  /**
   * 홈 대표 글 카드의 미니 다이어그램 썸네일 (150×92).
   * `apps/blog/web/src/components/diagram/ParallelThumb.tsx`의 이식이고 좌표가 같다.
   *
   * 하나의 입력이 세 갈래로 갈라지는 "병렬 처리" 모양. 이미지가 아니라 SVG라
   * 다크모드 전환에 별도 에셋이 필요 없다 — 색은 hex가 아니라 Panda 토큰이다.
   *
   * **label을 주지 않으면 장식으로 보고 접근성 트리에서 감춘다.** 이 그림이 뜨는
   * 자리는 "썸네일 없는 글의 폴백"이라 어떤 글이 오든 같은 설명이 낭독된다 —
   * 글 제목은 바로 옆 링크가 이미 읽어 준다.
   */
  const { label }: { label?: string } = $props();

  const frame = css({ display: 'block', w: 'full', h: 'auto', fontFamily: 'sans' });
  const nodeGray = css({
    fill: 'paper.100',
    stroke: 'ink.border',
    strokeWidth: 'hairline',
  });
  const nodeAccent = css({
    fill: 'accent.50',
    stroke: 'accent.500',
    strokeWidth: 'hairline',
  });
  // 세 갈래 전부가 핵심 경로라 모두 액센트 실선이다.
  const edge = css({
    fill: '[none]',
    strokeWidth: 'hairline',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    stroke: 'accent.500',
  });
</script>

<svg
  viewBox="0 0 150 92"
  class={frame}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : true}
  focusable="false"
>
  <path class={edge} d="M40 46 L62 20" />
  <path class={edge} d="M40 46 L62 46" />
  <path class={edge} d="M40 46 L62 72" />

  <rect class={nodeGray} x="12" y="34" width="28" height="24" rx="5" />
  <rect class={nodeAccent} x="62" y="9" width="76" height="20" rx="5" />
  <rect class={nodeAccent} x="62" y="36" width="76" height="20" rx="5" />
  <rect class={nodeAccent} x="62" y="63" width="76" height="20" rx="5" />
</svg>
