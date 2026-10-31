'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '@blog/styled-system/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';
import { isModifiedClick } from '@/src/components/events';
import { pressText } from '@/src/components/interaction';
import { siteHeaderStyle } from '@/src/components/siteHeader';

/**
 * 글 차례 — 항목들을 잇는 **레일 한 줄**을 그리고, 지금 화면에 들어와 있는 절들만 밝게 비춘다. 레일은
 * 헤딩 깊이마다 오른쪽으로 한 칸씩 옮겨 서고, 단이 바뀌는 자리는 곡선으로 갈아탄다(fumadocs 기본 스타일).
 * 화면에 보이는 절이 셋이면 셋이 함께 밝아, 목록을 읽지 않아도 현재 위치와 글 전체에서의 비중이 보인다.
 *
 * 구현은 **같은 path를 두 번 그리는 것**이다. 아래는 흐린 전체 레일(`ink.border`), 위는 강조 레일
 * (`accent.solid`)을 `clip-path: inset()`으로 잘라 보이는 구간만 남긴다. 자를 값만 바뀌므로 전환 하나로
 * 미끄러진다(레일을 다시 그리지 않는다). 강조 구간의 진행 방향 끝에는 점이 레일을 따라 붙는다
 * (`offset-path`).
 *
 * Astryx 개편(#587)에서 곧은 트랙 + 막대로 바꿨다가 되돌렸다(사용자 결정, 2026-10-25) — 깊이가 레일의
 * 꺾임으로도 읽히는 쪽을 택했다. 대가는 측정이다: 항목 높이에서 path를 만들고, 점의 자리를 path 위의
 * 길이로 옮기려고 `getTotalLength`로 잰다.
 */

/** 레벨 한 단계당 레일이 오른쪽으로 밀리는 거리. */
const RAIL_STEP = 8;
/** 레일이 단을 옮길 때 쓰는 곡선의 세로 길이. 전부 다음 항목 안에 들어간다. */
const ELBOW = 8;
/** 목록 위아래에서 스크롤 내용이 사라지는 페이드 구간. */
const FADE = 16;

// 활성 표시는 **셋**이 동시에 움직인다 — 글자 색, 강조 레일(clip-path), 점(offset-distance). 목표값은
// 같은 순간에 바뀌므로 전환 시간이 다르면 따로 도착한다(레일이 늦으면 글자가 먼저 켜지고 줄이 따라붙어
// 둘이 같은 사건을 가리킨다는 게 읽히지 않았다). 값을 바꿀 일이 있으면 **셋 다** 함께 바꿀 것.

/** 항목 하나가 차지하는 세로 구간(목록 맨 위 0 기준)과 레일이 서는 가로 위치. */
export interface Row {
  x: number;
  top: number;
  bottom: number;
}

interface Measured {
  rows: Row[];
  height: number;
  width: number;
  d: string;
  /** 항목별 [세로선 시작, 끝]을 **path 위의 길이**로 표현한 것. */
  lengths: [number, number][];
}

/**
 * 항목 위치로 레일 path를 만든다.
 *
 * 세로선은 각 항목의 높이만큼 내려가고, 앞뒤 항목의 단이 다르면 곡선으로 갈아탄다. 곡선은 **전부 다음
 * 항목 안쪽**에 들어간다 — 경계에 걸치면 하이라이트가 한 항목만 비출 때 곡선이 반토막 나 허공에 뜬
 * 조각처럼 남는다. 곡선의 세로 길이는 다음 항목 높이의 절반을 넘지 않게 묶어, 항목 높이가 들쭉날쭉해도
 * 다음 경계를 침범하지 않는다.
 */
