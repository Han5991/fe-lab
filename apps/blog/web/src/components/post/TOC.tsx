'use client';

import { useEffect, useRef } from 'react';
import { css } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { TocTitle } from '@/src/components/TocTitle';
import { isModifiedClick } from '@/src/components/events';
import { pressText } from '@/src/components/interaction';
import { siteHeaderStyle } from '@/src/components/siteHeader';

/**
 * 글 차례 — 지금 화면에 들어와 있는 헤딩들의 항목을 **틴트 면 하나**로 덮어 비춘다(`useTocHook`의 활성
 * 구간). 화면에 헤딩이 셋이면 세 항목이 한 면 안에 들어, 목록을 읽지 않아도 현재 위치와 글 전체에서의
 * 비중이 보인다.
 *
 * 구조는 fumadocs(MIT)의 `block` 차례(`packages/radix-ui/src/components/toc/block.tsx`)를 옮겼다 — 목록
 * 전체를 덮는 면을 하나 깔고 `clip-path: inset(… round …)`으로 활성 구간만 남긴다. 잘라 낼 값만 바뀌니 전환
 * 하나로 늘고 줄며 미끄러진다. fumadocs와 다른 점:
 * - 색과 모션은 블로그 토큰이다(fd-primary → `accent.*`, 300ms ease-out → fastMax·standard).
 * - 첫 자리는 전환 없이 잡는다(`data-ready`, `paintBlock`). fumadocs는 첫 배치도 펼치며 그린다.
 * - 항목 좌표는 목록 순서대로, 마운트할 때와 크기가 바뀔 때 잰다. 차례가 숨은 동안(lg 미만)은 재지 않는다.
 *
 * 2026-10-25에는 깊이마다 꺾이는 SVG 레일 + 레일을 따라가는 점(fumadocs 옛 기본 스타일)을 택했지만,
 * 2026-10-31 사용자 결정으로 이 면 방식으로 바꿨다 — 스크롤하면 레일의 꼬리가 사라지거나 깜빡이고 점이
 * 부자연스럽게 움직였다. 레일 path·path 길이 실측·점의 방향 판정이 전부 빠졌다.
 */

/** 헤딩 깊이별 왼쪽 여백 — fumadocs `getItemOffset`과 같은 값(h2 8 · h3 20 · h4 32). */
const itemOffset = (level: number): number =>
  level <= 2 ? 8 : level === 3 ? 20 : 32;

/** 목록 위아래에서 스크롤 내용이 사라지는 페이드 구간. */
const FADE = 16;

/** 활성 구간 면의 모서리 — 라운드 토큰을 그대로 `inset(… round …)`에 넣는다. */
const BLOCK_RADIUS = token.var('radii.inner');

/** 잰 항목 좌표 — 항목별 [위, 아래]와 목록 높이. */
interface Layout {
  positions: [number, number][];
  height: number;
}

/** 아직 못 쟀거나 숨어 있어 잴 수 없는 상태 — `paintBlock`이 아무것도 그리지 않는다. */
const EMPTY_LAYOUT: Layout = { positions: [], height: 0 };

/** 면을 활성 구간 [첫, 마지막] 항목의 위·아래로 자른다. */
const paintBlock = (
  block: HTMLElement,
  { positions, height }: Layout,
  range: [number, number] | null,
) => {
  if (!range) return;
  const first = positions[range[0]];
  const last = positions[range[1]];
  // 아직 못 잰 항목이면 그리지 않는다 — 직전 면을 그대로 두는 편이 엉뚱한 자리로 튀는 것보다 낫다.
  if (!first || !last) return;
  block.style.clipPath = `inset(${first[0]}px 0px ${height - last[1]}px round ${BLOCK_RADIUS})`;
  // 첫 자리는 전환 없이 잡는다. 전환을 켠 채 첫 값을 넣으면 접힌 상태(`inset(0 0 100%)`)에서 펼쳐지는
  // 움직임이 하드 로드마다 재생된다. 새 값을 계산된 스타일에 먼저 반영(읽기로 강제)한 뒤 전환을 켜야
  // 이번 값이 출발점이 된다 — 프레임 하나 미루는 것으로는 같은 스타일 계산에 둘이 함께 들어갈 수 있다.
  if (!block.hasAttribute('data-ready')) {
    getComputedStyle(block).getPropertyValue('clip-path');
    block.setAttribute('data-ready', '');
  }
};

