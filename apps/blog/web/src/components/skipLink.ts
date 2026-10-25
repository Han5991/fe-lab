import { css } from '@blog/styled-system/css';

/**
 * 건너뛰기 링크가 가리키는 본문 영역 id — 사이트 셸(`Layout`)과 admin 셸(`AdminShell`)의 `main`이
 * 함께 쓴다. 두 셸은 한 문서에 함께 그려지지 않는다(`ShellSwitch`).
 */
export const MAIN_ID = 'main-content';

/** 헤더의 탭 정지점을 건너뛰는 링크 — 초점을 받을 때만 나타난다. */
export const skipLink = css({
  pos: 'absolute',
  top: '2',
  left: '4',
  zIndex: '60',
  px: '3',
  py: '2',
  bg: 'paper.50',
  color: 'ink.950',
  fontSize: 'sm',
  borderWidth: 'hairline',
  borderColor: 'ink.borderStrong',
  rounded: 'element',
  transform: 'translateY(-200%)',
  _focus: { transform: 'none' },
});
