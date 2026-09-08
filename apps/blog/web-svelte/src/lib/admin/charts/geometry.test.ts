import { expect, test } from 'vitest';
import {
  DEFAULT_BOX,
  areaPath,
  linePath,
  project,
  scaleMax,
  thinLabels,
  yTicks,
  type Point,
} from './geometry.ts';

/**
 * 차트 계산 계약.
 *
 * 여기가 깨지면 화면에는 **아무것도 안 그려지거나** 선이 엉뚱한 데 있는데,
 * 빌드도 `check-seo`도 통과한다. 특히 빈 계열·전부 0은 데이터가 없는 새
 * 사이트의 첫 화면이라 실제로 자주 지나간다.
 */

const points = (...values: number[]): Point[] =>
  values.map((value, i) => ({ label: `d${i}`, value }));

test('전부 0인 계열에서도 좌표가 NaN이 되지 않는다', () => {
  // 그냥 max로 나누면 0/0 = NaN이 되고 path가 통째로 사라진다.
  const coords = project(points(0, 0, 0), DEFAULT_BOX);
  for (const [x, y] of coords) {
    expect(Number.isFinite(x), `x=${x}`).toBe(true);
    expect(Number.isFinite(y), `y=${y}`).toBe(true);
  }
  expect(scaleMax([0, 0])).toBe(1);
});

test('빈 계열은 빈 path다 — 던지지 않는다', () => {
  expect(linePath([], DEFAULT_BOX)).toBe('');
  expect(areaPath([], DEFAULT_BOX)).toBe('');
  expect(project([], DEFAULT_BOX)).toStrictEqual([]);
});

test('점이 하나면 가로 가운데에 둔다', () => {
  // 0으로 나누면(step = innerW / 0) x가 NaN이 된다.
  const [first] = project(points(5), DEFAULT_BOX);
  const innerW = DEFAULT_BOX.width - DEFAULT_BOX.padLeft - DEFAULT_BOX.padRight;
  expect(first?.[0]).toBe(DEFAULT_BOX.padLeft + innerW / 2);
});

test('최댓값은 위, 0은 바닥에 붙는다', () => {
  const coords = project(points(0, 10), DEFAULT_BOX);
  const floor = DEFAULT_BOX.height - DEFAULT_BOX.padBottom;
  expect(coords[0]?.[1]).toBe(floor);
  expect(coords[1]?.[1]).toBe(DEFAULT_BOX.padTop);
});

test('영역 path는 바닥까지 닫힌다', () => {
  const d = areaPath(points(1, 2), DEFAULT_BOX);
  expect(d.startsWith('M')).toBe(true);
  expect(d.endsWith('Z')).toBe(true);
  // 닫는 두 점의 y는 바닥이다.
  const floor = DEFAULT_BOX.height - DEFAULT_BOX.padBottom;
  expect(d).toContain(`${floor} L`);
});

test('y 눈금은 0에서 시작해 상한에서 끝난다', () => {
  const ticks = yTicks(points(0, 40, 100), 4);
  expect(ticks[0]).toBe(0);
  expect(ticks.at(-1)).toBe(100);
  expect(ticks).toHaveLength(5);
});

test('x 라벨은 솎아 내되 처음과 끝은 남긴다', () => {
  const flags = thinLabels(points(...Array<number>(30).fill(1)), 6);
  expect(flags[0]).toBe(true);
  expect(flags.at(-1)).toBe(true);
  expect(flags.filter(Boolean).length).toBeLessThanOrEqual(7);
  // 개수가 적으면 전부 남긴다.
  expect(thinLabels(points(1, 2, 3), 6)).toStrictEqual([true, true, true]);
});
