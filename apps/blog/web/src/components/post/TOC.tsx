'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import {
  useTocHook,
  scrollToId,
  HEADER_OFFSET,
} from '@/src/components/tocHooks';

/**
 * 글 차례 — 항목들을 잇는 **레일 한 줄**을 그리고, 지금 읽고 있는 구간만
 * 밝게 비춘다.
 *
 * 예전에는 항목마다 좌측 바가 하나씩 있어서, 회고처럼 항목이 20개 넘는 글에서는
 * 바가 스무 줄 늘어서기만 하고 "지금 어디"가 안 읽혔다. 레일을 하나로 잇고
 * 그 위를 스크롤에 따라 움직이는 하이라이트로 표시하면, 목록을 읽지 않아도
 * 현재 위치와 글 전체에서의 비중이 함께 보인다.
 *
 * 구현은 **같은 path를 두 번 그리는 것**이다. 아래는 흐린 전체 레일, 위는 강조
 * 레일을 `clip-path: inset()`으로 잘라 보이는 구간만 남긴다. 자를 값만 바꾸면
 * 되므로 transition 한 줄로 부드럽게 미끄러진다(레일을 다시 그리지 않는다).
 *
 * 색은 액센트가 아니라 `ink.950`이다. 차례는 본문을 읽는 보조 장치라 포인트색을
 * 쓸 자리가 아니고(핸드오프 §3), 무채색이면 나중에 액센트를 바꿔도 여기는
 * 영향을 받지 않는다.
 */

/** 레벨 한 단계당 레일이 오른쪽으로 밀리는 거리. */
const RAIL_STEP = 8;
/** 레일이 단을 옮길 때 쓰는 곡선의 세로 길이. 전부 다음 항목 안에 들어간다. */
const ELBOW = 8;
/** 목록 위아래에서 스크롤 내용이 사라지는 페이드 구간. */
const FADE = 16;

// 활성 표시는 **세 군데**가 동시에 움직인다 — 글자 색, 레일 하이라이트
// (clip-path), 레일 위의 점(offset-distance). 셋의 목표값은 같은 순간에
// 바뀌므로 전환 시간이 다르면 따로 도착한다. 실제로 레일만 0.3s였을 때
// 차례를 누르면 글자가 먼저 켜지고 줄이 100ms 늦게 따라붙어, 둘이 같은
// 사건을 가리킨다는 게 읽히지 않았다. 값을 바꿀 일이 있으면 **셋 다** 함께
// 바꿀 것(레퍼런스도 색과 clip-path에 같은 시간을 쓴다).

/** 항목 하나가 차지하는 세로 구간과 레일이 서는 가로 위치. */
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
 * 항목 위치를 재서 레일 path를 만든다.
 *
 * 세로선은 각 항목의 높이만큼 내려가고, 앞뒤 항목의 단이 다르면 곡선으로
 * 갈아탄다. 레퍼런스(fumadocs)의 기본 스타일과 같은 베지어다.
 *
 * 곡선은 **전부 다음 항목 안쪽**에 들어간다. 예전에는 경계를 중심으로 위아래
 * 절반씩 걸치게 그렸는데, 하이라이트가 한 항목만 비출 때 곡선도 반토막이 나
 * 어디에도 안 닿는 조각이 허공에 뜬 것처럼 남았다. 곡선을 통째로 한 항목에
 * 넣으면 그 항목이 켜질 때 곡선과 세로선이 이어져 보이고, 이전 항목이 켜질
 * 때는 세로선만 깔끔하게 끊긴다.
 *
 * (한때 각진 대각선이었다. 곡선이 촘촘한 목록에서 뭉갠다고 봤기 때문인데,
 *  실제 원인은 곡선이 아니라 세로 길이를 제한하지 않은 것이었다. 아래
 *  `drop`이 다음 항목 높이의 절반을 넘지 않게 묶고 나면 곡선도 겹치지 않는다.)
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
    // 곡선의 세로 길이는 다음 항목 높이의 절반을 넘지 않게 묶는다. 두 줄짜리
    // 항목 뒤에 한 줄 항목이 오는 식으로 높이가 들쭉날쭉해도 곡선이 그 항목을
    // 넘어가 다음 경계를 침범하지 않는다.
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
 * 레일을 따라 미끄러지는 점은 CSS motion path(`offset-path`)로 움직이는데,
 * 그 좌표계가 "path 위의 거리"라 픽셀 좌표를 길이로 옮겨야 한다. 곡선 구간은
 * 직선보다 길어서 산술로는 못 구하고 브라우저의 실측 API를 쓴다.
 *
 * jsdom에는 이 API가 없다. 없으면 빈 배열을 돌려주고, 점은 그리지 않는다
 * (레일과 하이라이트는 그대로다).
 */
