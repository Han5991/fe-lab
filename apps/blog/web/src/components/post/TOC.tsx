'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '@blog/styled-system/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { isModifiedClick } from '@/src/components/events';
import { siteHeaderStyle } from '@/src/components/siteHeader';

/**
 * 글 차례 — 항목들 옆에 **곧은 트랙 한 줄**(2px)을 깔고, 지금 화면에 들어와 있는 절들만 같은 폭의
 * **막대**가 덮는다(Astryx Outline). 화면에 보이는 절이 셋이면 막대도 그 셋을 한 번에 덮어, 목록을 읽지
 * 않아도 현재 위치와 글 전체에서의 비중이 보인다.
 *
 * 예전에는 항목의 깊이마다 꺾이는 베지어 레일과 그 위를 따라가는 점이었다. 곡선 path를 항목 높이에서
 * 다시 재고(`getTotalLength`로 점의 거리까지) 같은 path를 두 번 그려 clip-path로 잘랐는데, 깊이는 들여쓰기
 * 로도 읽히고 곡선이 길이 계산·ResizeObserver·SVG를 끌고 왔다. 지금은 항목의 위·아래 두 값만 잰다.
 *
 * 막대는 `top`·`height` 전환 하나로 미끄러진다. 막대·밝힌 항목은 `accent.solid`(본문 잉크)다 — 현재 위치
 * 표식이라 선택 탭·세그먼트·모바일 목차와 같은 이름을 쓴다. 굵기는 바꾸지 않는다(아래 항목 스타일 주석).
 */

/** 목록 위아래에서 스크롤 내용이 사라지는 페이드 구간. */
const FADE = 16;
/** 항목의 왼쪽 안쪽 여백 — 가장 얕은 헤딩(h2)은 12, 한 단계 깊어질 때마다 16씩(12 · 28 · 44). */
const INDENT_BASE = 12;
const INDENT_STEP = 16;

// 활성 표시는 **둘**이 동시에 움직인다 — 글자 색과 막대(top·height). 목표값은 같은 순간에 바뀌므로
// 전환 시간이 다르면 따로 도착한다. 막대가 늦으면 글자가 먼저 켜지고 막대가 따라붙어, 둘이 같은
// 사건을 가리킨다는 게 읽히지 않는다. 값을 바꿀 일이 있으면 **둘 다** 함께 바꿀 것.

/** 항목 하나가 차지하는 세로 구간 — 목록 맨 위(0) 기준. */
interface Row {
  top: number;
  bottom: number;
}

interface Measured {
  rows: Row[];
}

