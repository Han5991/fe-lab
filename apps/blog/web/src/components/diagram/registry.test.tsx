/**
 * 레지스트리는 "이름 목록(domain)"과 "컴포넌트 맵(UI)" 두 파일에 걸쳐 있다.
 * 타입이 한쪽만 고치는 실수를 막아주지만, 목록이 비거나 이름이 조용히
 * 사라지는 것까지는 잡지 못하므로 여기서 잠근다.
 */
import { describe, expect, test } from 'vitest';
import { DIAGRAMS, DIAGRAM_NAMES, getDiagram } from './registry';

describe('diagram registry', () => {
  test('이름 목록과 컴포넌트 맵의 키가 정확히 일치한다', () => {
    expect(Object.keys(DIAGRAMS).sort()).toEqual([...DIAGRAM_NAMES].sort());
  });

  test('등록된 이름은 컴포넌트를 돌려준다', () => {
    for (const name of DIAGRAM_NAMES) {
      expect(getDiagram(name)).toBe(DIAGRAMS[name]);
    }
  });

  test('미등록 이름·undefined는 throw 없이 undefined', () => {
    expect(getDiagram('없는-다이어그램')).toBeUndefined();
    expect(getDiagram(undefined)).toBeUndefined();
    expect(getDiagram('')).toBeUndefined();
  });

  test('홈 대표 글 썸네일(ParallelThumb)은 등록하지 않는다', () => {
    // 본문에서 부를 수 있게 되면 뜻 없는 그림이 글에 박힌다.
    expect(DIAGRAM_NAMES).not.toContain('parallel-thumb');
  });
});
