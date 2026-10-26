import { css } from '@blog/styled-system/css';

/**
 * 누르는 모양의 프리셋 — 인터랙션 상태의 단일 출처(blog-design-system 스킬 "인터랙션 상태").
 * 상태의 **때**는 panda.config의 조건(`_hover`·`_press`·`_pressScale`)이 정하고, 이 파일은 그 조건에
 * **무엇**을 걸지 정한다. 면·색처럼 요소마다 다른 값은 레시피·호출부가 `_hover`에 적는다 — 터치에서는
 * `_hover`가 누르는 동안이라, 그 한 줄이 마우스의 hover와 터치의 누름을 함께 맡는다.
 *
 * - 전환은 `common`(색·투명도·transform)이라 hover 색과 누름 크기가 같은 시간(fast)을 탄다. 쓰는 쪽이
 *   `transition`을 다시 적으면 transform이 빠져 누름이 뚝 끊긴다.
 * - 크기는 마우스류 포인터(`_pressScale`)에서만 줄어든다. 움직임 줄이기는 시간 토큰이 맡는다(fast가
 *   0.01ms가 된다).
 * - 크기는 버튼·칩·카드에만 둔다. 세그먼트는 칸 뒤에서 미끄러지는 표식 면과 어긋나고, 인라인 링크는
 *   transform이 걸리지 않으며(비대체 인라인 요소), 면으로 깔린 행은 레일 정렬이 흔들린다.
 *
 * 버튼 레시피(`actionButton`·`iconButton`·`chip`·`tagBadge`)는 cva `base`에 펼치고, 레시피 밖의 버튼
 * (맨 위로·목차 열기·코드 복사)은 `css(pressButton, { … })`로 합친다.
 */
export const pressButton = css.raw({
  transition: 'common',
  _pressScale: { transform: 'scale(0.98)' },
  // `_pressScale`이 비활성의 누름 크기를 이미 뺐다 — 여기서는 비활성의 모양(흐림·커서)만 준다.
  _disabled: { opacity: '0.5', cursor: 'not-allowed' },
});

/**
 * 글 카드 뿌리의 누름 — 마우스로 누르는 동안 카드가 99%로 줄어든다. 버튼(98%)보다 얕은 건 상자가 커서
 * 1%도 가장자리가 4px 안팎 움직이기 때문이다. 카드는 글 상세로 이어지는 공유 요소(View Transition)라
 * 클릭 순간에 줄어 있어도 전환을 해치지 않는다 — 전환 그룹은 조상의 transform을 그룹 transform으로
 * 받아 눌린 모양에서 이어 모핑하고, 스냅샷의 크기(`old`의 width·height)는 레이아웃 크기 그대로다
 * (Chrome 실측, 4초로 늘린 해제 전환을 걸어 99.7%인 채 전환을 시작해도 같다). 커버 hairline·틴트는
 * `cardParts.ts`다.
 */
export const pressCard = css.raw({
  transition: 'common',
  _pressScale: { transform: 'scale(0.99)' },
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
