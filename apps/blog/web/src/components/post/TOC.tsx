'use client';

import { useEffect, useRef, useState } from 'react';
import { css } from '@design-system/ui-lib/css';
import { useTocHook, scrollToId } from '@/src/components/tocHooks';

/**
 * 글 차례 — 항목들을 잇는 **레일 한 줄**을 그리고, 지금 화면에 보이는 구간만
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
/** 레일이 단을 옮길 때 쓰는 대각선의 세로 길이. 절반씩 위아래로 나눠 쓴다. */
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
 * 세로선은 각 항목의 높이만큼 내려가고, 앞뒤 항목의 단이 다르면 그 경계에서
 * 대각선으로 갈아탄다. 레퍼런스(fumadocs)와 같은 각진 elbow다 — 곡선으로 하면
 * 단이 촘촘할 때 서로 겹쳐 뭉개진다.
 */
function buildPath(m: Measured): string {
  if (m.rows.length === 0) return '';
  const half = ELBOW / 2;
  let d = `M ${m.rows[0].x} 0`;

  m.rows.forEach((row, i) => {
    const next = m.rows[i + 1];
    const stepsHere = next !== undefined && next.x !== row.x;
    // 단이 바뀌면 이 항목의 바닥까지 가지 않고 경계 조금 위에서 멈춘 뒤
    // 대각선으로 갈아탄다. 바닥까지 그린 다음 되돌아가면 선이 겹친다.
    d += ` L ${row.x} ${stepsHere ? next.top - half : row.bottom}`;
    if (stepsHere) d += ` L ${next.x} ${next.top + half}`;
  });

  return d;
}

export const TOC = () => {
  const { toc, activeId, visibleIds } = useTocHook();
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

  // 보이는 구간의 위/아래만 남기고 잘라낸다.
  //
  // 관찰 밴드가 화면 상단 20%라, 헤딩과 헤딩 사이를 지나는 동안에는 걸치는
  // 헤딩이 하나도 없다. 그때 구간을 비우면 레일이 깜빡이며 사라지므로,
  // 마지막으로 지나온 헤딩(activeId) 한 줄로 유지한다.
  const rowIds = visibleIds.length > 0 ? visibleIds : [activeId];
  const activeRows = measured
    ? rowIds
        .map(id => toc.findIndex(i => i.id === id))
        .filter(i => i >= 0)
        .map(i => measured.rows[i])
        .filter(Boolean)
    : [];
  const clip =
    measured && activeRows.length > 0
      ? `inset(${Math.min(...activeRows.map(r => r.top))}px 0px ${
          measured.height - Math.max(...activeRows.map(r => r.bottom))
        }px)`
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
            const isActive =
              visibleIds.includes(item.id) || activeId === item.id;
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
                    fontWeight: isActive ? 'medium' : 'normal',
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
