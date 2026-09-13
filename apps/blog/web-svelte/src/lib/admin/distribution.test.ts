import { expect, test } from 'vitest';
import type { DowDistribution, HourlyDistribution } from '@blog/analytics';
import { dowPoints, hourlyPoints } from './distribution.ts';

/**
 * 분포 축 계약.
 *
 * RPC가 행이 있는 구간만 주므로, 채우지 않으면 축이 접힌다 — 화면에는 막대가
 * 그려지고 **자리만 틀린다.** 눈으로는 "이 시간대엔 조회가 없나 보다"와
 * 구분되지 않는다.
 */

test('시간대는 언제나 24칸이고 빈 시간은 0이다', () => {
  const points = hourlyPoints([
    { hour: 3, view_count: 5 },
    { hour: 17, view_count: 2 },
  ] as HourlyDistribution[]);
  expect(points).toHaveLength(24);
  expect(points[0]).toStrictEqual({ label: '0', value: 0 });
  expect(points[3]?.value).toBe(5);
  expect(points[17]?.value).toBe(2);
  expect(points[23]?.value).toBe(0);
});

test('요일은 월요일부터 7칸이다', () => {
  // RPC의 dow는 0=일이라 그대로 쓰면 일요일이 맨 앞에 온다.
  const points = dowPoints([
    { dow: 0, view_count: 7 },
    { dow: 1, view_count: 1 },
  ] as DowDistribution[]);
  expect(points.map(p => p.label)).toStrictEqual([
    '월',
    '화',
    '수',
    '목',
    '금',
    '토',
    '일',
  ]);
  expect(points[0]?.value).toBe(1);
  expect(points.at(-1)?.value).toBe(7);
});

test('행이 하나도 없어도 칸은 남는다', () => {
  // 데이터가 없는 것과 그림이 안 그려진 것을 화면에서 구분할 수 있어야 한다.
  expect(hourlyPoints([])).toHaveLength(24);
  expect(dowPoints([])).toHaveLength(7);
  expect(hourlyPoints([]).every(p => p.value === 0)).toBe(true);
});