export function buildPath(rows: Row[]): string {
  const head = rows[0];
  if (head === undefined) return '';
  let d = `M ${head.x} 0`;

  rows.forEach((row, i) => {
    const next = rows[i + 1];
    const stepsHere = next !== undefined && next.x !== row.x;
    // 자기 항목은 언제나 바닥(= 다음 항목의 머리)까지 그린다.
    d += ` L ${row.x} ${stepsHere ? next.top : row.bottom}`;
    if (stepsHere) {
      const drop = Math.min(ELBOW, (next.bottom - next.top) / 2);
      const mid = next.top + drop / 2;
      d += ` C ${row.x} ${mid} ${next.x} ${mid} ${next.x} ${next.top + drop}`;
    }
  });

  return d;
}

/**
 * 항목별 세로선이 path의 몇 번째 지점에서 시작하고 끝나는지 잰다.
 *
 * 점은 CSS motion path(`offset-path`)로 움직이는데 그 좌표계가 "path 위의 거리"라 픽셀 좌표를 길이로
 * 옮겨야 한다. 곡선 구간은 직선보다 길어서 산술로는 못 구하고 브라우저의 실측 API를 쓴다. jsdom에는 이
 * API가 없다 — 없으면 빈 배열을 돌려주고 점은 그리지 않는다(레일과 하이라이트는 그대로다).
 */
