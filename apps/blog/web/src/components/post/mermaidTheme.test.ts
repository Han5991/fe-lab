/**
 * mermaid 팔레트 사본이 디자인 토큰과 갈라지지 않게 잠근다.
 *
 * mermaid는 CSS 변수를 못 읽어서 `MERMAID_VARS`가 색을 **리터럴로** 들고 있다.
 * 사본이 불가피한 자리이므로(OG 카드가 `darkColor()`를 쓰는 것과 같은 이유),
 * 규칙은 "사본을 만들지 마라"가 아니라 "사본이 어긋나면 터져라"다.
 *
 * 팔레트를 바꾸면 화면은 바뀌지만 mermaid 도표만 옛 색으로 남는다. 렌더는
 * 성공하므로 아무도 실패로 알려주지 않는다 — `codeTheme.test.ts`가 막는 것과
 * 같은 종류의 조용한 실패다.
 *
 * 값의 출처가 셋이라 잠그는 방법도 셋이다(`MermaidChart.tsx` 머리 주석 참고).
 *   ① 토큰 그대로   → `lightColor`/`darkColor`와 글자 단위 대조
 *   ② 알파 합성     → 합성을 다시 계산해 대조
 *   ③ 눈으로 고름   → 값이 아니라 **고를 때 본 지면과 알파**를 잠근다.
 *                     팔레트가 움직이면 여기서 깨지고, 사람이 다시 골라야 한다.
 */
import { describe, expect, test, vi } from 'vitest';
import { lightColor, darkColor } from '@design-system/ui/blog-preset';
import { MERMAID_VARS } from './MermaidChart';

// MermaidChart는 mermaid(raw 1.1MB)를 정적 import한다. 여기서 필요한 건 색 상수
// 뿐이라 실제 패키지는 로드하지 않는다(CodeBlock.test.tsx와 같은 처리).
vi.mock('mermaid', () => ({ default: {} }));

type Theme = 'light' | 'dark';
const THEMES: readonly Theme[] = ['light', 'dark'];
const color = (theme: Theme, name: Parameters<typeof lightColor>[0]) =>
  theme === 'light' ? lightColor(name) : darkColor(name);

/** ① 토큰 값을 그대로 쓰는 자리 — mermaid 키 → 토큰 이름. */
const FROM_TOKEN = {
  background: 'paper.50',
  mainBkg: 'paper.100',
  primaryColor: 'paper.100',
  primaryTextColor: 'ink.950',
  secondaryBorderColor: 'accent.500',
  tertiaryColor: 'paper.200',
  lineColor: 'ink.600',
  textColor: 'ink.950',
  clusterBkg: 'paper.200',
  titleColor: 'ink.950',
  edgeLabelBackground: 'paper.50',
} as const satisfies Record<string, Parameters<typeof lightColor>[0]>;

/** ② 알파 토큰을 지면 위에 합성한 자리 — mermaid 키 → [알파 토큰, 지면 토큰]. */
const FROM_COMPOSITE = {
  secondaryColor: ['accent.50', 'paper.50'],
} as const satisfies Record<
  string,
  readonly [Parameters<typeof lightColor>[0], Parameters<typeof lightColor>[0]]
>;

/**
 * ③ 눈으로 고른 보더 회색. 값은 팔레트로 유도되지 않으므로 값을 대조할 수 없다.
 * 대신 **고를 때 본 재료**를 잠근다 — 이 둘이 그대로면 고른 회색도 유효하다.
 */
const HANDPICKED_BORDERS = [
  'primaryBorderColor',
  'tertiaryBorderColor',
  'nodeBorder',
  'clusterBorder',
] as const;
const BORDER_REFERENCE = {
  light: { border: 'rgba(0,0,0,0.10)', surface: '#ffffff', picked: '#dedede' },
  dark: {
    border: 'rgba(255,255,255,0.12)',
    surface: '#0b0d10',
    picked: '#333941',
  },
} as const;

const parseHex = (hex: string): readonly [number, number, number] => {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`hex가 아니다: ${hex}`);
  const [, r, g, b] = m;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
};

const parseRgba = (
  value: string,
): readonly [number, number, number, number] => {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/.exec(
    value,
  );
  if (!m) throw new Error(`rgba가 아니다: ${value}`);
  const [, r, g, b, a] = m;
  return [Number(r), Number(g), Number(b), Number(a)];
};

/** 알파 색을 불투명 지면 위에 올린 결과. */
const composite = (over: string, base: string): string => {
  const [r, g, b, a] = parseRgba(over);
  const [br, bg, bb] = parseHex(base);
  const mix = (fg: number, ground: number) =>
    Math.round(ground + (fg - ground) * a);
  return `#${[mix(r, br), mix(g, bg), mix(b, bb)]
    .map(n => n.toString(16).padStart(2, '0'))
    .join('')}`;
};

describe.each(THEMES)('MERMAID_VARS.%s', theme => {
  test.each(Object.entries(FROM_TOKEN))(
    '%s는 토큰 %s와 같다',
    (key, tokenName) => {
      expect(
        MERMAID_VARS[theme][key as keyof (typeof MERMAID_VARS)[Theme]],
      ).toBe(color(theme, tokenName));
    },
  );

  test.each(Object.entries(FROM_COMPOSITE))(
    '%s는 %s를 지면 위에 합성한 값이다',
    (key, [alphaToken, surfaceToken]) => {
      expect(
        MERMAID_VARS[theme][key as keyof (typeof MERMAID_VARS)[Theme]],
      ).toBe(composite(color(theme, alphaToken), color(theme, surfaceToken)));
    },
  );

  test('눈으로 고른 보더 회색은 네 자리가 모두 같은 값이다', () => {
    const picked = BORDER_REFERENCE[theme].picked;
    for (const key of HANDPICKED_BORDERS) {
      expect(MERMAID_VARS[theme][key]).toBe(picked);
    }
  });

  test('보더 회색을 고를 때 본 지면과 알파가 그대로다', () => {
    // 이 둘이 바뀌면 #dedede/#333941은 더 이상 그 지면 위에서 고른 값이 아니다.
    // 값을 기계적으로 다시 계산할 방법이 없으므로 사람이 다시 골라야 하고,
    // 이 테스트가 그 시점을 알려주는 유일한 신호다.
    expect(color(theme, 'ink.border')).toBe(BORDER_REFERENCE[theme].border);
    expect(color(theme, 'paper.50')).toBe(BORDER_REFERENCE[theme].surface);
  });

  test('팔레트로 설명되지 않는 색이 새로 늘지 않았다', () => {
    const explained = new Set<string>([
      ...Object.keys(FROM_TOKEN),
      ...Object.keys(FROM_COMPOSITE),
      ...HANDPICKED_BORDERS,
    ]);
    const unexplained = Object.keys(MERMAID_VARS[theme]).filter(
      k => !explained.has(k),
    );
    expect(unexplained).toEqual([]);
  });
});
