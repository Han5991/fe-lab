'use client';

import type { CSSProperties } from 'react';
import { css, cx } from '@blog/styled-system/css';

import { pressToggle } from '@/src/components/interaction';
import { steadyLabel } from '@/src/components/steadyLabel';
import { VIEW_MODES, type ViewMode } from './archiveParams';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

const VIEW_LABEL = {
  cards: '카드',
  list: '리스트',
} as const satisfies Record<ViewMode, string>;

// 칸은 같은 폭이다(가장 넓은 칸 — 리스트의 semibold). 폭이 같아야 아래 면이 순서만으로 자리를 잡는다.
const track = css({
  pos: 'relative',
  display: 'inline-grid',
  gridAutoFlow: 'column',
  gridAutoColumns: '[1fr]',
  p: '0.5',
  gap: '0.5',
  rounded: 'element',
  bg: 'paper.100',
  borderWidth: 'hairline',
  borderStyle: 'solid',
  borderColor: 'ink.border',
});

// 켜진 면 — 칸마다 칠하지 않고 면 하나가 고른 칸으로 미끄러진다(transform만, fast·standard — 표식의
// 시간이고, 움직임 줄이기는 시간 토큰이 끈다). 첫 칸의 grid 영역에 절대 위치로 겹쳐 칸 크기를 그대로
// 받고, n번째 칸까지의 거리는 n × (칸 폭 + 칸 사이)다. 끝 줄까지 적는 이유: 절대 위치 상자의 `auto` 끝
// 줄은 다음 줄이 아니라 트랙의 padding 가장자리다. 그림자는 없다 — 흐름 안 요소다(떠 있는 표면만
// 그림자). 강제 색상 모드는 면을 지우므로 켜진 칸의 밑줄(아래 `cell`)이 선택을 가른다.
const face = css({
  pos: 'absolute',
  inset: '0',
  gridArea: '1 / 1 / 2 / 2',
  rounded: 'inner',
  bg: 'paper.50',
  pointerEvents: 'none',
  transform:
    'translateX(calc(var(--segment-index) * (100% + token(spacing.0.5))))',
  transition: 'transform',
});

// 면보다 뒤에 그려 글자가 면 위에 온다(둘 다 위치 지정 요소라 문서 순서로 쌓인다).
//
// 누름은 `pressToggle`이고 칸을 감싼 label이 받는다. 칸 글자(`span`)를 눌러도 그 상위 label이 함께
// `:active`이고, 면은 label 밖의 형제라 칸의 글자만 옅어지고 면은 그대로다. 투명도가 걸려도 이미 위치
// 지정 요소라 쌓임 순서(면 위)는 같다. 글자색 전환은 프리셋 밖의 `span`(`cell`)이 그대로 맡는다.
const cellLabel = css(pressToggle, { pos: 'relative', display: 'inline-flex' });

const radio = cx('peer', css({ srOnly: true }));

// 13px은 글자 역할 밖의 예외다(Astryx ToggleButton sm). 켜짐은 글자색·굵기만 형제 선택자로 받는다 —
// 면은 위 `face`가 그린다. 칸은 글자를 `data-label`로도 들어 semibold 폭을 CSS가 미리 잡는다.
const cell = css(steadyLabel, {
  display: 'inline-flex',
  flexGrow: '1',
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
  _peerChecked: { color: 'ink.950', fontWeight: 'semibold' },
  _highContrast: { _peerChecked: { textDecorationLine: 'underline' } },
});

/**
 * 목록 보기 방식 — 짝이 되는 tabpanel이 없어 탭이 아니라 네이티브 radio 묶음이다. 화살표 이동·선택은
 * 브라우저가 하고, 켜진 칸의 글자·초점 링·hover는 바로 뒤 형제(칸)가 형제 선택자로 받는다. 켜진 면의
 * 자리는 고른 칸의 순서를 트랙의 style 변수(`--segment-index`)로 내보내 CSS가 계산한다 — 서버 HTML에도
 * 실려 하드 로드 첫 페인트부터 제자리다.
 */
export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
  const trackStyle: CSSProperties & Record<`--${string}`, string> = {
    '--segment-index': String(VIEW_MODES.indexOf(value)),
  };
  return (
    <div role="radiogroup" aria-label="뷰" style={trackStyle} className={track}>
      <span aria-hidden="true" className={face} />
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
          <span data-label={VIEW_LABEL[mode]} className={cell}>
            {VIEW_LABEL[mode]}
          </span>
        </label>
      ))}
    </div>
  );
};
