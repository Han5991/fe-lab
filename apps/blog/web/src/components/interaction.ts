import { css } from '@blog/styled-system/css';

/**
 * 누르는 모양의 프리셋 — 인터랙션 상태의 단일 출처(blog-design-system 스킬 "인터랙션 상태").
 * 상태의 **때**는 panda.config의 조건(`_hover`·`_press`·`_groupPress`)이 정하고, 이 파일은 그 조건에
 * **무엇**을 걸지 정한다. 면·색처럼 요소마다 다른 값은 레시피·호출부가 `_hover`에 적는다 — 터치에서는
 * `_hover`가 누르는 동안이라, 그 한 줄이 마우스의 hover와 터치의 누름 면을 함께 맡는다. 누름의 투명도·크기는
 * 이 파일의 프리셋이 더한다(수치와 근거는 스킬 — iOS 하이라이트).
 *
 * - 누르면 투명도·크기가 바로 바뀌고 놓으면 천천히 돌아온다. 전환은 속성마다 시간을 나눠 적은 `pressTransition`이다 —
 *   색은 hover와 같은 fast·standard, 투명도·크기는 누를 때 `press`(40ms)·놓을 때 `release`(320ms)이고(카드는 큰
 *   면이라 크기가 hover 박자로 들어간다), 크기가 줄어드는 요소는 놓을 때 크기만 `spring`으로 살짝 튀었다
 *   돌아온다. 누름 조건의 규칙이 진입을, 평상시 규칙이 놓음을 든다(CSS는 도착 상태의 `transition`을 쓴다 —
 *   panda.config의 `PRESS_TRANSITION`). 쓰는 쪽이 `transition`·`transitionDuration` 같은 전환 유틸리티를 다시
 *   적으면 목록이 통째로 바뀌거나 longhand가 누름 시간까지 덮는다.
 * - 투명도는 종류로 가른다 — 링크는 0.3, 버튼과 토글은 0.5. 글자는 면이 없어 글자가 신호의 전부라 사라지지
 *   않는 선에서 깊게, 면은 옅어지면 지면색에 가까워져 얕게 잡았다.
 * - 크기는 버튼 94%, 상자로 그린 링크(헤더 내비·워드마크)와 켜고 끄는 칩 96%, 카드 97%(md 이상 98%)다. 보기 토글 칸·탭은 칸
 *   뒤에서 미끄러지는 표식 면과 어긋나고, 인라인 링크는 transform이 걸리지 않아(비대체 인라인 요소) 크기가 없다.
 * - 투명도·크기 모두 터치에도 준다(2026-10-31 사용자 결정). 터치의 `:active`는 스크롤을 시작하는 손가락에도
 *   칠해질 수 있다 — 스킬 "실기기 확인"(Android Chrome은 확인, iOS Safari는 확인 전).
 * - 줄어드는 요소는 누르는 동안 덮개(`::before`)를 넓혀 줄어든 가장자리를 덮는다(`BLEED_INSET`). 떠 있는 버튼(98%)과
 *   켜고 끄는 칩은 예외다(각 프리셋 주석).
 * - 움직임 줄이기는 시간 토큰이 맡는다(fast·press·release·spring이 0.01ms가 된다) — 투명도·크기는 잔상 없이
 *   바로 바뀐다.
 *
 * 어느 요소가 어느 프리셋인지는 스킬 "인터랙션 상태"의 종류 표가 단일 출처다 — 여기 프리셋 설명은 종류만 적는다.
 * 버튼 레시피(`actionButton`·`iconButton`·`chip`·`tagBadge`)는 프리셋을 cva에 펼치고, 레시피 밖의 요소는
 * `css(프리셋, { … })`로 합친다.
 */

/** 누르는 동안의 투명도 — 링크는 글자만 남아 깊게, 버튼·토글은 면이 지면에 묻히지 않게 얕게. */
const PRESS_OPACITY = { link: '0.3', control: '0.5' } as const;

/**
 * 줄어든 요소의 가장자리를 덮는 덮개의 넓이 — 요소가 줄면 가장자리가 포인터 밑에서 빠지고, 거기서 떼면 click이
 * 그 요소가 아니라 공통 조상으로 가서 아무 일도 일어나지 않는다. 누르는 동안만 덮개를 넓힌다 — 투명하고 절대
 * 위치라 배치는 움직이지 않는다. 넓이는 크기마다 다르다: 줄어드는 몫을 줄어든 상자 기준으로 잰 값(94% → 3.19%,
 * 96% → 2.08%, 97% → 1.55%)에 여유를 더하고, `inset`의 %는 보더 안쪽(padding box) 기준이라 1px 보더
 * (`forcedColorsEdge`)를 가진 버튼은 1px을 더 뺀다. 카드는 md 이상에서 98%라 1.02%면 되지만 같은 2%를 둔다 —
 * 덮개가 쉬던 가장자리 밖으로 752px 카드에서 7px쯤 나갈 뿐이다. 값은 계산하지 않고 적는다 — Panda는 계산한
 * 값을 정적으로 뽑지 못하고(`toFixed`는 CSS를 통째로 빠뜨린다), 소수 연산은 `-2.0000000000000013%` 같은 값을 낸다.
 */
