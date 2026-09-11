<script lang="ts">
  import { fade, fly, scale } from 'svelte/transition';
  import { css, cva } from '../../../styled-system/css';
  import type { TocItem } from '$lib/shared/tocTypes';
  import { activeSpan } from '$lib/shared/tocRail';

  /**
   * 좁은 화면의 차례 — 떠 있는 버튼과 바텀 드로어.
   * `apps/blog/web/src/components/mobile/MobileTOC.tsx`의 이식이다.
   *
   * 활성 판정은 데스크톱 차례와 **같은 함수**(`activeSpan`)를 쓴다. 두 화면이
   * 각자 규칙을 들면 어느 절이 켜지는지가 갈리는데, 그건 스크롤을 해 봐야만
   * 보인다.
   *
   * **항목 목록은 서버가 준다.** React 판은 브라우저에서 `#post-content`를
   * 훑지만 여기서는 HTML이 빌드 타임에 완성되므로 그때 함께 뽑는다.
   *
   * React 판은 `Portal`로 DOM 밖에 낸다 — 그쪽은 페이지 전환 래퍼가
   * `z-index: 0`으로 쌓임 맥락을 만들어 드로어가 갇히기 때문이다. 이 앱에는
   * 그 래퍼가 없다.
   */
  const { items }: { items: readonly TocItem[] } = $props();

  /** 드로어에서 항목을 눌렀을 때 헤더 아래로 맞추는 값. React 판과 같은 80이다. */
  const DRAWER_OFFSET = 80;

  let open = $state(false);
  let activeId = $state('');

  $effect(() => {
    if (items.length === 0) return;
    let raf = 0;

    const compute = () => {
      raf = 0;
      const { current } = activeSpan(
        items.map(item => {
          const el = document.getElementById(item.id);
          if (!el) return null;
          const { top, bottom } = el.getBoundingClientRect();
          return { top, bottom };
        }),
        window.innerHeight,
      );
      activeId = items[current]?.id ?? '';
    };

    // 렌더 중이 아니라 다음 프레임에 계산한다 — 스크롤이 몰려도 프레임당 한 번.
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  });

  $effect(() => {
    if (!open) return;
    // 드로어 뒤가 스크롤되면 닫았을 때 읽던 자리를 잃는다.
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.removeProperty('overflow');
    };
  });

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') open = false;
  }

  /**
   * 항목 클릭 — 고정 헤더 높이만큼 더 올리고 드로어를 닫는다.
   *
   * 수정자 키가 눌린 클릭은 **가로채지 않는다.** 기본 동작을 막으면
   * Cmd/Ctrl+클릭으로 새 탭을 여는 것까지 막혀 앵커로 둔 이유가 사라진다.
   */
  function onItemClick(event: MouseEvent, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    open = false;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - DRAWER_OFFSET,
      behavior: 'smooth',
    });
  }

  /** 항목 한 줄 — level만큼 들여쓰고, 현재 절만 비춘다. */
  const tocItem = cva({
    base: {
      // 앵커가 인라인이면 글자 폭만 눌리는 자리가 된다. 한 줄 전체가 탭
      // 대상이려면 블록이어야 한다.
      display: 'block',
      fontSize: 'md',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: '[color 0.2s]',
      _hover: { color: 'accent.600' },
    },
    variants: {
      level: {
        1: { pl: '0' },
        2: { pl: '2' },
        3: { pl: '4' },
        4: { pl: '6' },
      },
      active: {
        true: { fontWeight: 'bold', color: 'accent.600' },
        false: { fontWeight: 'medium', color: 'ink.600' },
      },
    },
    defaultVariants: { level: 1, active: false },
  });

  /** cva의 level 변형은 1~4다. 그 밖의 깊이는 기본값(1)으로 떨어진다. */
  const levelOf = (level: number): 1 | 2 | 3 | 4 =>
    level === 2 || level === 3 || level === 4 ? level : 1;

  const fab = css({
    pos: 'fixed',
    bottom: '20',
    right: '6',
    w: '12',
    h: '12',
    bg: 'paper.50',
    rounded: 'full',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'ink.600',
    // 떠 있는 버튼이지만 그림자 대신 hairline 보더로 본문과 분리한다.
    borderWidth: 'hairline',
    borderColor: 'ink.borderStrong',
    zIndex: '[39]',
    cursor: 'pointer',
    _hover: { color: 'accent.600', borderColor: 'accent.200' },
  });

  const backdrop = css({
    pos: 'fixed',
    inset: '0',
    bg: 'ink.950',
    opacity: '0.5',
    zIndex: '[50]',
  });

  const drawer = css({
    pos: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    bg: 'paper.50',
    zIndex: '[51]',
    roundedTop: 'card',
    maxH: '[70vh]',
    display: 'flex',
    flexDir: 'column',
    // 뒤를 덮는 dim 오버레이가 이미 레이어를 갈라 주므로 그림자는 빼고 상단
    // hairline 보더만 남긴다.
    borderTopWidth: 'hairline',
    borderColor: 'ink.border',
    pb: '[env(safe-area-inset-bottom)]',
  });

  const drawerHead = css({
    p: '5',
    borderBottomWidth: '[1px]',
    borderColor: 'ink.border',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const icon = css({ w: '[24px]', h: '[24px]' });
</script>

<svelte:window onkeydown={onKeydown} />

{#if items.length > 0}
  <button
    type="button"
    onclick={() => {
      open = true;
    }}
    transition:scale={{ duration: 200 }}
    aria-label="목차 열기"
    class={fab}
  >
    <!-- lucide `list`와 같은 path다. -->
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
      <path d="M3 5h.01" />
      <path d="M3 12h.01" />
      <path d="M3 19h.01" />
      <path d="M8 5h13" />
      <path d="M8 12h13" />
      <path d="M8 19h13" />
    </svg>
  </button>

  {#if open}
    <!-- dim 레이어를 눌러 닫는 것은 포인터 편의일 뿐이고, 키보드로 닫는 길은
         위 Escape와 아래 닫기 버튼이다(SearchDialog와 같은 처리). -->
    <div
      role="presentation"
      class={backdrop}
      onclick={() => {
        open = false;
      }}
      transition:fade={{ duration: 200 }}
    ></div>

    <div
      role="dialog"
      aria-modal="true"
      aria-label="목차"
      class={drawer}
      transition:fly={{ y: 400, duration: 280 }}
    >
      <div class={drawerHead}>
        <h2 class={css({ fontSize: 'lg', fontWeight: 'bold' })}>목차</h2>
        <button
          type="button"
          onclick={() => {
            open = false;
          }}
          aria-label="목차 닫기"
          class={css({ cursor: 'pointer', color: 'ink.400' })}
        >
          <!-- lucide `x`와 같은 path다. -->
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div class={css({ p: '5', overflowY: 'auto', flex: '1' })}>
        <ul class={css({ display: 'flex', flexDir: 'column', gap: '3' })}>
          {#each items as item (item.id)}
            <li>
              <!-- 데스크톱 차례와 같은 이유로 앵커다 — 스크롤은 아래 핸들러가
                   가로채지만, href가 있어야 키보드 초점·Enter·새 탭으로 열기가
                   전부 따라온다. -->
              <a
                href="#{item.id}"
                onclick={e => {
                  onItemClick(e, item.id);
                }}
                aria-current={activeId === item.id ? 'true' : undefined}
                class={tocItem({
                  level: levelOf(item.level),
                  active: activeId === item.id,
                })}
              >
                {item.text}
              </a>
            </li>
          {/each}
        </ul>
      </div>
    </div>
  {/if}
{/if}
