/**
 * 코드 블록 크롬 팔레트 — CodeBlock(표면·상단 바)과 CopyButton(버튼)이 같은
 * 값을 읽는다. 두 파일이 각자 리터럴을 들면 한쪽만 바뀌어 버튼 색이 상단
 * 바와 어긋난다. CopyButton이 CodeBlock에서 import하지 않는 이유는 번들
 * 경계다: CodeBlock을 import하는 클라이언트 소비자는 구문 강조 스택까지
 * 끌어오므로, 공유 값은 의존성 없는 이 모듈에 둔다.
 *
 * 예전에는 "코드 표면은 테마와 무관하게 항상 어둡다"가 규칙이었고 크롬 색도
 * 다크 팔레트에서 뽑은 hex였다. 그 전제를 codeTheme.ts가 걷어내(구문 색이
 * 라이트/다크 두 벌) 남은 크롬 색은 평범한 semanticToken이 됐다.
 */
export const CODE_SURFACE = 'code.surface';
export const CODE_CHROME = 'code.chrome';
// 보더·메타 텍스트는 코드 전용 토큰을 따로 두지 않는다. 라이트/다크가 함께
// 도는 지금은 본문에서 쓰는 hairline·서브 텍스트와 같은 값이 맞다.
export const CODE_BORDER = 'ink.border';
export const CODE_META = 'ink.600';
export const CODE_ACCENT = 'accent.600';
// 드래그 선택 배경만 전용 토큰을 유지한다. 전역 ::selection(panda.config)의
// selection.bg는 라이트에서 옅은 하늘색이라, 코드 표면 위 파란 계열 토큰
// (string #0A3069, number #0550AE)을 지워버린다.
export const CODE_SELECTION = 'code.selection';
