import { expect, test } from 'vitest';
import { HEADER_OFFSET, activeSpan, buildPath } from './tocRail';

const VIEWPORT = 1000;
/** 20% 기준선 = 200px. */
const rect = (top: number, height = 30) => ({ top, bottom: top + height });

test('기준선을 마지막으로 지난 항목이 현재 항목이다', () => {
  const span = activeSpan([rect(-500), rect(-100), rect(600)], VIEWPORT);
  expect(span.current).toBe(1);
});

test('하나도 안 지났으면 첫 항목이다', () => {
  expect(activeSpan([rect(400), rect(700)], VIEWPORT).current).toBe(0);
});

test('구간은 화면에 실제로 보이는 헤딩의 처음과 끝이다', () => {
  const span = activeSpan(
    [rect(-400), rect(300), rect(600), rect(1400)],
    VIEWPORT,
  );
  expect(span.range).toStrictEqual([1, 2]);
});

test('헤더에 가리는 헤딩은 보이는 것으로 치지 않는다', () => {
  // HEADER_OFFSET(100)보다 위에 있으면 화면 안이어도 가려져 있다.
  const span = activeSpan([rect(HEADER_OFFSET - 20), rect(500)], VIEWPORT);
  expect(span.range).toStrictEqual([1, 1]);
});

test('헤딩이 하나도 안 보이면 방금 지나온 절 하나만 비춘다', () => {
  // 긴 절의 한복판 — 위 헤딩은 지나갔고 아래 헤딩은 아직 멀다.
  const span = activeSpan([rect(-900), rect(2000)], VIEWPORT);
  expect(span.current).toBe(0);
  expect(span.range).toStrictEqual([0, 0]);
});

test('요소를 못 찾은 항목은 건너뛴다', () => {
  const span = activeSpan([null, rect(-100), null], VIEWPORT);
  expect(span.current).toBe(1);
});

test('빈 목록도 견딘다', () => {
  expect(activeSpan([], VIEWPORT)).toStrictEqual({ current: 0, range: [0, 0] });
  expect(buildPath([])).toBe('');
});
