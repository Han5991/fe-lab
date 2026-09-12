<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { css } from '../../../../styled-system/css';

  /**
   * 모바일 `/posts` 전용 필터 바텀시트.
   * `apps/blog/web/src/components/blog/PostsFilterSheet.tsx`의 이식이다.
   *
   * 내용은 호출부가 snippet으로 주입한다 — 데스크톱 사이드바와 **같은**
   * `PostsFilterPanel`이 여기 들어온다.
   *
   * React 판은 `Portal`로 DOM 밖에 낸다. 여기서는 그럴 필요가 없다: 이 컴포넌트는
   * 아카이브 그리드의 형제로 서고, 그 위에 쌓임 맥락을 만드는 조상이 없다.
   */
  const {
    open,
    onClose,
    onClearAll,
    activeCount,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    onClearAll: () => void;
    activeCount: number;
    children: Snippet;
  } = $props();

  let sheet = $state<HTMLDivElement>();

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(): HTMLElement[] {
    if (!sheet) return [];
    return Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      el => !el.hasAttribute('disabled'),
    );
  }

  /** Escape로 닫고, Tab을 시트 안에 묶는다(포커스 트랩). */
  function onKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    const first = items.at(0);
    const last = items.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  $effect(() => {
    if (!open) return;
    // 시트 뒤가 스크롤되면 닫았을 때 읽던 자리를 잃는다(SearchDialog와 같은 규칙).
    document.body.style.overflow = 'hidden';
    // 열기 전 포커스를 기억해 두었다가 닫을 때 되돌린다. activeElement는
    // Element라 focus()가 없는 것(SVG 등)도 오므로 되돌릴 수 있는 것만 든다.
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = requestAnimationFrame(() => focusables().at(0)?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.removeProperty('overflow');
      previous?.focus();
    };
  });

  const backdrop = css({
    pos: 'fixed',
    inset: '0',
    bg: '[rgba(1,4,9,0.8)]',
    zIndex: '[50]',
  });

  const panel = css({
    pos: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    bg: 'paper.100',
    borderTopWidth: '[1px]',
    borderRightWidth: '[1px]',
    borderLeftWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    zIndex: '[51]',
    roundedTop: '[12px]',
    maxH: '[85vh]',
    display: 'flex',
    flexDir: 'column',
    paddingBottom: '[env(safe-area-inset-bottom)]',
  });

  const grabberRow = css({
    display: 'flex',
    justifyContent: 'center',
    pt: '[8px]',
    pb: '[4px]',
  });

  const grabber = css({
    width: '[32px]',
    height: '[4px]',
    rounded: '[2rem]',
    bg: 'ink.border',
  });

  const header = css({
    px: '[16px]',
    py: '[12px]',
    borderBottomWidth: '[1px]',
    borderBottomStyle: 'solid',
    borderColor: 'ink.border',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const headerTitle = css({
    fontSize: '[16px]',
    fontWeight: 'semibold',
    color: 'ink.950',
  });

  const clearAllButton = css({
    bg: 'paper.200',
    borderWidth: '[1px]',
    borderStyle: 'solid',
    borderColor: 'ink.border',
    rounded: '[6px]',
    px: '[16px]',
    py: '[5px]',
    color: 'ink.800',
    fontSize: 'sm',
    fontWeight: 'medium',
    cursor: 'pointer',
    _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
  });

  const body = css({
    px: '[16px]',
    py: '[16px]',
    overflowY: 'auto',
    flex: '1',
    display: 'flex',
    flexDir: 'column',
    gap: '[16px]',
  });

  const closeIcon = css({ w: '[20px]', h: '[20px]' });
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <!-- dim 레이어를 눌러 닫는 것은 포인터 편의일 뿐이고, 키보드로 닫는 길은
       위 Escape와 아래 닫기 버튼이다(SearchDialog와 같은 처리). -->
  <div
    role="presentation"
    class={backdrop}
    onclick={onClose}
    transition:fade={{ duration: 200 }}
  ></div>

  <div
    bind:this={sheet}
    role="dialog"
    aria-modal="true"
    aria-label="글 필터"
    class={panel}
    transition:fly={{ y: 400, duration: 280 }}
  >
    <div class={grabberRow}>
      <span class={grabber}></span>
    </div>
    <div class={header}>
      <h2 class={headerTitle}>
        {activeCount > 0 ? `필터 · ${activeCount}` : '필터'}
      </h2>
      <div class={css({ display: 'flex', gap: '[8px]', alignItems: 'center' })}>
        {#if activeCount > 0}
          <button
            type="button"
            onclick={() => {
              onClearAll();
              onClose();
            }}
            class={clearAllButton}
          >
            모두 지우기
          </button>
        {/if}
        <button
          type="button"
          onclick={onClose}
          aria-label="닫기"
          class={css({ cursor: 'pointer', color: 'ink.600' })}
        >
          <!-- lucide `x`와 같은 path다. -->
          <svg
            class={closeIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
    <div class={body}>
      {@render children()}
    </div>
  </div>
{/if}
