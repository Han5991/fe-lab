<script lang="ts">
  import { css } from '../../../styled-system/css';
  import type { TocItem } from '$lib/shared/tocTypes';
  import { HEADER_OFFSET, buildPath, measureLengths, type Row } from '$lib/shared/tocRail';

  /**
   * 글 차례 — 항목들을 잇는 **레일 한 줄**을 그리고, 지금 읽고 있는 구간만
   * 밝게 비춘다. `apps/blog/web/src/components/post/TOC.tsx`의 이식이다.
   *
   * 구현은 **같은 path를 두 번 그리는 것**이다. 아래는 흐린 전체 레일, 위는
   * 강조 레일을 `clip-path: inset()`으로 잘라 보이는 구간만 남긴다. 자를 값만
   * 바꾸면 되므로 transition 한 줄로 부드럽게 미끄러진다.
   *
   * **항목 목록은 서버가 준다.** React 판은 `react-markdown`이 런타임 렌더라
   * 브라우저에서 `#post-content`를 훑어 헤딩을 모으지만, 여기서는 HTML이 빌드
   * 타임에 완성되므로 그때 함께 뽑는다. 그래서 차례가 프리렌더된 HTML에 들어
   * 있고, JS가 하는 일은 **측정과 활성 구간 판정**뿐이다.
   *
   * 색은 액센트가 아니라 `ink.950`이다 — 차례는 본문을 읽는 보조 장치라
   * 포인트색을 쓸 자리가 아니다.
   */
  const { items }: { items: readonly TocItem[] } = $props();

  /** 레벨 한 단계당 레일이 오른쪽으로 밀리는 거리. */
  const RAIL_STEP = 8;
  /** 목록 위아래에서 스크롤 내용이 사라지는 페이드 구간. */
  const FADE = 16;

  let listEl = $state<HTMLOListElement | null>(null);
  // 항목 요소는 **순서 배열**로 든다. `items`가 순서 있는 고정 목록이라
  // 키 맵이 필요 없고, Svelte의 반응형 Map을 끌어올 이유도 없다.
  let itemEls = $state<(HTMLLIElement | null)[]>([]);

  let rows = $state<Row[]>([]);
  let railPath = $state('');
  let railHeight = $state(0);
  let railWidth = $state(0);
  let lengths = $state<[number, number][]>([]);

  /** 지금 화면에 들어와 있는 헤딩들의 [첫, 마지막] 인덱스. */
  let activeRange = $state<[number, number] | null>(null);
  let activeId = $state('');
  let dotAt = $state<number | null>(null);

  const minLevel = $derived(
    items.length > 0 ? Math.min(...items.map(i => i.level)) : 0,
  );

  /** 헤딩 목록이 정해진 뒤 한 번, 그리고 폭이 바뀔 때마다 다시 잰다. */
  $effect(() => {
    const list = listEl;
    if (!list || items.length === 0) return;

    const measure = () => {
      const base = list.getBoundingClientRect().top;
      const next: Row[] = items.map((item, i) => {
        const r = itemEls[i]?.getBoundingClientRect();
        return {
          x: RAIL_STEP + (item.level - minLevel) * RAIL_STEP,
          top: r ? r.top - base : 0,
          bottom: r ? r.bottom - base : 0,
        };
      });
      const d = buildPath(next);
      rows = next;
      railPath = d;
      lengths = measureLengths(d, next);
      railHeight = list.scrollHeight;
      railWidth = RAIL_STEP * 2 + Math.max(...next.map(r => r.x));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => {
      ro.disconnect();
    };
  });

  /**
   * 활성 항목은 **매번 스크롤 위치에서 처음부터 다시 계산한다.**
   *
   * 관찰 결과를 Set에 누적하면 콜백이 한 번만 어긋나도 이전 헤딩이 남아 구간이
   * 통째로 늘어나고, 누적된 상태라 스스로 회복하지 못한다. 매 프레임 다시
   * 찾으면 누적될 상태가 없다.
   */
  $effect(() => {
    if (items.length === 0) return;
    let raf = 0;

    const compute = () => {
      raf = 0;
      const line = window.innerHeight * 0.2;
      let current = 0;
      let first = -1;
      let last = -1;
      items.forEach((item, i) => {
        const el = document.getElementById(item.id);
        if (!el) return;
        const { top, bottom } = el.getBoundingClientRect();
        if (top <= line) current = i;
        // 헤더에 가려지는 구간(0 ~ HEADER_OFFSET)은 "보인다"로 치지 않는다.
        if (top >= HEADER_OFFSET && bottom <= window.innerHeight) {
          if (first === -1) first = i;
          last = i;
        }
      });

      activeId = items[current]?.id ?? '';
      // 헤딩이 하나도 안 보이는 구간(긴 절의 한복판)에서는 방금 지나온 절
      // 한 줄만 비춘다.
      const range: [number, number] =
        first === -1 ? [current, current] : [first, last];
      if (activeRange?.[0] !== range[0] || activeRange[1] !== range[1]) {
        activeRange = range;
      }
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

  /**
   * 레일 위를 따라가는 점. 하이라이트가 어디까지 왔는지를 구간의 **끝점 하나**로
   * 요약해, 구간이 길어져도 "지금 여기"가 흐려지지 않는다.
   *
   * 올라갈 때는 구간의 머리, 내려갈 때는 꼬리를 따른다. 구간이 그대로면 마지막
   * 방향을 유지한다 — 잠깐 멈춰도 점이 반대편으로 튀지 않는다.
   */
  let prevRange: [number, number] | null = null;
  let wasUp = false;
  $effect(() => {
    const range = activeRange;
    if (!range || lengths.length === 0) return;
    const [start, end] = range;
    const up = !prevRange
      ? false
      : prevRange[0] > start || prevRange[1] > end
        ? true
        : prevRange[0] === start && prevRange[1] === end
          ? wasUp
          : false;
    prevRange = [start, end];
    wasUp = up;
    const seg = up ? lengths[start] : lengths[end];
    dotAt = seg ? (up ? seg[0] : seg[1]) : null;
  });

  /** 보이는 구간만 남기고 잘라낸다. */
  const clip = $derived.by(() => {
    const range = activeRange;
    const firstRow = range ? rows[range[0]] : undefined;
    const lastRow = range ? rows[range[1]] : undefined;
    return firstRow && lastRow
      ? `inset(${firstRow.top}px 0px ${railHeight - lastRow.bottom}px)`
      : 'inset(0px 0px 100%)';
  });

  /**
   * 앵커 클릭 — 고정 헤더 높이만큼 더 올려 준다.
   *
   * 수정자 키가 눌린 클릭은 **가로채지 않는다.** 기본 동작을 막으면
   * Cmd/Ctrl+클릭으로 새 탭을 여는 것까지 막혀 앵커로 둔 이유가 사라진다.
   */
  function onItemClick(event: MouseEvent, id: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET,
      behavior: 'smooth',
    });
    // pushState가 아니라 replaceState — 차례를 몇 번 눌러도 뒤로 가기는 글
    // 목록으로 한 번에 돌아간다.
    window.history.replaceState(null, '', `#${id}`);
  }

  const itemLink = css({
    display: 'block',
    w: 'full',
    textAlign: 'left',
    // 3px일 때는 두 줄로 접힌 항목과 다음 항목이 붙어 어디서 끊기는지 안 보였다.
    py: '1.5',
    cursor: 'pointer',
    fontSize: '[13px]',
    lineHeight: 'relaxed',
    textDecoration: 'none',
    color: 'ink.600',
    // 활성 표시는 **색만** 바꾼다. 굵기를 올리면 글자 폭이 늘어 항목이 두 줄로
    // 접히고 그 아래가 전부 밀린다 — 레일 좌표가 clip-path 애니메이션 도중에
    // 바뀌어 하이라이트가 엉뚱한 자리에 그려진다.
    fontWeight: 'normal',
    transition: '[color 0.2s ease]',
    _hover: { color: 'ink.950' },
  });
  const itemLit = css({ color: 'ink.950' });
</script>

{#if items.length > 0}
  <nav
    aria-label="이 글의 차례"
    class={css({
      pos: 'sticky',
      top: '24',
      alignSelf: 'start',
      display: 'none',
      lg: { display: 'block' },
      maxH: '[calc(100vh - 100px)]',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      // 잘린 위아래를 스크롤바 대신 페이드로 알린다. 스크롤바가 생겼다 사라질
      // 때 내용 폭이 출렁이면 경계에 걸친 항목이 한 줄에서 두 줄로 접히고,
      // 그러면 목록이 길어져 다시 스크롤바가 필요해지는 진동이 생긴다.
      scrollbarWidth: '[none]',
      '&::-webkit-scrollbar': { display: 'none' },
      maskImage: `[linear-gradient(to bottom, transparent, black ${FADE}px, black calc(100% - ${FADE}px), transparent)]`,
      py: '4',
    })}
  >
    <div class={css({ pos: 'relative' })}>
      {#if railPath}
        <div
          aria-hidden="true"
          class={css({ pos: 'absolute', left: '0', top: '0', pointerEvents: 'none' })}
          style="width:{railWidth}px;height:{railHeight}px"
        >
          <svg
            focusable="false"
            width={railWidth}
            height={railHeight}
            viewBox="0 0 {railWidth} {railHeight}"
            class={css({ overflow: 'visible' })}
          >
            <path
              d={railPath}
              fill="none"
              stroke-width="1.5"
              stroke-linecap="square"
              class={css({ stroke: 'ink.border' })}
            />
            <!-- 같은 path를 겹쳐 그리고 잘라 쓴다. clip-path만 바뀌므로 전환이 싸다. -->
            <path
              d={railPath}
              fill="none"
              stroke-width="1.5"
              stroke-linecap="square"
              style="clip-path:{clip}"
              class={css({
                stroke: 'ink.950',
                transition: '[clip-path 0.2s ease]',
                '@media (prefers-reduced-motion: reduce)': { transition: '[none]' },
              })}
            />
          </svg>
          {#if dotAt !== null}
            <div
              class={css({
                pos: 'absolute',
                left: '0',
                top: '0',
                boxSize: '[5px]',
                rounded: 'full',
                bg: 'ink.950',
                transition: '[offset-distance 0.2s ease]',
                '@media (prefers-reduced-motion: reduce)': { transition: '[none]' },
              })}
              style='offset-path:path("{railPath}");offset-distance:{dotAt}px'
            ></div>
          {/if}
        </div>
      {/if}

      <ol bind:this={listEl} class={css({ listStyleType: 'none', m: '0', p: '0' })}>
        {#each items as item, i (item.id)}
          {@const lit =
            activeRange !== null && i >= activeRange[0] && i <= activeRange[1]}
          <li bind:this={itemEls[i]}>
            <!-- 버튼이 아니라 앵커다. 스크롤은 아래 핸들러가 가로채지만(고정
                 헤더 offset이 필요하다), href가 있어야 새 탭으로 열기·링크 주소
                 복사가 살아난다. 차례 항목은 의미상으로도 문서 안 링크다. -->
            <a
              href="#{item.id}"
              onclick={(e) => {
                onItemClick(e, item.id);
              }}
              aria-current={item.id === activeId ? 'true' : undefined}
              class={lit ? `${itemLink} ${itemLit}` : itemLink}
              style="padding-left:{RAIL_STEP * 2 + (item.level - minLevel) * RAIL_STEP}px"
            >
              {item.text}
            </a>
          </li>
        {/each}
      </ol>
    </div>
  </nav>
{/if}
