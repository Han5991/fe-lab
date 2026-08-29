/**
 * mermaid 팔레트 사본이 디자인 토큰과 갈라지지 않게 잠근다.
 *
 * mermaid는 CSS 변수를 못 읽어서 `MERMAID_VARS`가 색을 **리터럴로** 들고 있다.
 * 사본이 불가피한 자리이므로(OG 카드가 `themeColor()`를 쓰는 것과 같은 이유),
 * 규칙은 "사본을 만들지 마라"가 아니라 "사본이 어긋나면 터져라"다.
 *
 * 팔레트를 바꾸면 화면은 바뀌지만 mermaid 도표만 옛 색으로 남는다. 렌더는
 * 성공하므로 아무도 실패로 알려주지 않는다 — `codeTheme.test.ts`가 막는 것과
 * 같은 종류의 조용한 실패다.
 *
 * 값의 출처가 셋이라 잠그는 방법도 셋이다(`MermaidChart.tsx` 머리 주석 참고).
 *   ① 토큰 그대로   → `themeColor`와 글자 단위 대조
 *   ② 알파 합성     → 합성을 다시 계산해 대조
 *   ③ 눈으로 고름   → 값이 아니라 **고를 때 본 지면과 알파**를 잠근다.
 *                     팔레트가 움직이면 여기서 깨지고, 사람이 다시 골라야 한다.
 *
 * 보더는 테마마다 갈래가 다르다 — 다크는 ①(`ink.200` 그대로), 라이트만 ③이다.
 * 처음엔 둘 다 ③으로 적었는데, 다크 `#333941`이 `ink.200`의 다크 값과 글자 단위로
 * 같다는 것을 리뷰에서 잡았다. ③으로 두면 `ink.200`을 바꿔도 이 테스트가 초록이라,
 * 화면과 OG 카드만 따라 움직이고 mermaid 도표가 옛 색으로 남는다 — 이 파일이
 * 막겠다고 선언한 바로 그 조용한 실패다.
 */
import { describe, expect, test, vi } from 'vitest';
import {
  themeColor,
  type BlogColorName,
  type BlogTheme,
} from '@design-system/ui/blog-preset';
import { MERMAID_VARS } from './MermaidChart';

// MermaidChart는 mermaid(raw 1.1MB)를 정적 import한다. 여기서 필요한 건 색 상수
// 뿐이라 실제 패키지는 로드하지 않는다(CodeBlock.test.tsx와 같은 처리).
vi.mock('mermaid', () => ({ default: {} }));

// 테마 분기는 프리셋의 `themeColor` 안에만 있다 — 여기서 다시 만들지 않는다.
const THEMES: readonly BlogTheme[] = ['light', 'dark'];

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
} as const satisfies Record<string, BlogColorName>;

/** ② 알파 토큰을 지면 위에 합성한 자리 — mermaid 키 → [알파 토큰, 지면 토큰]. */
const FROM_COMPOSITE = {
  secondaryColor: ['accent.50', 'paper.50'],
} as const satisfies Record<string, readonly [BlogColorName, BlogColorName]>;

/**
 * 보더 네 자리는 **테마마다 출처가 다르다.**
 *
 * 다크 `#333941`은 `ink.200`의 다크 값 그대로다(①). OG 카드도 같은 자리에서 같은
 * 선택을 한다 — `content.config.mts`의 `inkRule: themeColor('dark', 'ink.200')`, 이유는
 * "`ink.border`는 rgba라 합성이 필요한데 불투명 짝이 `ink.200`이라 그쪽을 쓴다".
 * 그러므로 다크는 토큰과 직접 대조한다.
 *
 * 라이트 `#dedede`는 `ink.200`의 라이트 값 `#d8d8d4`와 다르고 팔레트 어디에도
 * 없다(③). 값을 유도할 방법이 없으므로 **고를 때 본 재료**를 잠근다 — 지면과
 * `ink.border` 알파가 그대로면 고른 회색도 유효하고, 바뀌면 사람이 다시 고른다.
 */
const BORDER_KEYS = [
  'primaryBorderColor',
  'tertiaryBorderColor',
  'nodeBorder',
  'clusterBorder',
] as const;

const BORDER_SOURCE = {
  dark: { kind: 'token', token: 'ink.200' },
  light: {
    kind: 'picked',
    value: '#dedede',
    // 고를 때 본 재료. 이 둘이 바뀌면 #dedede는 더 이상 그 지면 위에서 고른 값이 아니다.
    surface: '#ffffff',
    borderAlpha: 'rgba(0,0,0,0.10)',
    // 팔레트에 같은 값이 생기면 손으로 고를 이유가 없어진다 — 그때 ①로 옮기라는 신호.
    notEqualTo: 'ink.200',
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
        MERMAID_VARS[theme][key as keyof (typeof MERMAID_VARS)[BlogTheme]],
      ).toBe(themeColor(theme, tokenName));
    },
  );

  test.each(Object.entries(FROM_COMPOSITE))(
    '%s는 %s를 지면 위에 합성한 값이다',
    (key, [alphaToken, surfaceToken]) => {
      expect(
        MERMAID_VARS[theme][key as keyof (typeof MERMAID_VARS)[BlogTheme]],
      ).toBe(
        composite(
          themeColor(theme, alphaToken),
          themeColor(theme, surfaceToken),
        ),
      );
    },
  );

  test('보더 네 자리가 모두 같은 값이다', () => {
    const source = BORDER_SOURCE[theme];
    const expected =
      source.kind === 'token' ? themeColor(theme, source.token) : source.value;
    for (const key of BORDER_KEYS) {
      expect(MERMAID_VARS[theme][key]).toBe(expected);
    }
  });

  test('보더의 출처가 그대로다', () => {
    const source = BORDER_SOURCE[theme];
    if (source.kind === 'token') {
      // 다크는 ink.200을 그대로 쓴다 — 토큰이 움직이면 여기서 바로 깨진다.
      expect(MERMAID_VARS[theme].primaryBorderColor).toBe(
        themeColor(theme, source.token),
      );
      return;
    }
    // 라이트는 유도할 값이 없으므로 고를 때 본 재료를 잠근다.
    expect(themeColor(theme, 'paper.50')).toBe(source.surface);
    expect(themeColor(theme, 'ink.border')).toBe(source.borderAlpha);
    // 팔레트가 이 값을 갖게 되면 ①로 옮겨야 한다. 그 시점을 여기서 알린다.
    expect(themeColor(theme, source.notEqualTo)).not.toBe(source.value);
  });

  test('팔레트로 설명되지 않는 색이 새로 늘지 않았다', () => {
    const explained = new Set<string>([
      ...Object.keys(FROM_TOKEN),
      ...Object.keys(FROM_COMPOSITE),
      ...BORDER_KEYS,
    ]);
    const unexplained = Object.keys(MERMAID_VARS[theme]).filter(
      k => !explained.has(k),
    );
    expect(unexplained).toEqual([]);
  });
});
