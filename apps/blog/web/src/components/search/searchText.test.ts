import { describe, expect, test } from 'vitest';
import {
  matchesAllTokens,
  pickContentSnippet,
  searchTokens,
  splitByTokens,
} from './searchText';

describe('searchTokens', () => {
  test('앞뒤 공백을 걷고 소문자 낱말로 나눈다', () => {
    expect(searchTokens('  React   Hooks ')).toEqual(['react', 'hooks']);
  });

  test('빈 검색어·공백뿐이면 낱말이 없다', () => {
    expect(searchTokens('')).toEqual([]);
    expect(searchTokens('   ')).toEqual([]);
  });

  test('같은 낱말은 한 번만', () => {
    expect(searchTokens('react React')).toEqual(['react']);
  });
});

describe('matchesAllTokens', () => {
  // 예전엔 검색어 전체를 한 덩어리로 찾아 이 글을 놓쳤다.
  test('낱말이 서로 다른 필드에 흩어져 있어도 찾는다', () => {
    expect(
      matchesAllTokens(['Custom Hooks 정리', 'react'], ['hooks', 'react']),
    ).toBe(true);
  });

  test('하나라도 없으면 거른다', () => {
    expect(matchesAllTokens(['Custom Hooks'], ['hooks', 'vue'])).toBe(false);
  });

  // 뒤 공백이 매칭을 좁히던 회귀.
  test('뒤 공백이 붙은 검색어도 같은 결과', () => {
    expect(matchesAllTokens(['React 19'], searchTokens('react '))).toBe(true);
  });
});

describe('splitByTokens', () => {
  test('걸린 조각과 아닌 조각을 순서대로, 대소문자 그대로 돌려준다', () => {
    expect(splitByTokens('Use React Hooks', ['react', 'hooks'])).toEqual([
      { text: 'Use ', match: false },
      { text: 'React', match: true },
      { text: ' ', match: false },
      { text: 'Hooks', match: true },
    ]);
  });

  test('겹치는 낱말은 한 조각으로 합친다', () => {
    expect(splitByTokens('reaction', ['react', 'action'])).toEqual([
      { text: 'reaction', match: true },
    ]);
  });

  test('같은 낱말이 여러 번 나오면 전부 표시한다', () => {
    expect(
      splitByTokens('a-a-a', ['a']).filter(part => part.match),
    ).toHaveLength(3);
  });

  test('낱말이 없으면 통째로 한 조각', () => {
    expect(splitByTokens('text', [])).toEqual([{ text: 'text', match: false }]);
  });
});

describe('pickContentSnippet', () => {
  const content = `${'가'.repeat(100)}needle${'나'.repeat(100)}`;

  test('가장 먼저 걸린 낱말 주변을 잘라 말줄임표를 단다', () => {
    const snippet = pickContentSnippet(content, ['needle'], 10);
    expect(snippet).toBe(`…${'가'.repeat(10)}needle${'나'.repeat(10)}…`);
  });

  test('걸린 낱말이 없으면 앞부분 140자', () => {
    expect(pickContentSnippet(content, ['없음'])).toBe(content.slice(0, 140));
  });
});
