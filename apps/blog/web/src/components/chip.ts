import { cva } from '@blog/styled-system/css';
import { forcedColorsEdge } from './forcedColorsEdge';
import { pressButton, pressToggleChip } from './interaction';
import { steadyLabel } from './steadyLabel';

/**
 * 칩 — 한 줄에 여럿이 줄바꿈되며 놓이는 32px pill. Astryx ToggleButton 칩(ghost md)의 모양이고,
 * 홈 오픈소스 줄과 글 목록의 시리즈 칩이 쓴다.
 *
 * - tone `neutral` — paper.200 면에 본문 잉크. 링크 칩이라 hover에 면이 한 단계 진해진다(paper.300).
 *   누름은 `pressButton`이다.
 * - tone `accent` — 잉크 면(accent.solid)에 지면색 글자, semibold. 줄에서 하나만 세우는 강조 칩이다
 *   (오픈소스 줄의 `58+ merged`). 누를 수 없는 표식이라 hover도 누름도 없다.
 * - tone `toggle` — 켜고 끄는 칩(글 목록의 시리즈 칩). 면 없이 본문 잉크, hover에 paper.100, 켜지면
 *   accent.muted 면에 semibold. 누름은 `pressToggleChip`이다.
 *   상태는 칩이 아니라 바로 앞의 네이티브 radio가 든다 —
 *   `span > input.peer + label[for](이 칩) > span(글자)` 구조에서 형제 선택자(`_peerChecked`)로 받는다.
 *   `:has()`는 쓰지 않는다(Next 기본 대상의 Firefox 111~120에 없다). 초점 링은 globalCss가 같은 형제
 *   선택자로 준다. 강제 색상 모드는 면을 지우므로 켜진 칩에 밑줄을 더한다. 켜질 때 폭이 밀리지 않게 칩은
 *   글자를 `data-label`로도 들고, semibold 폭은 CSS가 미리 잡는다(`steadyLabel`). 줄보다 긴 칩은 끝을
 *   말줄임으로 자른다(아래 tone 주석). 잘린 칩의 전체 이름은 쓰는 쪽이 `title`로 남긴다.
 *
 * 글자는 `label`(14/20 500)이다. 칩 안 글자가 코드 이름(프로젝트·패키지)이면 쓰는 쪽이 mono로
 * 덧씌운다 — 서체는 칩이 아니라 글자의 성격이 정한다. 덧씌울 때는 `css(chip.raw(…), {…})`로
 * 병합한다(`cx`는 충돌하는 원자 클래스를 병합하지 않는다).
 *
 * 면으로만 갈리는 상자라 버튼과 같은 강제 색상 모드용 투명 hairline(`forcedColorsEdge`)을 둔다.
 */
export const chip = cva({
  base: {
    ...forcedColorsEdge,
    display: 'inline-flex',
    alignItems: 'center',
    h: '8',
    px: '3',
    rounded: 'full',
    textStyle: 'label',
    whiteSpace: 'nowrap',
  },
  variants: {
    tone: {
      neutral: {
        ...pressButton,
        bg: 'paper.200',
        color: 'ink.950',
        _hover: { bg: 'paper.300' },
      },
      accent: {
        bg: 'accent.solid',
        color: 'accent.onSolid',
        fontWeight: 'semibold',
      },
      toggle: {
        ...steadyLabel,
        ...pressToggleChip,
        bg: 'transparent',
        color: 'ink.950',
        cursor: 'pointer',
        maxW: 'full',
        // 줄 폭(320px 기기에서 280)보다 긴 이름은 칩 안에서 끝을 말줄임으로 자른다. `text-overflow`는 블록
        // 컨테이너에만 걸려, flex인 면이 아니라 글자를 담은 자식 `span`에 건다 — 면에 걸면 면 바로 밑
        // 글자(익명 flex 항목)에 닿지 않아 말줄임 없이 가운데 정렬된 글자의 앞뒤가 잘린다(Chromium 실측).
        // 폭 예약 사본(`::after`)도 면 폭을 넘지 않아, 잘린 칩은 켜고 꺼도 폭이 같다.
        overflow: 'hidden',
        '& > span': {
          maxW: 'full',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        // 켜진 칩에는 hover 면을 깔지 않는다 — 두 규칙의 겨룸을 생성 순서에 맡기지 않게 선택자로 가른다.
        '.peer:not(:checked) ~ &': { _hover: { bg: 'paper.100' } },
        _peerChecked: { bg: 'accent.muted', fontWeight: 'semibold' },
        _highContrast: { _peerChecked: { textDecorationLine: 'underline' } },
      },
    },
  },
  defaultVariants: { tone: 'neutral' },
});
