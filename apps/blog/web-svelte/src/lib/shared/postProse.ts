/**
 * 글 본문의 타이포그래피. `apps/blog/web/src/app/posts/[...slug]/PostBody.tsx`의
 * prose 블록을 옮긴 것이고, 두 사이트의 본문이 같은 리듬으로 읽혀야 한다.
 *
 * 마크다운은 빌드 타임에 HTML 문자열로 구워 넣으므로(`{@html}`) 컴포넌트 맵이
 * 아니라 **자손 선택자**로 스타일을 건다. 커스텀 태그(callout·diagram 등)는
 * 이미 자기 클래스를 달고 나오므로 여기서 다시 다루지 않는다.
 */
import { css } from '../../../styled-system/css';

export const postProse = css({
  // 크기는 본문 가독성 기준인 lg(18px)를 유지한다.
  fontFamily: 'sans',
  fontSize: 'lg',
  lineHeight: 'prose',
  color: 'ink.900',

  /**
   * 본문 헤딩 스케일의 천장은 글 제목(22px)이다. 20 → 18 → 16으로 좁게 깔고,
   * 2px씩밖에 안 벌어지는 만큼 구분은 크기가 아니라 여백과 **색**이 맡는다 —
   * 최상위(h2)에만 액센트를 주면 "대단원 / 그 아래"가 한눈에 잘리고, h3·h4는
   * 무채색으로 남아 본문 흐름을 끊지 않는다.
   *
   * 원고의 h1은 렌더 시 h2로 강등되므로(마크다운 파이프라인) 이 안에 h1이
   * 나올 수 없다. 페이지의 h1은 `PostHeader`의 글 제목 하나뿐이다.
   */
  '& h2': {
    fontSize: '[20px]',
    fontWeight: 'semibold',
    letterSpacing: 'tightXs',
    mt: '12',
    mb: '4',
    color: 'accent.900',
    lineHeight: 'header',
    scrollMarginTop: '[100px]',
  },
  // h3는 본문(18px)과 크기가 같다. 굵기·색·위 여백으로 구분되므로 크기까지
  // 벌리면 위 단계와 붙어버린다.
  '& h3': {
    fontSize: '[18px]',
    fontWeight: 'semibold',
    lineHeight: 'header',
    mt: '10',
    mb: '3',
    color: 'ink.950',
    scrollMarginTop: '[100px]',
  },
  '& h4': {
    fontSize: '[16px]',
    fontWeight: 'semibold',
    lineHeight: 'header',
    mt: '8',
    mb: '3',
    color: 'ink.950',
    scrollMarginTop: '[100px]',
  },

  '& p': { mb: '6' },
  '& ul': { listStyleType: 'disc', pl: '6', mb: '6' },
  '& ol': { listStyleType: 'decimal', pl: '6', mb: '6' },
  '& li': { mb: '2', pl: '1' },
  '& li > ul': { mt: '2', mb: '0' },
  '& del': { color: 'ink.500' },

  // 인용은 2px hairline 좌측 바로 통일한다.
  '& blockquote': {
    borderLeftWidth: '[2px]',
    borderLeftColor: 'ink.border',
    pl: '4',
    py: '1',
    my: '6',
    color: 'ink.600',
    '& p': { mb: '0' },
  },

  '& a': {
    color: 'accent.600',
    textDecorationLine: 'none',
    borderBottomWidth: 'hairline',
    borderBottomColor: 'accent.200',
    transition: '[all 0.15s]',
    fontWeight: 'medium',
    wordBreak: 'break-all',
    overflowWrap: 'break-word',
    // 보더는 비텍스트라 원색(accent.500)을 그대로 쓴다.
    _hover: { borderBottomColor: 'accent.500', bg: 'accent.50' },
  },

  '& img': {
    rounded: 'control',
    w: 'full',
    h: 'auto',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    my: '4',
  },
  '& hr': { my: '10', h: '[1px]', border: '[none]', bg: 'ink.border' },

  '& table': {
    w: 'full',
    // 상하 여백은 가로 스크롤 래퍼가 가진다. 여기서도 주면 겹쳐서 표 앞뒤가
    // 두 배로 벌어진다.
    borderCollapse: 'separate',
    borderSpacing: '0',
    fontSize: 'sm',
    fontFamily: 'sans',
    borderWidth: 'hairline',
    borderColor: 'ink.border',
  },
  '& th': {
    bg: 'paper.100',
    fontWeight: 'semibold',
    p: '4',
    borderBottomWidth: 'hairline',
    borderColor: 'ink.border',
    textAlign: 'left',
    color: 'ink.950',
    fontSize: 'xs',
    letterSpacing: 'mono',
    textTransform: 'uppercase',
    fontFamily: 'mono',
  },
  '& td': {
    p: '4',
    borderBottomWidth: 'hairline',
    borderColor: 'ink.border',
    color: 'ink.700',
  },
  // borderWidths 토큰은 hairline 하나뿐이라 0은 이스케이프해서 쓴다.
  '& tr:last-child td': { borderBottomWidth: '[0]' },
  '& tr:hover td': { bg: 'paper.100' },
});