export const TOC = () => {
  const { toc, activeId, activeRange } = useTocHook();
  const scrollRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const [measured, setMeasured] = useState<Measured | null>(null);

  // 헤딩 목록이 정해진 뒤 한 번, 그리고 폭이 바뀔 때마다(줄바꿈이 달라져 항목 높이가 바뀐다) 다시 잰다.
  useEffect(() => {
    const list = listRef.current;
    if (!list || toc.length === 0) return;

    const measure = () => {
      const base = list.getBoundingClientRect().top;
      setMeasured({
        rows: toc.map(item => {
          const r = itemRefs.current.get(item.id)?.getBoundingClientRect();
          return r
            ? { top: r.top - base, bottom: r.bottom - base }
            : { top: 0, bottom: 0 };
        }),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [toc]);

  // 활성 항목이 차례 바깥으로 밀려나면 차례를 스크롤해 다시 데려온다.
  //
  // 항목이 스물 몇 개인 글에서는 목록이 화면보다 길어 아래쪽 절반이 잘린다.
  // 그 상태로 본문을 읽어 내려가면 하이라이트가 잘린 구간으로 들어가 **차례가
  // 통째로 멈춰 보인다** — 실제로는 갱신되고 있는데 보이지 않을 뿐이다.
  // fumadocs도 같은 이유로 활성 항목을 컨테이너 안으로 끌어온다.
  //
  // 다만 스크롤은 **차례 안에서만** 일어나야 한다. `el.scrollIntoView()`는
  // 조상 스크롤러를 전부 건드려서 본문(=페이지)까지 함께 움직이는데, 그러면
  // 스크롤이 활성 항목을 바꾸고 그 갱신이 다시 스크롤을 부르는 되먹임이 된다.
  // 그래서 컨테이너의 scrollTop만 직접 옮긴다.
  const isFirstSync = useRef(true);
  useEffect(() => {
    // "첫 동기화"는 **마운트 직후 한 번**을 뜻한다. 아래 가드들 뒤에서
    // 내리면, 글 맨 위에서 읽기 시작해 한동안 보정할 일이 없던 경우
    // (가장 흔한 경우다) 한참 뒤 처음 필요해진 보정이 "중간부터 연 것"으로
    // 오인돼 순간 이동으로 처리된다.
    const isFirst = isFirstSync.current;
    isFirstSync.current = false;

    const box = scrollRef.current;
    const el = activeId ? itemRefs.current.get(activeId) : undefined;
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

    // 마운트 직후는 제자리만 잡고, 그 밖에는 페이지의 scroll-behavior를 따른다 —
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

  // 지금 화면에 보이는 절**들**을 덮는다. 구간은 스크롤마다 처음부터 다시 계산되므로(tocHooks),
  // 판정이 한 번 어긋나도 다음 프레임에 스스로 제자리를 찾는다 — 예전 누적 Set 방식처럼 잔상이
  // 남을 수가 없다.
  const first = measured && activeRange ? measured.rows[activeRange[0]] : null;
  const last = measured && activeRange ? measured.rows[activeRange[1]] : null;
  const minLevel = Math.min(...toc.map(x => x.level));

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
        // 16px을 투명으로 흐린다. 아래 py도 같은 이유다(첫·마지막 항목이
        // 페이드 구간에 앉아 흐릿하게 시작하지 않도록 여백을 준다).
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        maskImage: `[linear-gradient(to bottom, transparent, black ${FADE}px, black calc(100% - ${FADE}px), transparent)]`,
        // 페이드 구간과 정확히 같은 16px. 더 좁으면 첫·마지막 항목의 글자가
        // 상시 반쯤 흐려 보인다.
        py: '4',
      })}
      // 눈에 보이는 "이 글의 차례" 라벨은 뺐다(좁은 사이드바가 지저분해진다).
      // 이 aria-label이 스크린리더용 이름을 계속 대므로 접근성은 그대로다.
      aria-label="이 글의 차례"
    >
      <div className={css({ pos: 'relative' })}>
        {/* 트랙 — 항목 옆의 곧은 선. 장식이라 스크린리더에서 숨긴다. */}
        <div
          aria-hidden
          className={css({
            pos: 'absolute',
            top: '0',
            bottom: '0',
            left: '0',
            w: '[2px]',
            rounded: 'full',
            bg: 'ink.border',
            pointerEvents: 'none',
          })}
        />
        {first && last && (
          // 막대 — 보이는 절들의 첫 항목 위에서 마지막 항목 아래까지. 움직임 줄이기는 시간 토큰이 끈다.
          <div
            aria-hidden
            className={css({
              pos: 'absolute',
              left: '0',
              w: '[2px]',
              rounded: 'full',
              bg: 'accent.solid',
              pointerEvents: 'none',
              // ↓ 글자 색과 같은 시간. 위 주석 참고.
              transitionProperty: 'top, height',
              transitionDuration: 'fast',
              transitionTimingFunction: 'standard',
            })}
            style={{ top: first.top, height: last.bottom - first.top }}
          />
        )}

        <ol
          ref={listRef}
          className={css({
            listStyleType: 'none',
            m: '0',
            p: '0',
            display: 'flex',
            flexDir: 'column',
            gap: '0.5',
          })}
        >
          {toc.map((item, i) => {
            const depth = item.level - minLevel;
            // 색은 구간 전체가 함께 밝아진다(막대와 같은 범위).
            // 반면 `aria-current`는 한 항목뿐이다 — 스크린리더에 "현재 위치"가
            // 여럿이면 어디를 읽고 있다는 건지 알 수 없다.
            const isLit = activeRange
              ? i >= activeRange[0] && i <= activeRange[1]
              : false;
            return (
              <li
                key={item.id}
                ref={el => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
              >
                {/* 앵커다 — 스크롤은 onClick이 가로채도 href가 있어야 새 탭으로 열기·주소
                    복사가 산다. */}
                <a
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
                  className={css({
                    display: 'block',
                    py: '1',
                    pr: '2',
                    cursor: 'pointer',
                    textStyle: 'body',
                    color: 'ink.700',
                    '&[data-lit]': { color: 'accent.solid' },
                    // 활성 표시는 **색과 막대만** 바꾼다. 굵기를 올리면 글자 폭이 늘어 항목이 한 줄에서
                    // 두 줄로 접히고, 그 아래 항목이 전부 20px씩 밀린다(실측: 목록 높이 917 → 937px).
                    // 스크롤할 때마다 차례가 들썩이는 데다, 막대 좌표가 전환 도중에 바뀌어 막대가
                    // 엉뚱한 자리에 그려진다.
                    transition: 'colors',
                    _hover: { color: 'ink.950' },
                  })}
                  // 막대(트랙)가 서는 자리에서 한 칸 더 띄운다 — 깊을수록 더 들어간다.
                  style={{
                    paddingLeft: `${INDENT_BASE + depth * INDENT_STEP}px`,
                  }}
                >
                  {item.text}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
