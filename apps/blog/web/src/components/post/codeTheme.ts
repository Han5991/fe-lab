import type { CSSProperties } from 'react';
import { token } from '@design-system/ui-lib/tokens';

/** `token.var()`가 받는 토큰 경로. 오타가 나면 여기서 컴파일이 막힌다. */
type TokenPath = Parameters<typeof token.var>[0];

/**
 * 구문 강조를 **라이트/다크 두 벌**로 바꾸는 변환.
 *
 * 코드 표면이 테마와 무관하게 늘 어두웠던 건 순전히 여기 때문이었다.
 * `vscDarkPlus`는 다크 배경을 전제로 고른 hex 색 뭉치라, 배경만 밝히면
 * 구문 색이 통째로 대비를 잃는다. 그래서 예전 CodeBlock은 "코드 크롬은
 * 토큰이 아니라 새 다크 팔레트에서 뽑은 고정값"이라는 규칙을 달고 있었다.
 *
 * 레퍼런스(fumadocs)는 shiki의 듀얼 테마로 이 문제를 푼다 — 토큰마다
 * 라이트/다크 색을 **둘 다** 실어 보내고(`--shiki-light`/`--shiki-dark`)
 * `.dark`에서 어느 쪽을 읽을지만 고른다. 색을 고르는 일이 JS가 아니라
 * CSS에서 일어나므로 테마 전환에 리렌더가 없다.
 *
 * 여기서는 같은 원리를 쓰되 변수 **정의**를 semanticToken으로 옮겼다.
 * 색 쌍은 blog-preset의 `code.*` 한 곳에만 있고, 이 파일은 원본 테마의
 * 셀렉터 구조를 유지한 채 hex를 그 변수 참조로 갈아끼우기만 한다.
 *
 *   - 다크 화면은 값이 그대로라 **한 픽셀도 바뀌지 않는다**.
 *   - 라이트는 preset의 `_dark` 반대편 값(github-light 계열)이 나온다.
 *   - 색이 마크업이 아니라 스타일시트에 한 번만 있으므로, shiki처럼
 *     토큰마다 인라인 변수를 싣는 방식보다 HTML이 가볍다.
 */

/**
 * vscDarkPlus에 등장하는 색 → `code.*` 토큰.
 *
 * 원본 테마가 쓰는 색은 열 몇 개뿐이고, 수십 개의 셀렉터가 그걸 돌려 쓴다.
 * 그래서 셀렉터가 아니라 **색**을 기준으로 매핑한다 — 원본이 같은 색으로
 * 묶어 둔 의미 그룹(예: string·char·builtin·deleted)이 자동으로 유지된다.
 *
 * 이 표에 없는 색이 원본에 남아 있으면 그 토큰만 다크 hex로 굳어 라이트
 * 테마에서 튄다. codeTheme.test.ts가 누락을 막는다.
 */
export const CODE_COLOR_ROLES: Record<string, TokenPath> = {
  // 본문 텍스트 · 구두점 · 연산자
  '#d4d4d4': 'colors.code.fg',
  '#6a9955': 'colors.code.comment',
  // 변수 · 속성 · 매개변수 · attr-name
  '#9cdcfe': 'colors.code.property',
  // 키워드 · 태그 · boolean · entity
  '#569cd6': 'colors.code.keyword',
  // import/return 등 흐름 키워드, atrule.rule
  '#c586c0': 'colors.code.keywordFlow',
  // 문자열 · char · builtin · deleted · atrule
  '#ce9178': 'colors.code.string',
  // 숫자 · symbol · inserted · unit
  '#b5cea8': 'colors.code.number',
  '#dcdcaa': 'colors.code.function',
  '#4ec9b0': 'colors.code.class',
  '#d16969': 'colors.code.regex',
  '#d7ba7d': 'colors.code.selector',
  // html 태그의 꺾쇠 등 "덜 보여야 하는" 구두점
  '#808080': 'colors.code.muted',
  // 아래 셋은 우리 렌더에서 화면에 닿지 않는다(배경·선택색은 CodeBlock이
  // 직접 덮고, 인라인 코드는 CodeBlock의 다른 분기가 맡는다). 그래도
  // 매핑해 둬야 라이트 테마에서 다크 hex가 남는 자리가 하나도 없다.
  '#1e1e1e': 'colors.code.surface',
  '#264f78': 'colors.code.selection',
  '#db4c69': 'colors.code.string',
  // prism의 line-highlight 장식. 우리는 쓰지 않지만 같은 이유로 매핑한다.
  '#f7ebc6': 'colors.code.chrome',
  '#f7d87c': 'colors.code.selector',
};