const BLEED_INSET = {
  button: '[calc(-3.5% - 1px)]',
  box: '[-2.5%]',
  card: '[-2%]',
} as const;

/** 덮개 상자 — 줄어드는 요소 자신의 `::before`. 누르는 동안 요소에 transform이 있어 요소가 덮개의 기준 상자가 된다. */
const BUTTON_BLEED = css.raw({
  content: '""',
  pos: 'absolute',
  inset: BLEED_INSET.button,
});
const BOX_BLEED = css.raw({
  content: '""',
  pos: 'absolute',
  inset: BLEED_INSET.box,
});

/** 카드의 덮개 넓이 — 글 카드는 제목 링크의 덮개(`::after`, `cardParts.ts`)를, 카드 자신이 링크인 카드는 `::before`를 넓힌다. */
export const pressCardBleed = css.raw({ inset: BLEED_INSET.card });
const CARD_BLEED = css.raw({
  content: '""',
  pos: 'absolute',
  ...pressCardBleed,
});

/**
 * 링크의 누름 — 누르는 동안 투명도 0.3이고 크기는 그대로다. 같은 요소의 투명도 hover(워드마크 0.7)도 이 전환을
 * 타서 들고 날 때 release다 — 놓음과 hover가 같은 상태(`:hover:not(:active)`)에 도착해 가를 선택자가 없다.
 */
export const pressText = css.raw({
  pressTransition: 'rest',
  _press: { opacity: PRESS_OPACITY.link, pressTransition: 'held' },
});

/** 상자로 그린 링크(헤더 내비·워드마크)의 누름 — `pressText`에 96%를 더한다(크기는 놓을 때 spring). */
export const pressTextBox = css.raw({
  pressTransition: 'springRest',
  _press: {
    opacity: PRESS_OPACITY.link,
    transform: 'scale(0.96)',
    pressTransition: 'held',
    _before: BOX_BLEED,
  },
});

/**
 * 공유 요소를 안은 링크(목록 행 — 제목 h3가 글 상세 h1로 이어진다)의 누름 — 투명도를 링크가 아니라 링크의 자식에
 * 준다. View Transition은 이름 붙은 요소의 스냅샷에 자기 투명도는 담고 조상의 투명도는 버려서, 링크를 흐리면 글을
 * 여는 전환의 첫 프레임에 제목만 1로 튀었다(2026-10 실측 — 날짜는 페이지 스냅샷에 남아 흐린 채였다). 자식이
 * 흐려지면 제목은 자기 투명도를 든 채 찍혀 그대로 걷힌다. 값과 시간은 `pressText`와 같다.
 */
export const pressTextShared = css.raw({
  '& > *': { pressTransition: 'rest' },
  _press: {
    '& > *': { opacity: PRESS_OPACITY.link, pressTransition: 'held' },
  },
});

/**
 * hover가 왼쪽 여백을 옮기는 링크 행(소개 페이지 목록)의 누름 — `pressText`에 `padding-left` 전환을 더한다. 누름
 * 전환이 `transition` 한 벌이라, 그 행이 hover에 옮기는 여백도 같은 목록에 있어야 hover 박자(fast·standard)로 옮는다.
 */
export const pressTextIndent = css.raw({
  pressTransition: 'indentRest',
  _press: { opacity: PRESS_OPACITY.link, pressTransition: 'indentHeld' },
});

/**
 * 토글의 누름 — 누르는 동안 투명도 0.5이고 크기는 그대로다(보기 토글은 칸 뒤에서 미끄러지는 표식 면과 어긋난다 —
 * 칸의 글자만 옅어지고 표식 면은 그대로다).
 */
export const pressToggle = css.raw({
  pressTransition: 'rest',
  _press: { opacity: PRESS_OPACITY.control, pressTransition: 'held' },
});

/**
 * 켜고 끄는 칩의 누름 — 혼자 선 pill이라 `pressToggle`에 96%를 더한다(크기는 놓을 때 spring). 덮개는 두지 않는다 —
 * 칩 면은 긴 이름을 말줄임하려고 `overflow: hidden`이라(`chip.ts`) 덮개가 면에서 잘린다. 그래서 마우스로 칩의 양
 * 끝 2%를 누르고 움직이지 않고 떼면 켜지지 않는다(폭 82~255px 칩에서 1.6~5.1px 실측).
 */
export const pressToggleChip = css.raw({
  pressTransition: 'springRest',
  _press: {
    opacity: PRESS_OPACITY.control,
    transform: 'scale(0.96)',
    pressTransition: 'held',
  },
});

