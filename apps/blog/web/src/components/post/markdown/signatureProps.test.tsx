/**
 * 시그니처 컴포넌트가 공유하는 prop 파싱 규칙.
 *
 * 여기서 지키려는 건 하나다 — **글 하나의 오타가 페이지를 죽이면 안 된다.**
 * raw HTML로 쓰는 커스텀 태그라 타입 검사가 닿지 않으므로, 잘못된 입력은 전부
 * children 폴백(=null)으로 흘러야 한다.
 */
import { describe, expect, test } from 'vitest';

import {
  markdownChildren,
  optionalString,
  parseItemsProp,
} from './signatureProps';

interface Item {
  label?: string;
}

const isItem = (candidate: unknown): candidate is Item =>
  typeof candidate === 'object' &&
  candidate !== null &&
  typeof (candidate as Item).label === 'string';

describe('parseItemsProp', () => {
  test('JSON 문자열을 배열로 파싱한다', () => {
    expect(parseItemsProp('[{"label":"a"},{"label":"b"}]', isItem)).toEqual([
      { label: 'a' },
      { label: 'b' },
    ]);
  });

  test('실제 배열도 그대로 받는다(JSX 사용처)', () => {
    const items = [{ label: 'a' }];
    expect(parseItemsProp(items, isItem)).toEqual(items);
  });

  test('깨진 JSON은 throw하지 않고 null(=children 폴백)이 된다', () => {
    expect(parseItemsProp('[{label: a}', isItem)).toBeNull();
  });

  test('배열이 아닌 JSON도 null', () => {
    expect(parseItemsProp('{"label":"a"}', isItem)).toBeNull();
  });

  test('형태가 어긋난 원소만 있으면 빈 껍데기 대신 null', () => {
    expect(parseItemsProp('[1, null, "x"]', isItem)).toBeNull();
  });

  test('빈 문자열·undefined는 null', () => {
    expect(parseItemsProp('   ', isItem)).toBeNull();
    expect(parseItemsProp(undefined, isItem)).toBeNull();
  });

  test('섞여 있으면 유효한 원소만 남긴다', () => {
    expect(parseItemsProp('[{"label":"a"}, 3]', isItem)).toEqual([
      { label: 'a' },
    ]);
  });
});

describe('markdownChildren', () => {
  test('태그 사이 개행이 만든 공백 텍스트 노드를 걸러낸다', () => {
    const nodes = markdownChildren([
      '\n  ',
      <span key="a">a</span>,
      '\n',
      <span key="b">b</span>,
      '\n',
    ]);
    expect(nodes).toHaveLength(2);
  });

  test('내용이 있는 텍스트는 남긴다', () => {
    expect(markdownChildren(['  실제 텍스트 '])).toEqual(['  실제 텍스트 ']);
  });

  test('마크다운이 감싼 <p> 래퍼를 한 겹 벗긴다', () => {
    const nodes = markdownChildren(
      <p>
        <span>a</span>
        <span>b</span>
      </p>,
    );
    expect(nodes).toHaveLength(2);
  });

  test('언랩 후에도 키가 겹치지 않는다', () => {
    const nodes = markdownChildren([
      <p key="p">
        <span>a</span>
      </p>,
      <span key="s">b</span>,
    ]);
    const keys = nodes.map(node =>
      typeof node === 'object' && node !== null && 'key' in node
        ? node.key
        : null,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('optionalString', () => {
  test('빈 문자열과 비문자열은 undefined', () => {
    expect(optionalString('')).toBeUndefined();
    expect(optionalString(3)).toBeUndefined();
    expect(optionalString('a')).toBe('a');
  });
});
