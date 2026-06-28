import { createElement } from 'react';
import { describe, expect, test } from 'vitest';

import { codeText, isBlockCode } from './markdownCode';

describe('codeText', () => {
  test('문자열은 그대로 반환', () => {
    expect(codeText('foo')).toBe('foo');
  });
  test('배열은 재귀적으로 이어붙임', () => {
    expect(codeText(['a', 'b', 'c'])).toBe('abc');
  });
  test('엘리먼트는 children 텍스트를 추출', () => {
    expect(codeText(createElement('em', null, 'foo'))).toBe('foo');
  });
  test('중첩 엘리먼트·배열 혼합도 평탄화', () => {
    const node = createElement(
      'span',
      null,
      'a',
      createElement('em', null, 'b'),
      'c\n',
    );
    expect(codeText(node)).toBe('abc\n');
  });
  test('number는 String으로 변환(FileTree extractText와 동작 통일)', () => {
    expect(codeText(42)).toBe('42');
    expect(codeText(0)).toBe('0');
  });
  test('null/undefined/boolean leaf는 빈 문자열', () => {
    expect(codeText(null)).toBe('');
    expect(codeText(undefined)).toBe('');
    expect(codeText(true)).toBe('');
  });
});

describe('isBlockCode', () => {
  test('language-* className이면 children과 무관하게 블록', () => {
    expect(isBlockCode('inline-no-newline', 'language-ts')).toBe(true);
  });
  test('className 없고 텍스트가 \\n으로 끝나면 블록(fenced)', () => {
    expect(isBlockCode('const x = 1\n')).toBe(true);
  });
  test('className 없고 \\n으로 끝나지 않으면 인라인', () => {
    expect(isBlockCode('inline code')).toBe(false);
  });
  test('language- 접두가 아닌 className은 children 기준으로 판별', () => {
    expect(isBlockCode('x', 'hljs token')).toBe(false);
  });

  // 회귀(claude 리뷰 🔴): raw HTML <code>의 children이 문자열이 아니라 배열/엘리먼트로
  // 와도 codeText로 추출해 \n 종료를 판별해야 한다. CodeBlock과 markdownBlocks가 이
  // 함수로 통일돼, 한쪽만 인라인으로 보는 divergence(=hydration mismatch)를 막는다.
  test('회귀: 배열 children([<em>, "\\n"])도 codeText로 추출해 블록 판정', () => {
    const children = [createElement('em', null, 'foo'), '\n'];
    expect(isBlockCode(children)).toBe(true);
  });
  test('회귀: 엘리먼트 children이 \\n으로 끝나지 않으면 인라인', () => {
    const children = createElement('em', null, 'inline');
    expect(isBlockCode(children)).toBe(false);
  });
});
