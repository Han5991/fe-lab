/**
 * 코드 블록 크롬 팔레트 — CodeBlock(표면·헤더)과 CopyButton(버튼)이 같은 값을 읽는다. 두 파일이
 * 각자 리터럴을 들면 한쪽만 바뀌어 버튼 색이 헤더와 어긋난다. CopyButton이 CodeBlock에서
 * import하지 않는 이유는 번들 경계다: CodeBlock을 import하는 클라이언트 소비자는 구문 강조
 * 스택까지 끌어오므로, 공유 값은 의존성 없는 이 모듈에 둔다.
 *
 * 코드 블록의 헤더 행은 표면과 같은 면이라 크롬 상수가 없다. 한 단계 진한 `code.chrome`은 탭 바
 * (CodeTabsPanels)만 이름으로 직접 쓴다.
 *
 * 예전에는 "코드 표면은 테마와 무관하게 항상 어둡다"가 규칙이었고 크롬 색도 다크 팔레트에서 뽑은
 * hex였다. 그 전제를 codeTheme.ts가 걷어내(구문 색이 라이트/다크 두 벌) 남은 색은 평범한
 * semanticToken이 됐다.
 */
export const CODE_SURFACE = 'code.surface';
// 보더·메타 텍스트는 코드 전용 토큰을 따로 두지 않는다. 라이트/다크가 함께
// 도는 지금은 본문에서 쓰는 hairline·서브 텍스트와 같은 값이 맞다.
export const CODE_BORDER = 'ink.border';
// 메타 텍스트(언어 라벨·파일명·복사 버튼 글리프)는 코드 표면 위 12px 글자·16px 아이콘이다 —
// 목업의 보조 잉크(ink.700)이고 라이트 7.05:1 · 다크 7.84:1이다(탭 바 위에서도 6.4:1 이상).
// 예전에는 ink.500이었다: 헤더가 한 단계 진한 code.chrome 위에 있어 ink.600(4.1:1)이 AA에 못 미쳤다.
export const CODE_META = 'ink.700';
export const CODE_ACCENT = 'accent.solid';
// 드래그 선택 배경만 전용 토큰을 유지한다. code.*는 본문 팔레트(paper/ink)와 독립이라
// 전역 ::selection(panda.config의 selection.bg — 잉크 합성)을 따라가지 않는다. 라이트
// 값은 코드 표면 위 파란 계열 토큰(string #0A3069, number #0550AE)을 지우지 않게 골랐다.
export const CODE_SELECTION = 'code.selection';
