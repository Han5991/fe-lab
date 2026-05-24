import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDaysISO,
  diffDaysISO,
  formatMonthDayISO,
  getKSTDateISO,
  parseScheduledDateKST,
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

// --- parseScheduledDateKST ---

test('parseScheduledDateKST: YYYY-MM-DD는 KST 자정(UTC 전날 15:00)으로 파싱', () => {
  // '2026-05-24' (시간 없음) → KST 2026-05-24 00:00:00 = UTC 2026-05-23 15:00:00
  const d = parseScheduledDateKST('2026-05-24');
  assert.equal(d.toISOString(), '2026-05-23T15:00:00.000Z');
});

test('parseScheduledDateKST: YYYY-MM-DD는 UTC 자정이 아닌 KST 자정', () => {
  // UTC 자정이라면 '2026-05-24T00:00:00.000Z'가 되지만,
  // KST 자정이므로 UTC 기준 9시간 빠른 '2026-05-23T15:00:00.000Z'여야 합니다.
  const d = parseScheduledDateKST('2026-05-24');
  assert.notEqual(d.toISOString(), '2026-05-24T00:00:00.000Z');
  assert.equal(d.toISOString(), '2026-05-23T15:00:00.000Z');
});

test('parseScheduledDateKST: offset 포함 ISO 8601은 그대로 파싱', () => {
  // +09:00 offset 포함 → KST 2026-05-24 09:00:00 = UTC 2026-05-24 00:00:00
  const d = parseScheduledDateKST('2026-05-24T09:00:00+09:00');
  assert.equal(d.toISOString(), '2026-05-24T00:00:00.000Z');
});

test('parseScheduledDateKST: UTC(Z) offset은 그대로 파싱', () => {
  // Z suffix → UTC 그대로 해석
  const d = parseScheduledDateKST('2026-05-24T00:00:00Z');
  assert.equal(d.toISOString(), '2026-05-24T00:00:00.000Z');
});

test('parseScheduledDateKST: 날짜 경계 — 연말/월말', () => {
  // 2026-12-31 KST 자정 = 2026-12-30 15:00 UTC
  const d = parseScheduledDateKST('2026-12-31');
  assert.equal(d.toISOString(), '2026-12-30T15:00:00.000Z');
});
