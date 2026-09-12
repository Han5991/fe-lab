<script lang="ts">
  import { scale } from 'svelte/transition';
  import { css } from '../../../../styled-system/css';

  /**
   * 모바일 `/posts` 우하단에 떠 있는 필터 FAB.
   * `apps/blog/web/src/components/blog/PostsFilterFab.tsx`의 이식이다.
   * 데스크톱에서는 `display: { base, md: 'none' }`으로 숨는다.
   *
   * React 판은 motion으로 스케일 인 한다. 여기서는 svelte/transition의 `scale`이
   * 같은 일을 한다 — 라이브러리를 더 들이지 않는다.
   */
  const {
    onClick,
    activeCount,
  }: { onClick: () => void; activeCount: number } = $props();

  const fab = css({
    display: { base: 'inline-flex', md: 'none' },
    pos: 'fixed',
    bottom: '6',
    right: '6',
    alignItems: 'center',
    gap: '[6px]',
    pl: '[12px]',
    pr: '[14px]',
    h: '[40px]',
    bg: 'paper.200',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    color: 'ink.800',
    rounded: '[6px]',
    fontFamily: 'sans',
    fontSize: 'sm',
    fontWeight: 'medium',
    cursor: 'pointer',
    zIndex: '[40]',
    transition: '[background-color 0.15s, border-color 0.15s]',
    _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
  });

  const badge = css({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minW: '[18px]',
    h: '[18px]',
    px: '[5px]',
    bg: 'accent.600',
    color: 'paper.50',
    rounded: '[2rem]',
    fontSize: 'xs',
    fontWeight: 'semibold',
    lineHeight: 'flat',
    fontVariantNumeric: 'tabular-nums',
  });

  const icon = css({ w: '[16px]', h: '[16px]', flexShrink: 0 });
</script>

<button
  type="button"
  onclick={onClick}
  transition:scale={{ duration: 200 }}
  aria-label={activeCount > 0 ? `필터 열기 (${activeCount}개 적용 중)` : '필터 열기'}
  class={fab}
>
  <!-- lucide `sliders-horizontal`과 같은 path다(React 판이 그 아이콘을 쓴다).
       이 앱은 아이콘 패키지를 들이지 않고 쓰는 것만 그려 넣는다. -->
  <svg
    class={icon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M10 5H3" />
    <path d="M12 19H3" />
    <path d="M14 3v4" />
    <path d="M16 17v4" />
    <path d="M21 12h-9" />
    <path d="M21 19h-5" />
    <path d="M21 5h-7" />
    <path d="M8 10v4" />
    <path d="M8 12H3" />
  </svg>
  <span>필터</span>
  {#if activeCount > 0}
    <span class={badge}>{activeCount}</span>
  {/if}
</button>