export const TOC = () => {
  const { toc, activeId, activeRange } = useTocHook();
  const scrollRef = useRef<HTMLElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());

  // 항목 위치는 **크기가 바뀔 때만** 잰다(줄바꿈이 달라져 항목 높이가 바뀐다). 활성 구간이 바뀔 때는
  // 잰 값으로 clip-path만 고쳐 쓰고 레이아웃을 읽지 않는다 — fumadocs와 같다. 값은 렌더와 무관해서
  // 상태가 아니라 ref에 두고, 면의 style을 직접 고친다(렌더를 한 바퀴 돌면 그만큼 늦게 따라온다).
  const layout = useRef<Layout>(EMPTY_LAYOUT);
  const latestRange = useRef(activeRange);

  useEffect(() => {
    const column = columnRef.current;
    const block = blockRef.current;
    if (!column || !block || toc.length === 0) return;

    const measure = () => {
      const base = column.getBoundingClientRect();
      // 숨은 동안(lg 미만 display:none)은 전부 0으로 잰다. 그 값으로 그리면 면이 목록 전체를 덮은 채
      // 남았다가, 다시 보일 때 거기서부터 구간으로 쓸려 내려온다. 잰 값을 비우고 첫 자리 표시도
      // 거둬, 다시 보이는 첫 측정이 전환 없이 제자리를 잡게 한다.
      if (base.height === 0) {
        layout.current = EMPTY_LAYOUT;
        block.removeAttribute('data-ready');
        return;
      }
      // column 기준 좌표(화면 좌표의 차)라 차례가 스크롤돼도 변하지 않는다. offsetTop은 정수로 잘려,
      // 글자 크기를 키운 환경(항목 높이 31.5px 등)에서 면 끝이 이웃 항목으로 1px 넘어갔다.
      layout.current = {
        positions: toc.map(item => {
          const rect = itemRefs.current.get(item.id)?.getBoundingClientRect();
          return rect ? [rect.top - base.top, rect.bottom - base.top] : [0, 0];
        }),
        height: base.height,
      };
      paintBlock(block, layout.current, latestRange.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(column);
    return () => ro.disconnect();
  }, [toc]);

  useEffect(() => {
    latestRange.current = activeRange;
    const block = blockRef.current;
    if (block) paintBlock(block, layout.current, activeRange);
  }, [activeRange]);

  // 활성 항목이 차례 바깥으로 밀려나면 차례를 스크롤해 다시 데려온다.
  //
  // 항목이 스물 몇 개인 글에서는 목록이 화면보다 길어 아래쪽 절반이 잘린다.
  // 그 상태로 본문을 읽어 내려가면 하이라이트가 잘린 구간으로 들어가 **차례가
  // 통째로 멈춰 보인다** — 실제로는 갱신되고 있는데 보이지 않을 뿐이다.
  // fumadocs는 활성 항목이 바뀔 때마다 가운데로 끌어오지만(scrollMode 'always'),
  // 여기서는 상자 밖으로 나갈 때만 옮긴다 — 읽는 동안 목록이 매번 움직이지 않게.
  //
  // 다만 스크롤은 **차례 안에서만** 일어나야 한다. `el.scrollIntoView()`는
  // 조상 스크롤러를 전부 건드려서 본문(=페이지)까지 함께 움직이는데, 그러면
  // 스크롤이 활성 항목을 바꾸고 그 갱신이 다시 스크롤을 부르는 되먹임이 된다.
  // 그래서 컨테이너의 scrollTop만 직접 옮긴다.
  const isFirstSync = useRef(true);
  useEffect(() => {
    // 마운트 직후의 빈 값은 아직 활성 항목이 없다는 뜻이라 동기화가 아니다. 여기서 "첫
    // 동기화"를 써 버리면 순간 이동 분기에 영영 닿지 못한다(중간에서 연 글도 미끄러졌다).
    if (!activeId) return;
    // "첫 동기화"는 **활성 항목이 처음 정해진 한 번**이다. 아래 가드들 뒤에서
    // 내리면, 글 맨 위에서 읽기 시작해 한동안 보정할 일이 없던 경우
    // (가장 흔한 경우다) 한참 뒤 처음 필요해진 보정이 "중간부터 연 것"으로
    // 오인돼 순간 이동으로 처리된다.
    const isFirst = isFirstSync.current;
    isFirstSync.current = false;

    const box = scrollRef.current;
    const el = itemRefs.current.get(activeId);
    if (!box || !el) return;
    if (box.scrollHeight <= box.clientHeight) return;

    const boxRect = box.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // 컨테이너 내용 좌표 = 화면 좌표 차이 + 지금 스크롤량.
    const top = elRect.top - boxRect.top + box.scrollTop;
    const bottom = top + elRect.height;
    // 페이드 구간에 걸치면 글자가 반쯤 지워져 보이므로 그만큼 안쪽을 기준으로 본다.
    const inView =
      top >= box.scrollTop + FADE &&
      bottom <= box.scrollTop + box.clientHeight - FADE;
    if (inView) return;

    // 첫 동기화는 제자리만 잡고, 그 밖에는 페이지의 scroll-behavior를 따른다 —
    // 차례 상자에 같은 CSS를 주면 키보드 초점 이동까지 미끄러진다.
    const smooth =
      !isFirst &&
      getComputedStyle(document.documentElement).scrollBehavior === 'smooth';
    box.scrollTo({
      top: top - (box.clientHeight - elRect.height) / 2,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, [activeId]);

  if (toc.length === 0) return null;

  return (
    <nav
      ref={scrollRef}
      style={siteHeaderStyle}
      className={css({
        pos: 'sticky',
        // 사이트 헤더 아래 24에 붙고, 최대 높이는 그 자리에서 화면 바닥까지다 — 둘 다 헤더 높이
        // 변수에서 계산해 헤더가 바뀌어도 차례가 헤더 밑으로 들어가거나 화면 밖으로 넘치지 않는다.
        top: '[calc(var(--site-header-height) + token(spacing.6))]',
        alignSelf: 'start',
        display: 'none',
        lg: { display: 'block' },
        maxH: '[calc(100vh - var(--site-header-height) - token(spacing.6))]',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        // 잘린 위아래를 스크롤바 대신 **페이드**로 알린다.
        //
        // 예전에는 `scrollbar-gutter: stable`로 스크롤바 자리를 늘 비워 뒀다.
        // 스크롤바가 생겼다 사라질 때 내용 폭이 출렁이면 경계에 걸친 항목이 한 줄에서 두 줄로
        // 접히고, 그러면 목록이 길어져 다시 스크롤바가 필요해지는 진동이 생기기 때문이다.
        // 스크롤바를 아예 감추면 그 자리를 내내 비워둘 이유가 사라진다 — 폭은 여전히 고정이다.
        //
        // 대신 "여기서 잘렸다"는 신호가 없어지므로, fumadocs처럼 위아래
        // 16px을 투명으로 흐린다.
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: `[linear-gradient(to bottom, transparent, black ${FADE}px, black calc(100% - ${FADE}px), transparent)]`,
        // 페이드 구간과 같은 16px — 첫·마지막 항목의 상자(그 위의 면까지)가 통째로 페이드 밖에 앉는다.
        // fumadocs는 12라 면의 끝 4px이 페이드에 걸린다(글자는 항목 안쪽 여백 4 덕에 걸리지 않는다).
        py: '4',
      })}
      // 눈에 보이는 "이 글의 차례" 라벨은 뺐다(좁은 사이드바가 지저분해진다).
      // 이 aria-label이 스크린리더용 이름을 계속 대므로 접근성은 그대로다.
      aria-label="이 글의 차례"
    >
      {/* 면과 항목 좌표의 기준 상자다 — 면은 이 상자를 덮고, 항목은 이 상자의 위끝에서 잰다. */}
      <div ref={columnRef} className={css({ pos: 'relative' })}>
        {/* 목록 전체를 덮는 면 — clip-path로 활성 구간만 남긴다. 장식이라 스크린리더에서 숨긴다.
            fumadocs는 `fd-primary/10`, 여기서는 같은 자리의 잉크 틴트(accent.muted)다. 움직임 줄이기는
            시간 토큰이 끈다. */}
        <div
          ref={blockRef}
          aria-hidden
          className={css({
            pos: 'absolute',
            inset: '0',
            bg: 'accent.muted',
            pointerEvents: 'none',
            clipPath: 'inset(0 0 100%)',
            // fumadocs는 300ms ease-out — Astryx 시간 단(fast·fastMax·medium·mediumMax) 중 가장 가까운
            // fastMax(230ms)에 감속 곡선 standard를 쓴다(release·spring은 누름 전용이다). 글자 색(`pressText`,
            // fast)보다 늦게 도착하는 건 fumadocs도 같다(글자 150ms·면 300ms) — 면이 글자를 따라 미끄러진다.
            // 첫 자리는 전환 없이 잡는다(data-ready, `paintBlock`).
            '&[data-ready]': {
              transitionProperty: 'clip-path',
              transitionDuration: 'fastMax',
              transitionTimingFunction: 'standard',
            },
          })}
        />
        <ol
          className={css({
            listStyleType: 'none',
            m: '0',
            p: '0',
            display: 'flex',
            flexDir: 'column',
          })}
        >
          {toc.map((item, i) => {
            // 색은 구간 전체가 함께 밝아진다(면과 같은 범위).
            // 반면 `aria-current`는 한 항목뿐이다 — 스크린리더에 "현재 위치"가
            // 여럿이면 어디를 읽고 있다는 건지 알 수 없다.
            const isLit = activeRange
              ? i >= activeRange[0] && i <= activeRange[1]
              : false;
            return (
              <li key={item.id}>
                {/* 앵커다 — 스크롤은 onClick이 가로채도 href가 있어야 새 탭으로 열기·주소
                    복사가 산다. */}
                <a
                  ref={el => {
                    if (el) itemRefs.current.set(item.id, el);
                    else itemRefs.current.delete(item.id);
                  }}
                  href={`#${item.id}`}
                  onClick={e => {
                    // 수정자 키가 눌린 클릭은 **가로채지 않는다.** 여기서
                    // 기본 동작을 막으면 Cmd/Ctrl+클릭으로 새 탭을 여는
                    // 동작까지 함께 막혀, 앵커로 바꾼 이유가 사라진다.
                    if (isModifiedClick(e)) return;
                    e.preventDefault();
                    scrollToId({
                      id: item.id,
                      // 주소창 해시는 이동한 뒤에 맞춘다. pushState가 아니라
                      // replaceState라, 차례를 몇 번 눌러도 뒤로 가기는 글
                      // 목록으로 한 번에 돌아간다.
                      action: () =>
                        window.history.replaceState(null, '', `#${item.id}`),
                    });
                  }}
                  aria-current={item.id === activeId ? 'true' : undefined}
                  // 밝힘은 data 속성으로 건다 — 색을 `isLit ? … : …`로 고르면 Panda가 그 값을
                  // 빌드 때 따라가지 못하고(useTocHook의 런타임 값) 한쪽 색만 추출한다.
                  data-lit={isLit || undefined}
                  className={css(pressText, {
                    // 면(absolute)보다 위에 그린다 — 정적 항목은 면 아래로 깔려 제목 속 코드 칩이 틴트에
                    // 묻혔다. fumadocs 항목도 relative다.
                    pos: 'relative',
                    display: 'block',
                    py: '1',
                    pr: '2',
                    // 키보드 초점이 차례 상자를 스크롤할 때 항목이 페이드에 걸리지 않게(fumadocs scroll-m-4).
                    scrollMarginBlock: `[${FADE}px]`,
                    cursor: 'pointer',
                    textStyle: 'body',
                    // 꺼진 항목도 accent.muted 위 AA 하한인 ink.700이다(fumadocs muted-foreground보다 진하다).
                    // 면은 clip-path로 잘려 있어도 상자는 목록 전체를 덮어, 접근성 검사(axe)는 clip-path를
                    // 모른 채 모든 항목이 면 위에 있다고 본다 — ink.600이면 4.12:1로 걸렸다(라이트·다크
                    // 모두). 면이 움직이는 동안 잠깐 그 위를 지나는 항목도 같다. 켜짐과 꺼짐은 면이 가른다.
                    color: 'ink.700',
                    overflowWrap: 'anywhere',
                    // 활성 표시는 **색과 면만** 바꾼다. 굵기를 올리면 글자 폭이 늘어 항목이 한 줄에서
                    // 두 줄로 접히고, 그 아래 항목이 전부 20px씩 밀린다(실측: 목록 높이 917 → 937px).
                    // 스크롤할 때마다 차례가 들썩이는 데다, 잰 좌표가 어긋나 면이 엉뚱한 자리에
                    // 그려진다. 글자 색의 전환은 `pressText`가 든다(hover와 같은 fast·standard).
                    '&[data-lit]': { color: 'accent.solid' },
                    _hover: { color: 'ink.950' },
                  })}
                  style={{ paddingLeft: `${itemOffset(item.level)}px` }}
                >
                  <TocTitle parts={item.parts} />
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
