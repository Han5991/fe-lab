/**
 * 목록 행 스타일의 단일 출처 — hairline 보더로만 구분하고 제목 좌 / 날짜
 * 우(모노)에 놓는 문법. `apps/blog/web/src/components/blog/postRow.ts`의 이식이다.
 *
 * 로컬 변주는 호출부에서 `css(raw, { ...override })`로 덧씌운다. **`cx`를 쓰지
 * 않는다** — cx는 충돌하는 원자 클래스를 병합하지 않아서, 색을 덮어쓰려 해도
 * 승자를 스타일시트 순서가 정한다.
 */
import { css } from '../../../styled-system/css';

/** 구분은 hairline 보더 하나로만. */
export const postRowBorderRaw = css.raw({
  borderTopWidth: 'hairline',
  borderTopStyle: 'solid',
  borderColor: 'ink.border',
});

/**
 * 행 링크 레이아웃: 제목 좌 / 날짜 우, baseline 정렬.
 * **좌우 패딩 없음** — 행 제목이 히어로·대표 글과 같은 세로선에서 시작해야 한다.
 */
export const postRowLinkLayoutRaw = css.raw({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
  gap: '[16px]',
  py: '[12px]',
});

/** 날짜·개수 등 수치는 전부 모노. */
export const postRowMetaRaw = css.raw({
  fontFamily: 'mono',
  fontWeight: 'normal',
  fontSize: '[12px]',
  color: 'ink.500',
  flexShrink: 0,
  fontVariantNumeric: 'tabular-nums',
});
export const postRowMeta = css(postRowMetaRaw);

/**
 * li로 감싸는 목록(아카이브)의 행. 마지막 행에는 아래 보더를 더해 목록이 열린
 * 채로 끝나지 않게 한다 — 홈은 행이 li 없이 링크 하나라 컨테이너가
 * `:last-child`로 붙이지만, 여기서는 행이 스스로 안다.
 */
export const postRowItem = css(postRowBorderRaw, {
  _last: { borderBottomWidth: 'hairline', borderBottomStyle: 'solid' },
});

/**
 * 아카이브의 행 링크. hover는 제목(h3)만 색+밑줄로 반응한다.
 * (홈 `PostIndexRow`는 밑줄 없이 색만 바꾸는 자기 hover를 로컬로 갖는다)
 */
export const postRowLink = css(postRowLinkLayoutRaw, {
  _hover: { '& h3': { color: 'accent.600', textDecorationLine: 'underline' } },
});

/** 행 제목(h3). 위 `postRowLink`의 hover가 이 색·transition을 상대로 동작한다. */
export const postRowTitle = css({
  minW: '0',
  fontSize: '[14px]',
  fontWeight: 'normal',
  lineHeight: 'snug',
  color: 'ink.950',
  transition: '[color 0.15s]',
});