/** 버튼의 누름 — 투명도 0.5에 94%까지 줄고, 놓으면 크기가 spring으로 살짝 튀었다 돌아온다. */
export const pressButton = css.raw({
  pressTransition: 'springRest',
  _press: {
    opacity: PRESS_OPACITY.control,
    transform: 'scale(0.94)',
    pressTransition: 'held',
    _before: BUTTON_BLEED,
  },
  // `_press`가 비활성의 누름을 이미 뺐다 — 여기서는 비활성의 모양(투명도 .5·커서)만 준다. 값은 누름 투명도와
  // 같지만 뜻이 다르다(누를 수 없음). 비활성으로 바뀌는 투명도도 놓음(release)을 탄다.
  _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

/**
 * 떠 있는 버튼(FAB)의 누름 — 옛 누름(98%·fast, 투명도 없음)을 지킨다. 둘 다 누른 뒤의 모양이 버튼의 쉬는 모양에
 * 묶여 있다.
 * - 맨 위로: 등장(`@starting-style`)도 그 요소의 평상시 `transition`을 타서, `pressButton`을 주면 등장이 fast에서
 *   release(320ms, 느린 출발)로 바뀐다.
 * - 목차 열기: 누르면 바텀시트가 버튼 자리에서 펼쳐지는데, 시트의 첫 모양(`face`)은 쉬는 버튼의 사본(투명도 1·
 *   100%)이다. 버튼을 옅게 하면 옅은 버튼 위에 진한 사본이 튀어 오른다. 펼침 자체가 누름의 피드백이다.
 */
export const pressFab = css.raw({
  transition: 'common',
  _press: { transform: 'scale(0.98)' },
});

/**
 * 글 카드 뿌리의 누름 — 누르는 동안 카드가 97%(md 이상 98%)로 줄고, 놓으면 `spring`(520ms — 202ms에 100.5%·
 * 100.3%까지 갔다 가라앉는다)으로 돌아온다. 카드는 투명도를 바꾸지 않는다 — 커버 이미지가 어두워지는 것
 * (`cardParts.ts`)이 대신한다.
 * - 버튼보다 얕고 느리다 — 상자가 커서 같은 비율이 먼 거리다. 들어가는 움직임은 press(40ms)가 아니라 hover 박자
 *   (`cardHeld` — fast·standard)다: 40ms에 97%면 PC 글 목록의 752px 카드가 한쪽 11px을 두 프레임에 움직여 뚝
 *   떨어져 보였다(실측). 폭이 넓어지는 md부터는 98%라 752px 카드가 한쪽 7.5px, 폰의 350px 카드는 97%로 5px이다.
 * - 카드는 글 상세로 이어지는 공유 요소(View Transition)라 클릭 순간에 줄어 있어도 전환을 해치지 않는다 — 전환
 *   그룹은 조상의 transform을 그룹 transform으로 받아 눌린 모양에서 이어 모핑하고, 스냅샷의 크기(`old`의
 *   width·height)는 레이아웃 크기 그대로다(Chrome 실측 — 99%에서). 커버 hairline·틴트·밝기와 제목 링크 덮개는
 *   `cardParts.ts`다.
 */
export const pressCard = css.raw({
  pressTransition: 'springRest',
  _press: {
    transform: { base: 'scale(0.97)', md: 'scale(0.98)' },
    pressTransition: 'cardHeld',
  },
});

/**
 * 카드 자신이 링크인 카드(글 하단 이전·다음, admin 상세 분석 카드)의 누름 — `pressCard`에 링크 자신의 `::before`
 * 덮개를 더한다.
 */
export const pressCardLink = css.raw(pressCard, {
  _press: { _before: CARD_BLEED },
});

/**
 * 선택 표시를 따로 가진 목록 행(검색 결과)의 선택 면 — 선택 행과 눌린 행이 같은 면을 쓰는 단일 출처다.
 * 메타 줄(날짜·시리즈·발췌)은 행 글자색을 물려받고, 틴트 위에서 `ink.500`은 다크 4.41:1로 AA를 놓쳐
 * `ink.700`(6.46 / 6.11:1)으로 올린다. 제목·태그는 자기 색을 갖는다.
 */
export const optionSelected = css.raw({ bg: 'accent.muted', color: 'ink.700' });

/**
 * 선택 면이 따로 있는 목록 행(검색 결과)의 누름. 이 행은 마우스를 올리면 JS가 선택하므로 `_hover`가
 * 없고(선택이 키보드 화살표와 같은 면을 쓴다 — hover 면을 더하면 마우스가 머문 행과 화살표로 고른 행이
 * 둘 다 칠해진다), 터치에서는 탭해도 선택이 누르는 동안 서지 않아 눌린 행이 선택 행(`optionSelected`)과
 * 같은 면을 가진다.
 */
export const pressOption = css.raw({
  _press: optionSelected,
});

/**
 * 키보드 초점이 있는 동안 요소의 애니메이션을 멈춘다 — 사라지는 애니메이션(끝 상태 `visibility: hidden`)이
 * 초점을 든 요소를 초점 불가로 만들어 초점이 문서 맨 앞으로 떨어지는 자리에 쓴다(목차 FAB). 마우스·터치로
 * 누른 요소는 `:focus-visible`이 아니라 그대로 애니메이션을 탄다. 애니메이션을 거는 블록 안에 펼친다.
 */
export const holdAnimationWhileFocused = css.raw({
  '&:focus-visible': { animationName: 'none' },
});
