'use client';

import { css, cx } from '@blog/styled-system/css';

import { chip } from '@/src/components/chip';
import { SteadyLabel } from '@/src/components/SteadyLabel';
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

const chipLabel = css({ display: 'inline-flex', maxW: 'full' });

// 상태는 radio가 들고 모양은 바로 뒤 형제(칩 면)가 형제 선택자로 받는다(chip tone `toggle`).
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
  const options = [{ id: null, title: '전체', count: total }, ...series];
  return (
    <div role="radiogroup" aria-label="시리즈" className={row}>
      {options.map(({ id, title, count }) => (
        <label key={id ?? ''} className={chipLabel}>
          <input
            type="radio"
            name="series"
            value={id ?? ''}
            checked={value === id}
            onChange={() => onChange(id)}
            className={radio}
          />
          <SteadyLabel className={face}>{`${title} (${count})`}</SteadyLabel>
        </label>
      ))}
    </div>
  );
};
