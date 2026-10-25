'use client';

import { useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { css, cva } from '@blog/styled-system/css';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  /** 묶음의 접근 이름(`radiogroup`) — 화면에 라벨이 없다. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// 트랙 — 항목은 같은 폭의 칸이다(가장 긴 라벨의 폭). 칸 폭이 같아야 아래 표식이 순서만으로 자리를
// 계산한다.
const track = css({
  pos: 'relative',
  display: 'inline-grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '[1fr]',
  p: '0.5',
  gap: '0.5',
  rounded: 'element',
  bg: 'paper.200',
});

// 선택 표식 — 칸 하나 크기의 면이 고른 칸으로 미끄러진다(transform만, fast·standard — 표식의 시간).
// 칸 폭은 (트랙 안쪽 폭 − 사이 간격 × (칸 수 − 1)) ÷ 칸 수이고, n번째 칸까지의 거리는 n × (칸 폭 +
// 사이 간격)이다. 칸 수와 순서는 트랙의 style 변수로 받는다.
// Astryx 선택 항목은 surface 면 + 그림자 low인데, 흐름 안의 요소라 그림자 대신 진한 hairline이 경계를
// 낸다(blog-design-system 스킬 그림자 절).
const indicator = css({
  pos: 'absolute',
  top: '0.5',
  bottom: '0.5',
  left: '0.5',
  w: '[calc((100% - 2 * token(spacing.0.5) - (var(--segment-count) - 1) * token(spacing.0.5)) / var(--segment-count))]',
  transform:
    'translateX(calc(var(--segment-index) * (100% + token(spacing.0.5))))',
  rounded: 'inner',
  bg: 'surface.raised',
  borderWidth: 'hairline',
  borderColor: 'ink.borderStrong',
  transition: 'transform',
});

const segment = cva({
  base: {
    // 표식 위에 글자를 그린다.
    pos: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    h: '7',
    px: '3',
    rounded: 'inner',
    textStyle: 'label',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'colors',
  },
  variants: {
    checked: {
      // 굵기도 함께 바뀐다(Astryx 600). 칸 폭은 가장 긴 라벨의 semibold가 정해 선택이 옮겨 가도
      // 트랙 폭이 그대로다.
      true: { color: 'ink.950', fontWeight: 'semibold' },
      false: { color: 'ink.700', _hover: { color: 'ink.950' } },
    },
  },
});

/**
 * 하나만 고르는 세그먼트 — Astryx SegmentedControl md(트랙 32 · 항목 28, 트랙 안쪽·사이 2).
 * 정렬 기준·집계 기간처럼 화면 위 목록의 보기 방식을 바꾼다.
 *
 * ARIA radiogroup 패턴이다: 탭 정지점은 선택된 항목 하나이고 화살표가 선택을 옮긴다(선택이 곧
 * 적용이라 따로 확정할 것이 없다). 탭(`tablist`)으로 두지 않는 이유는 바꾸는 것이 패널이 아니라
 * 같은 자리의 값이기 때문이다.
 *
 * 선택 면은 항목마다 칠하지 않고 표식 하나(`aria-hidden`)가 고른 칸으로 미끄러진다 — CSS 전환
 * 하나이고, 위치는 React가 주는 순서 변수에서 CSS가 계산한다.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFrom = (index: number, step: number) => {
    const next = (index + step + options.length) % options.length;
    const option = options[next];
    if (option === undefined) return;
    onChange(option.value);
    items.current[next]?.focus();
  };

  const onKeyDown = (index: number) => (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveFrom(index, 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFrom(index, -1);
    }
  };

  const selectedIndex = options.findIndex(option => option.value === value);
  const trackStyle: CSSProperties & Record<`--${string}`, string> = {
    '--segment-count': String(options.length),
    '--segment-index': String(selectedIndex),
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={trackStyle}
      className={track}
    >
      {/* 고른 항목이 없으면(값이 선택지 밖) 표식도 없다 — 어느 칸에도 놓지 않는다. */}
      {selectedIndex >= 0 && <span aria-hidden className={indicator} />}
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={el => {
              items.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown(index)}
            className={segment({ checked })}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
