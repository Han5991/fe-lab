'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';

/**
 * 글 차례 — 항목들을 잇는 **레일 한 줄**을 그리고, 지금 읽고 있는 항목만
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
/** 레일이 단을 옮길 때 쓰는 대각선의 세로 길이. 전부 다음 항목 안에 들어간다. */
const ELBOW = 8;

interface Measured {
  /** 항목별 [레일 x, 세로 시작, 세로 끝] */
  rows: { x: number; top: number; bottom: number }[];
  height: number;
  width: number;
}

/**
 * 항목 위치를 재서 레일 path를 만든다.
 *
 * 세로선은 각 항목의 높이만큼 내려가고, 앞뒤 항목의 단이 다르면 대각선으로
 * 갈아탄다. 레퍼런스(fumadocs)와 같은 각진 elbow다 — 곡선으로 하면 단이
 * 촘촘할 때 서로 겹쳐 뭉개진다.
 *
 * 대각선은 **전부 다음 항목 안쪽**에 들어간다. 예전에는 경계를 중심으로 위아래
 * 절반씩 걸치게 그렸는데, 하이라이트가 한 항목만 비출 때 대각선도 반토막이 나
 * 어디에도 안 닿는 조각이 허공에 뜬 것처럼 남았다. 대각선을 통째로 한 항목에
 * 넣으면 그 항목이 켜질 때 대각선과 세로선이 이어져 보이고, 이전 항목이 켜질
 * 때는 세로선만 깔끔하게 끊긴다.
 */
function buildPath(m: Measured): string {
  if (m.rows.length === 0) return '';
  let d = `M ${m.rows[0].x} 0`;

  m.rows.forEach((row, i) => {
    const next = m.rows[i + 1];
    const stepsHere = next !== undefined && next.x !== row.x;
    // 자기 항목은 언제나 바닥(= 다음 항목의 머리)까지 그린다.
    d += ` L ${row.x} ${stepsHere ? next.top : row.bottom}`;
    // 대각선의 세로 길이는 다음 항목 높이의 절반을 넘지 않게 묶는다. 두 줄짜리
    // 항목 뒤에 한 줄 항목이 오는 식으로 높이가 들쭉날쭉해도 대각선이 그 항목을
    // 넘어가 다음 경계를 침범하지 않는다.
    if (stepsHere) {
      const drop = Math.min(ELBOW, (next.bottom - next.top) / 2);
      d += ` L ${next.x} ${next.top + drop}`;
    }
  });

  return d;
}

export const TOC = () => {
  const { toc, activeId } = useTocHook();
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
      setMeasured({
        rows,
        height: list.scrollHeight,
        width: RAIL_STEP * 2 + Math.max(...rows.map(r => r.x)),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [toc]);

  if (toc.length === 0) return null;

  // 활성 항목 **한 줄**만 남기고 잘라낸다. 여러 항목의 최소~최대 구간으로
  // 잡으면, 활성 판정이 한 번만 어긋나도 창이 이전 위치까지 늘어나 잔상처럼
  // 보인다. 한 줄이면 구조적으로 그럴 수가 없다.
  const activeIndex = toc.findIndex(i => i.id === activeId);
  const row = measured && activeIndex >= 0 ? measured.rows[activeIndex] : null;
  const clip =
    row && measured
      ? `inset(${row.top}px 0px ${measured.height - row.bottom}px)`
      : 'inset(0px 0px 100%)';

  const path = measured ? buildPath(measured) : '';

  return (
    <nav
      className={css({
        pos: 'sticky',
        top: '24',
        alignSelf: 'start',
        display: 'none',
        lg: { display: 'block' },
        maxH: '[calc(100vh - 100px)]',
        overflowY: 'auto',
        // 스크롤바 자리를 **항상** 비워 둔다.
        //
        // `overflow: auto`만 두면 스크롤바가 생길 때 내용 폭이 240 → 225px로
        // 줄고, 그 15px 때문에 경계에 걸친 항목이 1줄에서 2줄로 접힌다. 목록이
        // 20px 길어지면 다시 스크롤바가 필요해지고, 스크롤바가 사라지면 폭이
        // 돌아와 또 한 줄로 펴진다 — 차례가 끝없이 밀렸다 돌아왔다 한다.
        // 게다가 그 사이 레일 좌표가 clip-path 애니메이션 도중에 바뀌어
        // 하이라이트가 엉뚱한 자리에 그려진다.
        scrollbarGutter: '[stable]',
      })}
      aria-label="이 글의 차례"
    >
      <span
        className={css({
          display: 'block',
          fontSize: '[12px]',
          color: 'ink.600',
          mb: '[10px]',
        })}
      >
        이 글의 차례
      </span>

      <div className={css({ pos: 'relative' })}>
        {measured && path && (
          <svg
            aria-hidden
            focusable="false"
            width={measured.width}
            height={measured.height}
            viewBox={`0 0 ${measured.width} ${measured.height}`}
            className={css({
              pos: 'absolute',
              left: '0',
              top: '0',
              pointerEvents: 'none',
              overflow: 'visible',
            })}
          >
            <path
              d={path}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="square"
              className={css({ stroke: 'ink.border' })}
            />
            {/* 같은 path를 겹쳐 그리고 잘라 쓴다. clip-path만 바뀌므로 전환이 싸다. */}
            <path
              d={path}
              fill="none"
              strokeWidth="1.5"
              strokeLinecap="square"
              style={{ clipPath: clip }}
              className={css({
                stroke: 'ink.950',
                transition: '[clip-path 0.3s ease]',
                '@media (prefers-reduced-motion: reduce)': {
                  transition: '[none]',
                },
              })}
            />
          </svg>
        )}

        <ol
          ref={listRef}
          className={css({ listStyleType: 'none', m: '0', p: '0' })}
        >
          {toc.map(item => {
            const minLevel = Math.min(...toc.map(i => i.level));
            const depth = item.level - minLevel;
            const isActive = item.id === activeId;
            return (
              <li
                key={item.id}
                ref={el => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
              >
                <button
                  type="button"
                  onClick={() => scrollToId({ id: item.id, headerOffset: 100 })}
                  aria-current={isActive ? 'true' : undefined}
                  className={css({
                    display: 'block',
                    w: 'full',
                    textAlign: 'left',
                    py: '[3px]',
                    cursor: 'pointer',
                    fontSize: '[13px]',
                    lineHeight: 'relaxed',
                    color: isActive ? 'ink.950' : 'ink.600',
                    // 활성 표시는 **색만** 바꾼다. 굵기를 400 → 500으로 올리면
                    // 글자 폭이 늘어 항목이 한 줄에서 두 줄로 접히고, 그 아래
                    // 항목이 전부 20px씩 밀린다(실측: 목록 높이 917 → 937px).
                    // 스크롤할 때마다 차례가 들썩이는 데다, 레일 좌표가 clip-path
                    // 애니메이션 도중에 바뀌어 하이라이트가 엉뚱한 자리에 그려진다.
                    fontWeight: 'normal',
                    transition: '[color 0.2s]',
                    _hover: { color: 'ink.950' },
                  })}
                  // 레일이 서는 자리(x)에서 한 칸 더 띄운다.
                  style={{
                    paddingLeft: `${RAIL_STEP * 2 + depth * RAIL_STEP}px`,
                  }}
                >
                  {item.text}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
