import { css } from '@blog/styled-system/css';

/**
 * 굵기가 바뀌어도 폭이 그대로인 면 — 켜지면 semibold가 되는 칩·토글 칸이 쓴다. 면은 글자를 자식으로,
 * 같은 글자를 `data-label`로 든다. `::after`가 그 글자를 semibold로 한 번 더 그리되 높이 0·`hidden`이라
 * 보이지 않고 폭만 굵은 쪽으로 미리 잡는다(Astryx ToggleButton과 같은 동작). 켜고 끌 때 옆 칩이 밀리지
 * 않는다.
 *
 * 면은 flex 세로 방향이라 글자와 사본이 위아래로 쌓인다 — 폭은 둘 중 넓은 쪽, 높이는 글자 한 줄이다.
 * 사본은 `visibility: hidden`이라 접근성 트리에 없고(이름에 두 번 들어가지 않는다), 생성 콘텐츠라 선택·
 * 복사·찾기에도 걸리지 않는다. 면의 `display`는 쓰는 쪽(`inline-flex`)이 정한다.
 */
export const steadyLabel = css.raw({
  flexDirection: 'column',
  justifyContent: 'center',
  _after: {
    content: 'attr(data-label)',
    h: '0',
    overflow: 'hidden',
    visibility: 'hidden',
    fontWeight: 'semibold',
  },
});
