'use client';

import { useRef, type KeyboardEvent } from 'react';
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

const segment = cva({
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    h: '7',
    px: '3',
    rounded: 'inner',
    borderWidth: 'hairline',
    textStyle: 'label',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'colors',
  },
  variants: {
    checked: {
      // Astryx 선택 항목은 surface 면 + 그림자 low인데, 흐름 안의 요소라 그림자 대신 진한 hairline이
      // 경계를 낸다(blog-design-system 스킬 그림자 절). 굵기도 함께 바뀐다(Astryx 600).
      true: {
        bg: 'surface.raised',
        borderColor: 'ink.borderStrong',
        color: 'ink.950',
        fontWeight: 'semibold',
      },
      // 투명 보더로 크기를 맞춘다 — 선택이 옮겨 가도 항목 폭이 그대로다.
      false: {
        bg: 'transparent',
        borderColor: 'transparent',
        color: 'ink.700',
        _hover: { color: 'ink.950' },
      },
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

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={css({
        display: 'inline-flex',
        p: '0.5',
        gap: '0.5',
        rounded: 'element',
        bg: 'paper.200',
      })}
    >
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
