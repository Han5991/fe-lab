import { css } from '@design-system/ui-lib/css';

// 목록 행 스타일의 단일 출처 — hairline 보더로만 구분하고 제목 좌 / 날짜
// 우(모노)에 놓는 문법. 홈(PostIndexRow)·아카이브(ArchiveRow)·/series 글
// 목록이 함께 쓴다. 각자 손으로 동기화하던 동일 블록을 한 곳으로 모은다.
// 로컬 변주는 호출부에서 `css(rawX, { ...override })`로 덧씌운다 — cx는
// 충돌하는 원자 클래스를 병합하지 않으므로 raw 병합만 쓴다(NavLinks.tsx).
// raw는 실제로 병합해 쓰는 소비처가 있는 조각만 내보낸다.

// 레퍼런스 .list .row — 구분은 hairline 보더 하나로만.
// 홈은 행이 li 없이 Link 하나라 이 조각을 직접 쓴다. 그 목록을 닫는 마지막
// 행의 아래 보더는 행이 스스로 알 수 없으므로 컨테이너(ol)가 :last-child로
// 붙인다(app/page.tsx).
export const postRowBorderRaw = css.raw({
  borderTopWidth: 'hairline',
  borderTopStyle: 'solid',
  borderColor: 'ink.border',
});

// li로 감싸는 목록(아카이브·시리즈)의 행. 마지막 행에는 아래 보더를 더해
// 목록이 열린 채로 끝나지 않게 한다.
export const postRowItem = css(postRowBorderRaw, {
  _last: { borderBottomWidth: 'hairline', borderBottomStyle: 'solid' },
});

// 행 링크 레이아웃: 제목 좌 / 날짜 우, baseline 정렬.
// 좌우 패딩 없음 — 행 제목이 페이지 제목과 같은 세로선에서 시작해야 한다.
export const postRowLinkLayoutRaw = css.raw({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '[16px]',
  py: '[12px]',
});

// 아카이브·시리즈의 행 링크. hover는 제목(h3)만 색+밑줄로 반응한다.
// (홈 PostIndexRow는 밑줄 없이 색만 바꾸는 자기 hover를 로컬로 갖는다)
export const postRowLink = css(postRowLinkLayoutRaw, {
  _hover: { '& h3': { color: 'accent.600', textDecorationLine: 'underline' } },
});

// 행 제목(h3). 위 postRowLink의 hover가 이 색·transition을 상대로 동작한다.
export const postRowTitle = css({
  minW: '0',
  fontSize: '[14px]',
  fontWeight: 'normal',
  lineHeight: 'snug',
  color: 'ink.950',
  transition: '[color 0.15s]',
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