export function measureLengths(d: string, rows: Row[]): [number, number][] {
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  if (typeof probe.getTotalLength !== 'function') return [];
  probe.setAttribute('d', d);

  const total = probe.getTotalLength();
  const out: [number, number][] = [];
  rows.forEach((row, i) => {
    // 직전 항목이 끝난 지점에서 출발해, path의 y가 이 항목의 머리에 닿을
    // 때까지 1px씩 전진한다. 그 사이에 곡선이 있으면 자연히 더 걸린다.
    // i > 0 이면 직전 반복이 out[i-1]을 넣었고 rows[i-1]도 존재한다.
    let at =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- 위 주석: i > 0 이면 둘 다 존재
      i === 0 ? row.top : out[i - 1]![1] + (row.top - rows[i - 1]!.bottom);
    while (at < total && probe.getPointAtLength(at).y < row.top) at += 1;
    // 끝도 같은 방식으로 실측한다. 세로 높이만 더하면, 단이 바뀌어 자기
    // 구간 안에 곡선을 품은 항목에서 끝점이 실제보다 위로 잡힌다(곡선은
    // 같은 세로 거리를 가는 데 길이를 더 쓴다). 점이 몇 px 위에 찍히는
    // 정도의 오차지만, 보정 비용이 루프 몇 번뿐이라 맞춰 둔다.
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

  // 헤딩 목록이 정해진 뒤 한 번, 그리고 폭이 바뀔 때마다 다시 잰다.
  useEffect(() => {
    const list = listRef.current;
    if (!list || toc.length === 0) return;

    const measure = () => {
      const base = list.getBoundingClientRect().top;
      const minLevel = Math.min(...toc.map(i => i.level));
      const rows = toc.map(item => {
        const el = itemRefs.current.get(item.id);
        const r = el?.getBoundingClientRect();
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

    // 마운트 직후(글을 중간부터 열었을 때)는 애니메이션 없이 제자리를 잡는다.
    const instant =
      isFirst || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    box.scrollTo({
      top: top - (box.clientHeight - elRect.height) / 2,
      behavior: instant ? 'auto' : 'smooth',
    });
  }, [activeId]);

  // 레일 위를 미끄러지는 점의 위치(path 길이).
  //
  // 점은 활성 구간의 **진행 방향 쪽 끝**에 붙는다 — 내려 읽으면 구간의 아래
  // 끝, 거슬러 올라가면 위 끝. 그래야 점이 "읽고 있는 지점"을 가리키는
  // 것처럼 보인다(레퍼런스도 같은 규칙이다).
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
        : // 구간이 그대로면 마지막 방향을 유지한다(구간이 잠깐 멈춰도
          // 점이 반대편으로 튀지 않는다).
          prev[0] === start && prev[1] === end
          ? wasUp.current
          : false;
    prevRange.current = [start, end];
    wasUp.current = up;

    const seg = up ? measured.lengths[start] : measured.lengths[end];
    setDotAt(seg ? (up ? seg[0] : seg[1]) : null);
  }, [activeRange, measured]);

  if (toc.length === 0) return null;

  // 지금 화면에 보이는 절**들**만 남기고 잘라낸다. 구간은 스크롤마다 처음부터
  // 다시 계산되므로(tocHooks), 판정이 한 번 어긋나도 다음 프레임에 스스로
  // 제자리를 찾는다 — 예전 누적 Set 방식처럼 잔상이 남을 수가 없다.
  const first = measured && activeRange ? measured.rows[activeRange[0]] : null;
  const last = measured && activeRange ? measured.rows[activeRange[1]] : null;
  const clip =
    first && last && measured
      ? `inset(${first.top}px 0px ${measured.height - last.bottom}px)`
      : 'inset(0px 0px 100%)';

  return (
    <nav
      ref={scrollRef}
      className={css({
        pos: 'sticky',
        top: '24',
        alignSelf: 'start',
        display: 'none',
        lg: { display: 'block' },
        maxH: '[calc(100vh - 100px)]',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        // 잘린 위아래를 스크롤바 대신 **페이드**로 알린다.
        //
        // 예전에는 `scrollbar-gutter: stable`로 스크롤바 자리를 늘 비워 뒀다.
        // 스크롤바가 생겼다 사라질 때 내용 폭이 240 → 225px로 출렁이면 경계에
        // 걸친 항목이 한 줄에서 두 줄로 접히고, 그러면 목록이 길어져 다시
        // 스크롤바가 필요해지는 진동이 생기기 때문이다. 스크롤바를 아예
        // 감추면 그 15px을 내내 비워둘 이유가 사라진다 — 폭은 여전히 고정이고
        // 항목은 15px만큼 더 넓게 쓴다.
        //
        // 대신 "여기서 잘렸다"는 신호가 없어지므로, fumadocs처럼 위아래
        // 16px을 투명으로 흐린다. 아래 py도 같은 이유다(첫·마지막 항목이
        // 페이드 구간에 앉아 흐릿하게 시작하지 않도록 여백을 준다).
        scrollbarWidth: '[none]',
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
                  stroke: 'ink.950',
                  // ↓ 글자 색·점과 같은 시간. 위 주석 참고.
                  transition: '[clip-path 0.2s ease]',
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: '[none]',
                  },
                })}
              />
            </svg>
            {/* 레일 위를 따라가는 점. 하이라이트가 어디까지 왔는지를 구간의
                끝점 하나로 요약해, 구간이 길어져도 "지금 여기"가 흐려지지
                않는다. offset-path가 좌표를 맡으므로 위치 계산은 CSS 몫이다. */}
            {dotAt !== null && (
              <div
                className={css({
                  pos: 'absolute',
                  left: '0',
                  top: '0',
                  boxSize: '[5px]',
                  rounded: 'full',
                  bg: 'ink.950',
                  transition: '[offset-distance 0.2s ease]',
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: '[none]',
                  },
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
          className={css({ listStyleType: 'none', m: '0', p: '0' })}
        >
          {toc.map((item, i) => {
            const minLevel = Math.min(...toc.map(x => x.level));
            const depth = item.level - minLevel;
            // 색은 구간 전체가 함께 밝아진다(레일 하이라이트와 같은 범위).
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
                {/* 버튼이 아니라 **앵커**다. 스크롤 자체는 아래 onClick이
                    가로채지만(고정 헤더 높이만큼 offset이 필요하다), href가
                    있어야 새 탭으로 열기·링크 주소 복사·상태 표시줄 미리보기가
                    전부 살아난다. 차례 항목은 의미상으로도 문서 안 링크다. */}
                <a
                  href={`#${item.id}`}
                  onClick={e => {
                    // 수정자 키가 눌린 클릭은 **가로채지 않는다.** 여기서
                    // 기본 동작을 막으면 Cmd/Ctrl+클릭으로 새 탭을 여는
                    // 동작까지 함께 막혀, 앵커로 바꾼 이유가 사라진다.
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
                      return;
                    e.preventDefault();
                    scrollToId({
                      id: item.id,
                      // 활성 구간 판정이 쓰는 값과 같은 상수다. 둘이 갈리면
                      // 앵커로 이동한 직후의 위치가 "아직 안 보이는 곳"으로
                      // 판정돼 그 항목이 켜지지 않는다.
                      headerOffset: HEADER_OFFSET,
                      // 주소창 해시는 이동한 뒤에 맞춘다. pushState가 아니라
                      // replaceState라, 차례를 몇 번 눌러도 뒤로 가기는 글
                      // 목록으로 한 번에 돌아간다.
                      action: () =>
                        window.history.replaceState(null, '', `#${item.id}`),
                    });
                  }}
                  aria-current={item.id === activeId ? 'true' : undefined}
                  className={css({
                    display: 'block',
                    w: 'full',
                    textAlign: 'left',
                    // 항목 사이가 3px일 때는 두 줄로 접힌 항목과 다음 항목이
                    // 붙어 어디서 끊기는지 안 보였다. 레퍼런스와 같은 6px.
                    py: '1.5',
                    cursor: 'pointer',
                    fontSize: '[13px]',
                    lineHeight: 'relaxed',
                    color: isLit ? 'ink.950' : 'ink.600',
                    // 활성 표시는 **색만** 바꾼다. 굵기를 400 → 500으로 올리면
                    // 글자 폭이 늘어 항목이 한 줄에서 두 줄로 접히고, 그 아래
                    // 항목이 전부 20px씩 밀린다(실측: 목록 높이 917 → 937px).
                    // 스크롤할 때마다 차례가 들썩이는 데다, 레일 좌표가 clip-path
                    // 애니메이션 도중에 바뀌어 하이라이트가 엉뚱한 자리에 그려진다.
                    fontWeight: 'normal',
                    transition: '[color 0.2s ease]',
                    _hover: { color: 'ink.950' },
                  })}
                  // 레일이 서는 자리(x)에서 한 칸 더 띄운다.
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
