import { describe, expect, test } from 'vitest';
import {
  matchesAllTokens,
  pickContentSnippet,
  searchTokens,
  splitByTokens,
} from './searchText';

describe('searchTokens', () => {
  test.each([
    ['  React   Hooks ', ['react', 'hooks']],
    ['   ', []],
    ['react React', ['react']],
  ])('%j → %j (공백을 걷고, 소문자로, 한 번씩)', (query, tokens) => {
    expect(searchTokens(query)).toEqual(tokens);
  });
});

describe('matchesAllTokens', () => {
  // 검색어 전체를 한 덩어리로 찾으면 필드에 흩어진 낱말을 놓친다.
  test.each([
    [['Custom Hooks 정리', 'react'], ['hooks', 'react'], true],
    [['Custom Hooks'], ['hooks', 'vue'], false],
  ])('%j에서 %j를 전부 찾으면 %s', (fields, tokens, expected) => {
    expect(matchesAllTokens(fields, tokens)).toBe(expected);
  });
});

describe('splitByTokens', () => {
  test.each([
    [
      'Use React Hooks',
      ['react', 'hooks'],
      [
        { text: 'Use ', match: false },
        { text: 'React', match: true },
        { text: ' ', match: false },
        { text: 'Hooks', match: true },
      ],
    ],
    // 겹치는 낱말은 한 조각으로 합친다.
    ['reaction', ['react', 'action'], [{ text: 'reaction', match: true }]],
    [
      'a-a',
      ['a'],
      [
        { text: 'a', match: true },
        { text: '-', match: false },
        { text: 'a', match: true },
      ],
    ],
    ['text', [], [{ text: 'text', match: false }]],
  ])(
    '%j를 %j로 나누면 대소문자 그대로 순서대로 온다',
    (text, tokens, parts) => {
      expect(splitByTokens(text, tokens)).toEqual(parts);
    },
  );
});

describe('pickContentSnippet', () => {
  const content = `${'가'.repeat(100)}needle${'나'.repeat(100)}`;

  test('가장 먼저 걸린 낱말 주변을 잘라 말줄임표를 달고, 없으면 앞부분 140자', () => {
    expect(pickContentSnippet(content, ['needle'], 10)).toBe(
      `…${'가'.repeat(10)}needle${'나'.repeat(10)}…`,
    );
    expect(pickContentSnippet(content, ['없음'])).toBe(content.slice(0, 140));
  });
});
