/**
 * 구문 강조 언어 목록의 단일 출처가 실제로 단일한지 지키는 테스트.
 *
 * CodeBlock은 번들 크기 때문에 refractor 전 언어 대신 PrismLight + 필요한
 * 언어만 등록한다. 그 목록은 두 곳에서 쓰인다.
 *
 *   1. CodeBlock.tsx — 실제 언어 모듈 import + 등록
 *   2. prismLanguages.ts — 데이터. validate-posts.ts가 읽어 fence 라벨을 검증
 *
 * 둘이 어긋나면 증상이 조용하다. 언어를 1에만 추가하면 lint가 멀쩡한 fence를
 * 경고하고, 2에만 추가하면 lint는 통과하는데 실제로는 강조가 안 된다.
 * 그래서 키 집합이 같은지 여기서 못박는다.
 */
import { describe, expect, test } from 'vitest';
import { LANGUAGE_MODULES } from './CodeBlock';
import {
  PRISM_LANGUAGES,
  SUPPORTED_FENCE_LABELS,
  PLAIN_FENCE_LABELS,
} from './prismLanguages';

describe('prism 언어 등록 목록', () => {
  test('CodeBlock이 등록하는 언어와 prismLanguages의 키가 순서까지 일치한다', () => {
    // 순서까지 보는 이유: 등록 순서가 렌더 결과를 바꾼다(아래 테스트 참고).
    expect(Object.keys(LANGUAGE_MODULES)).toEqual(Object.keys(PRISM_LANGUAGES));
  });

  test('javascript 문법 확장이 typescript보다 먼저 등록된다', () => {
    // typescript는 javascript 문법을 복제해 만들어진다. 확장이 뒤에 오면
    // .ts 코드 블록에서 타입 이름(known-class-name) 색이 빠진다.
    const order = Object.keys(LANGUAGE_MODULES);
    for (const ext of ['js-extras', 'jsdoc']) {
      expect(
        order.indexOf(ext),
        `${ext}는 typescript보다 먼저 등록돼야 한다`,
      ).toBeLessThan(order.indexOf('typescript'));
    }
  });

  test('등록된 모듈이 모두 실제 refractor 언어 함수다', () => {
    for (const [name, mod] of Object.entries(LANGUAGE_MODULES)) {
      expect(typeof mod, `${name} 모듈`).toBe('function');
      expect(
        (mod as { displayName?: string }).displayName,
        `${name} 이름`,
      ).toBe(name);
    }
  });

  test('별칭과 평문 라벨이 허용 목록에 포함된다', () => {
    for (const alias of Object.values(PRISM_LANGUAGES).flat()) {
      expect(SUPPORTED_FENCE_LABELS.has(alias), `별칭 ${alias}`).toBe(true);
    }
    for (const plain of PLAIN_FENCE_LABELS) {
      expect(SUPPORTED_FENCE_LABELS.has(plain), `평문 ${plain}`).toBe(true);
    }
  });

  test('mermaid는 별도 렌더러로 처리하므로 lint가 경고하지 않는다', () => {
    expect(SUPPORTED_FENCE_LABELS.has('mermaid')).toBe(true);
  });

  test('문법 확장 전용 항목은 fence 라벨로 허용하지 않는다', () => {
    expect(SUPPORTED_FENCE_LABELS.has('js-extras')).toBe(false);
    expect(SUPPORTED_FENCE_LABELS.has('jsdoc')).toBe(false);
  });

  test('등록하지 않은 언어는 허용 목록에 없다 — lint가 잡아야 한다', () => {
    for (const unknown of ['python', 'rust', 'go', 'code']) {
      expect(SUPPORTED_FENCE_LABELS.has(unknown), unknown).toBe(false);
    }
  });
});
