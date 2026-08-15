/**
 * 레이아웃 그리드의 계약.
 *
 * 이 파일이 지키는 건 "거터는 레일 **바깥**"이라는 규칙 하나다. 둘을 한
 * 요소에 얹으면 콘텐츠 폭이 조용히 `레일 − 거터×2`로 줄어드는데, 화면은
 * 여전히 그럴듯해 보여서 눈으로는 안 잡힌다(정리 전 홈 640 / `/series` 576이
 * 정확히 그 상태였다). 사이트 전체 폭이 이 파일 하나에 걸려 있으므로
 * 구조를 테스트로 고정한다.
 */
import { describe, expect, test } from 'vitest';
import { render } from '@testing-library/react';

import { Rail, railGutter, railColumn } from './Rail';

/** Panda는 클래스를 원자 단위로 쪼개 내보내므로 토큰 단위로 비교한다. */
const classes = (el: Element) =>
  new Set(el.className.split(/\s+/).filter(Boolean));
const hasAll = (el: Element, cls: string) =>
  cls.split(/\s+/).every(c => classes(el).has(c));

const shell = (ui: React.ReactElement) => {
  const { container } = render(ui);
  const outer = container.firstElementChild as HTMLElement;
  return { outer, inner: outer.firstElementChild as HTMLElement };
};

describe('railColumn', () => {
  test('세 레일이 서로 다른 폭을 낸다', () => {
    const all = (['wide', 'text', 'form'] as const).map(width =>
      railColumn({ width }),
    );
    expect(new Set(all).size).toBe(3);
  });

  test('폭을 고르지 않으면 text다 (defaultVariants)', () => {
    expect(railColumn()).toBe(railColumn({ width: 'text' }));
  });

  // 아래 구조 검사들은 전부 클래스 문자열 비교다. Panda 추출이 실패해 빈
  // 문자열이 나오면 그 검사들이 "통과"하면서 아무것도 안 보게 되므로,
  // 여기서 먼저 막는다.
  test('클래스 문자열이 비어 있지 않다', () => {
    expect(railGutter).not.toBe('');
    for (const w of ['wide', 'text', 'form'] as const) {
      expect(railColumn({ width: w })).not.toBe('');
    }
  });
});

describe('Rail', () => {
  test('거터는 바깥 요소, 레일은 안쪽 요소에 붙는다', () => {
    const { outer, inner } = shell(<Rail width="wide">본문</Rail>);

    expect(hasAll(outer, railGutter)).toBe(true);
    expect(hasAll(inner, railColumn({ width: 'wide' }))).toBe(true);
  });

  // 둘이 한 요소에 얹히면 `box-sizing: border-box` 때문에 콘텐츠 폭이
  // 거터만큼 깎인다. 레일 토큰이 곧 실제 글줄 폭이라는 전제가 깨진다.
  test('거터와 레일이 같은 요소에 얹히지 않는다', () => {
    const { outer, inner } = shell(<Rail width="text">본문</Rail>);

    expect(hasAll(outer, railColumn({ width: 'text' }))).toBe(false);
    expect(hasAll(inner, railGutter)).toBe(false);
  });

  test('기본 폭은 text다', () => {
    const { inner } = shell(<Rail>본문</Rail>);

    expect(hasAll(inner, railColumn({ width: 'text' }))).toBe(true);
  });

  // py·display:grid 같은 콘텐츠 스타일은 레일에 얹혀야 한다. 거터 쪽에
  // 붙으면 그리드 칼럼이 레일이 아니라 화면 전체를 기준으로 잡힌다.
  test('className은 거터가 아니라 레일에 붙는다', () => {
    const { outer, inner } = shell(
      <Rail width="wide" className="page-grid">
        본문
      </Rail>,
    );

    expect(classes(outer).has('page-grid')).toBe(false);
    expect(classes(inner).has('page-grid')).toBe(true);
  });

  test('children은 레일 안에 들어간다', () => {
    const { inner } = shell(<Rail>본문</Rail>);

    expect(inner.textContent).toBe('본문');
  });
});
