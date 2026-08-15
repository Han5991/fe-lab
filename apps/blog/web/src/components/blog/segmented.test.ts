/**
 * segmentedItem recipe의 계약.
 *
 * 이 recipe는 ViewToggle(tab)·SortRadio(radio)가 공유하는 공용 모듈이라,
 * variant 조합이 실제로 서로 다른 스타일을 내는지와 "kind는 항상 명시한다"는
 * 주석 계약(segmented.ts)을 테스트로 고정해 둔다. kind에 canonical 기본값이
 * 없어 recipe가 누락을 강제하지 못하기 때문이다.
 */
import { describe, expect, test } from 'vitest';

import { segmentedItem } from './segmented';

const classes = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

describe('segmentedItem', () => {
  test('kind × active 네 조합이 전부 서로 다른 클래스를 낸다', () => {
    const all = (['tab', 'radio'] as const).flatMap(kind =>
      [true, false].map(active => segmentedItem({ kind, active })),
    );
    expect(new Set(all).size).toBe(4);
    for (const c of all) expect(c).not.toBe('');
  });

  test('active 기본값은 false다 (defaultVariants)', () => {
    expect(segmentedItem({ kind: 'tab' })).toBe(
      segmentedItem({ kind: 'tab', active: false }),
    );
    expect(segmentedItem({ kind: 'radio' })).toBe(
      segmentedItem({ kind: 'radio', active: false }),
    );
  });

  // kind를 빠뜨린 호출은 컴파일이 통과하지만 base + active 색만 나온다 —
  // 타이포그래피·transition·hover가 통째로 빠진다. 그 누락 동작 자체를
  // 계약으로 고정한다: 이 테스트가 깨지면 segmented.ts의 경고 주석도
  // 함께 손봐야 한다.
  test('kind 누락 시 결과는 kind 지정 결과의 진부분집합이다', () => {
    const bare = classes(segmentedItem({ active: false }));
    const tab = classes(segmentedItem({ kind: 'tab', active: false }));

    for (const c of bare) expect(tab.has(c)).toBe(true);
    expect(tab.size).toBeGreaterThan(bare.size);
  });
});