export function measureLengths(d: string, rows: Row[]): [number, number][] {
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (typeof probe.getTotalLength !== 'function') return [];
  probe.setAttribute('d', d);

  const total = probe.getTotalLength();
  const out: [number, number][] = [];
  rows.forEach((row, i) => {
    // 직전 항목이 끝난 지점에서 출발해, path의 y가 이 항목의 머리에 닿을 때까지 1px씩 전진한다. 그
    // 사이에 곡선이 있으면 자연히 더 걸린다. 첫 항목은 직전이 없으니 자기 머리에서 출발한다.
    const prevSpan = out[i - 1];
    const prevRow = rows[i - 1];
    let at =
      prevSpan && prevRow ? prevSpan[1] + (row.top - prevRow.bottom) : row.top;
    while (at < total && probe.getPointAtLength(at).y < row.top) at += 1;
    // 끝도 실측한다 — 단이 바뀌어 자기 구간 안에 곡선을 품은 항목은 세로 높이만 더하면 끝점이 위로 잡힌다.
    let end = at + (row.bottom - row.top);
    while (end < total && probe.getPointAtLength(end).y < row.bottom) end += 1;
    out.push([at, end]);
  });
  return out;
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
      const minLevel = Math.min(...toc.map(i => i.level));
      const rows = toc.map(item => {
        const r = itemRefs.current.get(item.id)?.getBoundingClientRect();
        return {
          x: RAIL_STEP + (item.level - minLevel) * RAIL_STEP,
          top: r ? r.top - base : 0,
          bottom: r ? r.bottom - base : 0,
        };
      });
      const d = buildPath(rows);
      setMeasured({
        rows,
        d,
        lengths: measureLengths(d, rows),
        height: list.scrollHeight,
        width: RAIL_STEP * 2 + Math.max(...rows.map(r => r.x)),
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

  // 레일 위를 미끄러지는 점의 위치(path 길이).
  //
  // 점은 활성 구간의 **진행 방향 쪽 끝**에 붙는다 — 내려 읽으면 구간의 아래 끝, 거슬러 올라가면 위 끝.
  // 그래야 점이 "읽고 있는 지점"을 가리키는 것처럼 보인다.
  const [dotAt, setDotAt] = useState<number | null>(null);
  const prevRange = useRef<[number, number] | null>(null);
  const wasUp = useRef(false);
  useEffect(() => {
    if (!measured || !activeRange || measured.lengths.length === 0) return;
    const [start, end] = activeRange;
    const prev = prevRange.current;
    const up = !prev
      ? false
      : prev[0] > start || prev[1] > end
        ? true
        : // 구간이 그대로면 마지막 방향을 유지한다(구간이 잠깐 멈춰도 점이 반대편으로 튀지 않는다).
          prev[0] === start && prev[1] === end
          ? wasUp.current
          : false;
    prevRange.current = [start, end];
    wasUp.current = up;

    const seg = up ? measured.lengths[start] : measured.lengths[end];
    setDotAt(seg ? (up ? seg[0] : seg[1]) : null);
  }, [activeRange, measured]);

  if (toc.length === 0) return null;

  // 지금 화면에 보이는 절**들**만 남기고 잘라낸다. 구간은 스크롤마다 처음부터 다시 계산되므로(tocHooks),
  // 판정이 한 번 어긋나도 다음 프레임에 스스로 제자리를 찾는다 — 예전 누적 Set 방식처럼 잔상이
  // 남을 수가 없다.
  const first = measured && activeRange ? measured.rows[activeRange[0]] : null;
  const last = measured && activeRange ? measured.rows[activeRange[1]] : null;
  const clip =
    first && last && measured
      ? `inset(${first.top}px 0px ${measured.height - last.bottom}px)`
      : 'inset(0px 0px 100%)';
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
        {measured && measured.d && (
          // 레일·점은 장식이라 스크린리더에서 숨긴다. 움직임 줄이기는 시간 토큰이 끈다.
          <div
            aria-hidden
            className={css({
              pos: 'absolute',
              left: '0',
              top: '0',
              pointerEvents: 'none',
            })}
            style={{ width: measured.width, height: measured.height }}
          >
            <svg
              focusable="false"
              width={measured.width}
              height={measured.height}
              viewBox={`0 0 ${measured.width} ${measured.height}`}
              className={css({ overflow: 'visible' })}
            >
              <path
                d={measured.d}
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="square"
                className={css({ stroke: 'ink.border' })}
              />
              {/* 같은 path를 겹쳐 그리고 잘라 쓴다. clip-path만 바뀌므로 전환이 싸다. */}
              <path
                d={measured.d}
                fill="none"
                strokeWidth="1.5"
                strokeLinecap="square"
                style={{ clipPath: clip }}
                className={css({
                  stroke: 'accent.solid',
                  // ↓ 글자 색·점과 같은 시간. 위 주석 참고.
                  transitionProperty: 'clip-path',
                  transitionDuration: 'fast',
                  transitionTimingFunction: 'standard',
                })}
              />
            </svg>
            {/* 레일 위를 따라가는 점 — 구간이 길어져도 "지금 여기"를 끝점 하나로 요약한다. 좌표는
                offset-path가 맡는다. */}
            {dotAt !== null && (
              <div
                className={css({
                  pos: 'absolute',
                  left: '0',
                  top: '0',
                  boxSize: '[5px]',
                  rounded: 'full',
                  bg: 'accent.solid',
                  transitionProperty: 'offset-distance',
                  transitionDuration: 'fast',
                  transitionTimingFunction: 'standard',
                })}
                style={{
                  offsetPath: `path("${measured.d}")`,
                  offsetDistance: `${dotAt}px`,
                }}
              />
            )}
          </div>
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
            // 색은 구간 전체가 함께 밝아진다(강조 레일과 같은 범위).
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
                  className={css(pressText, {
                    display: 'block',
                    py: '1',
                    pr: '2',
                    cursor: 'pointer',
                    textStyle: 'body',
                    color: 'ink.700',
                    // 활성 표시는 **색과 레일만** 바꾼다. 굵기를 올리면 글자 폭이 늘어 항목이 한 줄에서
                    // 두 줄로 접히고, 그 아래 항목이 전부 20px씩 밀린다(실측: 목록 높이 917 → 937px).
                    // 스크롤할 때마다 차례가 들썩이는 데다, 레일 좌표가 clip-path 전환 도중에 바뀌어
                    // 하이라이트가 엉뚱한 자리에 그려진다. 글자 색의 전환은 `pressText`가 든다 — hover와
                    // 같은 fast·standard라 위 레일·점과 한 박자다.
                    '&[data-lit]': { color: 'accent.solid' },
                    _hover: { color: 'ink.950' },
                  })}
                  // 레일이 서는 자리(x)에서 한 칸 더 띄운다 — 깊을수록 레일과 함께 들어간다.
                  style={{
                    paddingLeft: `${RAIL_STEP * 2 + depth * RAIL_STEP}px`,
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
