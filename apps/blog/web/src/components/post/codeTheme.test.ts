/**
 * 구문 강조를 두 테마로 쓰는 변환의 계약.
 *
 * 여기서 지켜야 할 건 하나다 — **원본 테마의 색이 하나도 남지 않는 것**.
 * 한 색만 매핑에서 빠져도 그 토큰은 다크용 hex로 굳어, 라이트 테마에서
 * 그 토큰만 배경에 묻히거나 혼자 튄다. 화면을 하나하나 뜯어보지 않는 한
 * 알아채기 어렵고, prism 테마가 갱신돼 색이 늘어나면 조용히 재발한다.
 */
import { describe, expect, test } from 'vitest';
import type { CSSProperties } from 'react';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { themeColor, type BlogColorName, type BlogTheme } from '@blog/preset';
import { CODE_COLOR_ROLES, swapColors, toDualTheme } from './codeTheme';

const HEX = /#[0-9a-f]{3,8}/gi;

/** 테마 한 벌에 등장하는 모든 색. */
const colorsIn = (style: Record<string, CSSProperties>) =>
  new Set(
    Object.values(style)
      // CSSProperties의 커스텀 프로퍼티 색인이 any라 값 배열도 any[]로 나온다
      // — 아래 filter가 string으로 좁히기 전까지는 unknown으로 취급한다.
      .flatMap((rules): unknown[] => Object.values(rules) as unknown[])
      .filter((v): v is string => typeof v === 'string')
      .flatMap(v => v.match(HEX) ?? [])
      .map(hex => hex.toLowerCase()),
  );

describe('CODE_COLOR_ROLES', () => {
  test('원본 테마가 쓰는 색이 하나도 빠짐없이 매핑돼 있다', () => {
    const missing = [...colorsIn(vscDarkPlus)].filter(
      hex => !(hex in CODE_COLOR_ROLES),
    );

    expect(missing).toEqual([]);
  });

  test('모든 매핑이 colors.code.* 토큰을 가리킨다', () => {
    // 다른 팔레트(paper/ink)를 직접 가리키면 코드 색이 본문 색과 한 몸이
    // 되어, 본문 톤을 손볼 때 구문 강조가 같이 흔들린다.
    const strays = Object.values(CODE_COLOR_ROLES).filter(
      role => !role.startsWith('colors.code.'),
    );

    expect(strays).toEqual([]);
  });
});

describe('swapColors', () => {
  test('색을 토큰 변수 참조로 바꾼다', () => {
    expect(swapColors('#d4d4d4')).toContain('var(');
    expect(swapColors('#d4d4d4')).not.toContain('#d4d4d4');
  });

  test('대문자로 적힌 색도 같은 토큰으로 본다', () => {
    // 원본 테마는 `#569CD6`과 `#569cd6`을 섞어 쓴다.
    expect(swapColors('#569CD6')).toBe(swapColors('#569cd6'));
  });

  test('색이 값의 일부로 들어 있어도 그 부분만 바꾼다', () => {
    const out = swapColors('inset 5px 0 0 #f7d87c');

    expect(out.startsWith('inset 5px 0 0 ')).toBe(true);
    expect(out).not.toContain('#f7d87c');
  });

  test('매핑에 없는 색은 건드리지 않는다', () => {
    // 조용히 다른 색으로 바뀌는 것보다, 그대로 두고 위 테스트가 잡는 게 낫다.
    expect(swapColors('#123456')).toBe('#123456');
  });
});

describe('toDualTheme', () => {
  const dual = toDualTheme(vscDarkPlus);

  test('셀렉터 구조는 원본 그대로다', () => {
    // 셀렉터가 하나라도 사라지면 그 토큰만 색이 빠진다.
    expect(Object.keys(dual)).toEqual(Object.keys(vscDarkPlus));
  });

  test('결과에는 원본 hex가 하나도 남지 않는다', () => {
    expect([...colorsIn(dual)]).toEqual([]);
  });

  test('태그는 키워드와 다른 토큰을 쓴다', () => {
    // 원본에서는 둘 다 #569cd6이라 색 기준 매핑만으로는 갈라지지 않는다.
    // 라이트에서 마크업의 뼈대가 읽히려면 태그가 따로 서야 한다.
    expect(dual.tag.color).not.toBe(dual.keyword.color);
    expect(dual.tag.color).toContain('code');
  });

  test('diff의 +줄과 −줄은 숫자·문자열과 다른 전용 토큰을 쓴다', () => {
    // 원본은 inserted를 숫자(#b5cea8), deleted를 문자열(#ce9178)과 묶는데
    // 그 둘의 라이트 짝이 둘 다 파랑이라 diff에서 추가·삭제가 갈리지 않았다.
    expect(dual.inserted.color).toContain('code');
    expect(dual.deleted.color).toContain('code');
    expect(dual.inserted.color).not.toBe(dual.number.color);
    expect(dual.deleted.color).not.toBe(dual.string.color);
    expect(dual.inserted.color).not.toBe(dual.deleted.color);
  });

  test('색이 아닌 선언은 값이 유지된다', () => {
    // 글꼴·줄간격까지 건드리면 코드 블록의 조판이 통째로 흔들린다.
    expect(dual['code[class*="language-"]'].fontFamily).toBe(
      vscDarkPlus['code[class*="language-"]'].fontFamily,
    );
  });
});

/** WCAG 상대 휘도 — 채널은 sRGB 전달 함수를 거친다. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map(i => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('코드 색의 대비', () => {
  // 코드 글자는 표면 위에, 주석·메타는 탭 바(chrome) 위에도 앉을 수 있다. 주석은 눈에 덜 띄게
  // 두는 색이라 AA(4.5)에 여유를 두고 4.8 이상으로 잠근다(표면이 밝아질 때 먼저 무너지는 자리).
  const THEMES: readonly BlogTheme[] = ['light', 'dark'];
  const SYNTAX: readonly BlogColorName[] = [
    'code.fg',
    'code.comment',
    'code.keyword',
    'code.keywordFlow',
    'code.string',
    'code.number',
    'code.function',
    'code.class',
    'code.property',
    'code.tag',
    'code.inserted',
    'code.deleted',
    'code.regex',
    'code.selector',
    'code.muted',
  ];

  for (const theme of THEMES) {
    const surface = themeColor(theme, 'code.surface');

    test(`${theme}: 모든 구문 색이 코드 표면 위에서 AA(4.5)를 넘는다`, () => {
      const failing = SYNTAX.filter(
        name => contrast(themeColor(theme, name), surface) < 4.5,
      );

      expect(failing).toEqual([]);
    });

    test(`${theme}: 주석은 코드 표면과 탭 바 위에서 4.8 이상이다`, () => {
      const comment = themeColor(theme, 'code.comment');

      expect(contrast(comment, surface)).toBeGreaterThanOrEqual(4.8);
      expect(
        contrast(comment, themeColor(theme, 'code.chrome')),
      ).toBeGreaterThanOrEqual(4.8);
    });
  }

  test('다크 표면은 본문 지면과 갈라져 상자가 면으로 읽힌다', () => {
    expect(themeColor('dark', 'code.surface')).not.toBe(
      themeColor('dark', 'paper.50'),
    );
  });

  test('코드 탭 바(chrome)는 표면과 다른 면이다', () => {
    for (const theme of THEMES) {
      expect(themeColor(theme, 'code.chrome')).not.toBe(
        themeColor(theme, 'code.surface'),
      );
    }
  });
});
