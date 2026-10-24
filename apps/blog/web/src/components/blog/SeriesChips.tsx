'use client';

import { useId } from 'react';
import { css, cx } from '@blog/styled-system/css';

import { chip } from '@/src/components/chip';
import type { ArchiveSeries } from './archiveParams';

interface SeriesChipsProps {
  series: readonly ArchiveSeries[];
  /** "전체 (N)"의 N — 목록의 글 수 */
  total: number;
  /** 켜진 시리즈 id. `null`은 전체 */
  value: string | null;
  onChange: (id: string | null) => void;
}

const row = css({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: '1',
});

// radio와 면 한 쌍을 묶는다 — 형제 선택자(`~`)가 이 쌍 안에서만 닿는다.
const chipItem = css({ display: 'inline-flex', maxW: 'full' });

// 상태는 radio가 들고 모양은 바로 뒤 형제(칩 면)가 형제 선택자로 받는다(chip tone `toggle`). 면은
// 글자를 `data-label`로도 들어 켜졌을 때의 semibold 폭을 CSS가 미리 잡고, 글자는 줄보다 길면 말줄임으로
// 잘리는 자식 `span`에 담는다.
//
// 면이 곧 radio의 `label[for]`다 — label이 radio를 감싸면 글자가 label에서 세 단계 아래라
// jsx-a11y `label-has-associated-control`(기본 깊이 2)이 글자를 보지 못한다. 잘린 칩의 전체 이름은 label의
// `title`(마우스 툴팁)에 남는다. radio의 접근 이름은 label 글자 그대로이고, label에 글자가 있어 title은
// 이름에도 radio의 설명에도 더해지지 않는다.
const radio = cx('peer', css({ srOnly: true }));
const face = chip({ tone: 'toggle' });

/**
 * 시리즈 칩 — "전체"와 시리즈마다 하나. 하나만 고르는 선택이라 네이티브 radio 묶음이다: Tab 정지점은
 * 하나이고 화살표 이동·선택은 브라우저가 한다. 순서와 표시명은 `/series`와 같다(`getAllSeries`).
 */
export const SeriesChips = ({
  series,
  total,
  value,
  onChange,
}: SeriesChipsProps) => {
  const idPrefix = useId();
  const options = [{ id: null, title: '전체', count: total }, ...series];
  return (
    <div role="radiogroup" aria-label="시리즈" className={row}>
      {options.map(({ id, title, count }, index) => {
        const text = `${title} (${count})`;
        const inputId = `${idPrefix}-${index}`;
        return (
          <span key={id ?? ''} className={chipItem}>
            <input
              id={inputId}
              type="radio"
              name="series"
              value={id ?? ''}
              checked={value === id}
              onChange={() => onChange(id)}
              className={radio}
            />
            <label
              htmlFor={inputId}
              title={text}
              data-label={text}
              className={face}
            >
              <span>{text}</span>
            </label>
          </span>
        );
      })}
    </div>
  );
};
