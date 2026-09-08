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
