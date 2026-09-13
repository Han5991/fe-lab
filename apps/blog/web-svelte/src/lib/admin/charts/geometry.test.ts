import { expect, test } from 'vitest';
import {
  DEFAULT_BOX,
  linePath,
  monotoneAreaPath,
  monotoneLinePath,
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
  expect(monotoneLinePath([], DEFAULT_BOX)).toBe('');
  expect(monotoneAreaPath([], DEFAULT_BOX)).toBe('');
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
  const d = monotoneAreaPath(points(1, 2), DEFAULT_BOX);
  expect(d.startsWith('M')).toBe(true);
  expect(d.endsWith('Z')).toBe(true);
  // 닫는 변의 y는 바닥이다.
  const floor = DEFAULT_BOX.height - DEFAULT_BOX.padBottom;
  expect(d).toContain(`,${floor}`);
});

test('추이 선은 곡선이고 스파크라인은 직선이다', () => {
  // Recharts `<Area type="monotone">`과 같은 곡선(`curveMonotoneX`)이라
  // 베지어 명령이 나온다. 직접 구현하면 같은 곡선을 다시 쓰는 일이 된다.
  const curved = monotoneLinePath(points(1, 5, 2, 8), DEFAULT_BOX);
  expect(curved).toContain('C');

  // 스파크라인은 React 판이 `<polyline>`이라 직선이어야 한다 — 여기에
  // 곡선을 주면 두 사이트가 오히려 갈린다.
  expect(linePath(points(1, 5, 2, 8), DEFAULT_BOX)).not.toContain('C');
});

test('점이 하나여도 곡선 path가 NaN을 내지 않는다', () => {
  // d3의 곡선 제너레이터는 점이 부족하면 퇴화한 path를 준다. 그려지는 것이
  // 없는 것은 괜찮지만 좌표에 NaN이 섞이면 SVG가 통째로 사라진다.
  const one = points(5);
  expect(monotoneLinePath(one, DEFAULT_BOX)).not.toContain('NaN');
  expect(monotoneAreaPath(one, DEFAULT_BOX)).not.toContain('NaN');
});

test('viewBox 폭이 달라져도 좌표는 폭에 비례한다', () => {
  // `preserveAspectRatio`로 늘리는 대신 viewBox 폭 자체를 실제 렌더 폭으로
  // 주기 때문에(ResponsiveContainer가 하던 일), 폭은 계산의 입력이다.
  // 늘리기로 풀면 x만 스케일되어 축 글자와 커서 원까지 가로로 늘어난다.
  const wide = { ...DEFAULT_BOX, width: 1136 };
  const [, last] = project(points(0, 10), wide);
  expect(last?.[0]).toBe(wide.width - wide.padRight);
  // 세로는 폭과 무관하다.
  expect(last?.[1]).toBe(wide.padTop);
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
