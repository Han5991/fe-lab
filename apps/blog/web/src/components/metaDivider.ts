import { css } from '@blog/styled-system/css';

/**
 * 메타 항목 사이의 세로 구분선 — 글자 높이의 3/4, 강조 보더 색. 읽을 거리가 아니라 숨기는 장식이라
 * 쓰는 쪽이 `<span aria-hidden="true" className={metaDivider} />`로 단다. 글 카드·목록 행의 메타 줄
 * (`PostMeta`)과 글 상세의 바이라인(`Byline`)이 같은 선을 쓴다.
 */
export const metaDivider = css({
  h: '[0.75em]',
  borderLeftWidth: 'hairline',
  borderLeftStyle: 'solid',
  borderColor: 'ink.borderStrong',
});
