'use client';

import { css, cx } from '@blog/styled-system/css';

import { SteadyLabel } from '@/src/components/SteadyLabel';
import { VIEW_MODES, type ViewMode } from './archiveParams';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEW_LABEL = {
  cards: '카드',
  list: '리스트',
} as const satisfies Record<ViewMode, string>;

const track = css({
  display: 'inline-flex',
  p: '0.5',
  gap: '0.5',
  rounded: 'element',
  bg: 'paper.100',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.border',
});

const cellLabel = css({ display: 'inline-flex' });

const radio = cx('peer', css({ srOnly: true }));

// 켜진 칸은 트랙 위에 지면색 면으로 올라온다. 그림자는 없다 — 흐름 안 요소다(떠 있는 표면만 그림자).
// 13px은 글자 역할 밖의 예외다(Astryx ToggleButton sm).
const cell = css({
  display: 'inline-flex',
  alignItems: 'center',
  h: '7',
  px: '2.5',
  rounded: 'inner',
  textStyle: 'label',
  fontSize: '[13px]',
  color: 'ink.700',
  cursor: 'pointer',
  transition: 'colors',
  '.peer:not(:checked) ~ &': { _hover: { color: 'ink.950' } },
  _peerChecked: { bg: 'paper.50', color: 'ink.950', fontWeight: 'semibold' },
  _highContrast: { _peerChecked: { textDecorationLine: 'underline' } },
});

/**
 * 목록 보기 방식 — 짝이 되는 tabpanel이 없어 탭이 아니라 네이티브 radio 묶음이다. 화살표 이동·선택은
 * 브라우저가 하고, 켜짐·초점 링·hover는 바로 뒤 형제(칸 면)가 형제 선택자로 받는다.
 */
export const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <div role="radiogroup" aria-label="뷰" className={track}>
    {VIEW_MODES.map(mode => (
      <label key={mode} className={cellLabel}>
        <input
          type="radio"
          name="view"
          value={mode}
          checked={value === mode}
          onChange={() => onChange(mode)}
          className={radio}
        />
        <SteadyLabel className={cell}>{VIEW_LABEL[mode]}</SteadyLabel>
      </label>
    ))}
  </div>
);