/**
 * 색이 아니라 **셀렉터**로 갈라야 하는 예외.
 *
 * 색 기준 매핑은 원본이 같은 색으로 묶어 둔 의미 그룹을 공짜로 지켜주지만,
 * 그 대가로 **원본에서 같은 색이던 둘을 라이트에서 갈라낼 수 없다.**
 * vscDarkPlus는 태그와 키워드가 똑같은 `#569cd6`인데, github-light은 태그를
 * 초록(`#116329`) 키워드를 빨강(`#cf222e`)으로 나눈다. jsx·tsx·html이 자주
 * 나오는 글에서 둘이 같은 색이면 마크업의 뼈대가 잘 안 읽혀서, 태그만
 * 예외로 둔다(다크는 원본과 같은 값이라 화면이 바뀌지 않는다).
 *
 * diff의 `inserted`/`deleted`도 같은 문제다. 원본은 inserted를 숫자(`#b5cea8`),
 * deleted를 문자열(`#ce9178`)과 묶어 두는데, 그 둘의 라이트 짝(`#0550ae`·
 * `#0a3069`)이 둘 다 파랑이라 라이트에서는 +줄과 −줄이 구분되지 않는다.
 * 추가·삭제가 색으로 갈리지 않는 diff는 diff가 아니므로 예외로 둔다.
 *
 * 예외를 늘릴 때는 "라이트에서 갈라지는 게 실제로 읽기에 도움이 되는가"를
 * 기준으로 볼 것. 그냥 다르다는 이유로 늘리면 색 기준 매핑의 장점이 사라진다.
 */
const SELECTOR_OVERRIDES: Record<string, TokenPath> = {
  tag: 'colors.code.tag',
  inserted: 'colors.code.inserted',
  deleted: 'colors.code.deleted',
};

/**
 * 원본 테마 한 벌 — react-syntax-highlighter가 style prop으로 받는 모양
 * (셀렉터 → CSS 선언). 반환 타입도 같아야 그대로 넘길 수 있다.
 */
type PrismStyle = Record<string, CSSProperties>;

const HEX = /#[0-9a-f]{3,8}/gi;

/**
 * 문자열 안의 hex 색을 전부 토큰 변수 참조로 바꾼다.
 *
 * `'inset 5px 0 0 #f7d87c'`처럼 색이 값의 일부인 선언이 있어서 전체 문자열
 * 비교가 아니라 치환이다. 표에 없는 색은 손대지 않고 그대로 둔다 — 조용히
 * 다른 색으로 바뀌는 것보다 낫고, 그런 색이 있는지는 테스트가 본다.
 */
export function swapColors(value: string): string {
  return value.replace(HEX, hex => {
    const role = CODE_COLOR_ROLES[hex.toLowerCase()];
    return role ? token.var(role) : hex;
  });
}

/** 테마 한 벌의 모든 색 선언을 토큰 변수로 바꾼 새 객체를 만든다. */
export function toDualTheme(base: PrismStyle): PrismStyle {
  return Object.fromEntries(
    Object.entries(base).map(([selector, rules]) => {
      const swapped = Object.fromEntries(
        Object.entries(rules).map(([prop, value]) => [
          prop,
          typeof value === 'string' ? swapColors(value) : value,
        ]),
      );
      const override = SELECTOR_OVERRIDES[selector];
      return [
        selector,
        override ? { ...swapped, color: token.var(override) } : swapped,
      ];
    }),
  );
}
