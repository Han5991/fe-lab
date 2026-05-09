import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDaysISO,
  diffDaysISO,
  formatMonthDayISO,
  getKSTDateISO,
} from './dates';

test('getKSTDateISO: KST 자정 직후', () => {
  // 2026-05-09 00:00 KST = 2026-05-08 15:00 UTC
  const d = new Date('2026-05-08T15:00:00Z');
  assert.equal(getKSTDateISO(d), '2026-05-09');
});

test('getKSTDateISO: KST 자정 직전', () => {
  // 2026-05-08 23:59 KST = 2026-05-08 14:59 UTC
  const d = new Date('2026-05-08T14:59:00Z');
  assert.equal(getKSTDateISO(d), '2026-05-08');
});

test('getKSTDateISO: UTC 자정도 KST는 다음 날', () => {
  // 2026-05-09 00:00 UTC = 2026-05-09 09:00 KST → 같은 날 오전
  const d = new Date('2026-05-09T00:00:00Z');
  assert.equal(getKSTDateISO(d), '2026-05-09');
});

test('addDaysISO: 양수 시 날짜 증가', () => {
  assert.equal(addDaysISO('2026-05-09', 7), '2026-05-16');
});

test('addDaysISO: 음수 시 날짜 감소', () => {
  assert.equal(addDaysISO('2026-05-09', -7), '2026-05-02');
});

test('addDaysISO: 월 경계 통과', () => {
  assert.equal(addDaysISO('2026-05-01', -1), '2026-04-30');
  assert.equal(addDaysISO('2026-04-30', 1), '2026-05-01');
});

test('addDaysISO: 윤년 2월 경계', () => {
  // 2024는 윤년 → 2/29 존재
  assert.equal(addDaysISO('2024-02-28', 1), '2024-02-29');
  assert.equal(addDaysISO('2024-02-29', 1), '2024-03-01');
  // 2026은 평년 → 2/28 다음 = 3/1
  assert.equal(addDaysISO('2026-02-28', 1), '2026-03-01');
});

test('diffDaysISO: 같은 날은 0', () => {
  assert.equal(diffDaysISO('2026-05-09', '2026-05-09'), 0);
});

test('diffDaysISO: b - a 형태로 양수', () => {
  assert.equal(diffDaysISO('2026-05-01', '2026-05-09'), 8);
});

test('diffDaysISO: b가 더 이전이면 음수', () => {
  assert.equal(diffDaysISO('2026-05-09', '2026-05-01'), -8);
});

test('formatMonthDayISO: 한 자리 월/일은 zero-pad 없이', () => {
  assert.equal(formatMonthDayISO('2026-05-09'), '5/9');
  assert.equal(formatMonthDayISO('2026-12-31'), '12/31');
  assert.equal(formatMonthDayISO('2026-01-01'), '1/1');
});
