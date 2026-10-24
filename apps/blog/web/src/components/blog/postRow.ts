import { css } from '@blog/styled-system/css';

// 목록 행 스타일의 단일 출처 — hairline 보더로만 구분하고 제목 좌 / 날짜
// 우(모노)에 놓는 문법. 행 마크업은 PostListRow 하나이고(/posts 목록 보기·/series
// 글 목록), 날짜·개수 모노 글자는 /series 머리도 쓴다.
// 로컬 변주는 호출부에서 `css(rawX, { ...override })`로 덧씌운다 — cx는
// 충돌하는 원자 클래스를 병합하지 않으므로 raw 병합만 쓴다(NavLinks.tsx).
// raw는 실제로 병합해 쓰는 소비처가 있는 조각만 내보낸다.

// 레퍼런스 .list .row — 구분은 hairline 보더 하나로만. li로 감싸는 목록의 행이고,
// 마지막 행에는 아래 보더를 더해 목록이 열린 채로 끝나지 않게 한다.
export const postRowItem = css({
  borderTopWidth: 'hairline',
  borderTopStyle: 'solid',
  borderColor: 'ink.border',
  _last: { borderBottomWidth: 'hairline', borderBottomStyle: 'solid' },
});

// 행 링크: 제목 좌 / 날짜 우, baseline 정렬. hover는 제목(h3)에 밑줄로만 반응한다 —
// 제목이 이미 본문 잉크라 더 진한 색이 없다. 아카이브·/series가 같다.
// 좌우 패딩 없음 — 행 제목이 페이지 제목과 같은 세로선에서 시작해야 한다.
export const postRowLink = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '[16px]',
  py: '[12px]',
  _hover: { '& h3': { textDecorationLine: 'underline' } },
});

// 행 제목(h3). 위 postRowLink의 hover가 이 제목에 밑줄을 긋는다.
export const postRowTitle = css({
  minW: '0',
  fontSize: '[14px]',
  fontWeight: 'normal',
  lineHeight: 'snug',
  color: 'ink.950',
});

// 레퍼런스 .meta / .date — 날짜·개수 등 수치는 전부 모노. 여백을 덧붙이는
// 소비처(/series 헤더 통계)가 있어 raw 객체와 클래스 두 형태를 함께 둔다.
export const postRowMetaRaw = css.raw({
  fontFamily: 'mono',
  fontWeight: 'normal',
  fontSize: '[12px]',
  color: 'ink.500',
  flexShrink: 0,
  fontVariantNumeric: 'tabular-nums',
});
export const postRowMeta = css(postRowMetaRaw);
