import { expect, test } from 'vitest';
import {
  addDaysISO,
  diffDaysISO,
  formatMonthDayISO,
  getKSTCutoffDate,
  getKSTDateISO,
  hasAmbiguousTimezone,
  msUntilKSTMidnight,
  parseScheduledDateKST,
} from './dates';

test('getKSTDateISO: KST 자정 직후', () => {
  // 2026-05-09 00:00 KST = 2026-05-08 15:00 UTC
  const d = new Date('2026-05-08T15:00:00Z');
  expect(getKSTDateISO(d)).toBe('2026-05-09');
});

test('getKSTDateISO: KST 자정 직전', () => {
  // 2026-05-08 23:59 KST = 2026-05-08 14:59 UTC
  const d = new Date('2026-05-08T14:59:00Z');
  expect(getKSTDateISO(d)).toBe('2026-05-08');
});

test('getKSTDateISO: UTC 자정도 KST는 다음 날', () => {
  // 2026-05-09 00:00 UTC = 2026-05-09 09:00 KST → 같은 날 오전
  const d = new Date('2026-05-09T00:00:00Z');
  expect(getKSTDateISO(d)).toBe('2026-05-09');
});

test('addDaysISO: 양수 시 날짜 증가', () => {
  expect(addDaysISO('2026-05-09', 7)).toBe('2026-05-16');
});

test('addDaysISO: 음수 시 날짜 감소', () => {
  expect(addDaysISO('2026-05-09', -7)).toBe('2026-05-02');
});

test('addDaysISO: 월 경계 통과', () => {
  expect(addDaysISO('2026-05-01', -1)).toBe('2026-04-30');
  expect(addDaysISO('2026-04-30', 1)).toBe('2026-05-01');
});

test('addDaysISO: 윤년 2월 경계', () => {
  // 2024는 윤년 → 2/29 존재
  expect(addDaysISO('2024-02-28', 1)).toBe('2024-02-29');
  expect(addDaysISO('2024-02-29', 1)).toBe('2024-03-01');
  // 2026은 평년 → 2/28 다음 = 3/1
  expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01');
});

test('diffDaysISO: 같은 날은 0', () => {
  expect(diffDaysISO('2026-05-09', '2026-05-09')).toBe(0);
});

test('diffDaysISO: b - a 형태로 양수', () => {
  expect(diffDaysISO('2026-05-01', '2026-05-09')).toBe(8);
});

test('diffDaysISO: b가 더 이전이면 음수', () => {
  expect(diffDaysISO('2026-05-09', '2026-05-01')).toBe(-8);
});

test('formatMonthDayISO: 한 자리 월/일은 zero-pad 없이', () => {
  expect(formatMonthDayISO('2026-05-09')).toBe('5/9');
  expect(formatMonthDayISO('2026-12-31')).toBe('12/31');
  expect(formatMonthDayISO('2026-01-01')).toBe('1/1');
});

// --- parseScheduledDateKST ---

test('parseScheduledDateKST: YYYY-MM-DD는 KST 자정(UTC 전날 15:00)으로 파싱', () => {
  // '2026-05-24' (시간 없음) → KST 2026-05-24 00:00:00 = UTC 2026-05-23 15:00:00
  const d = parseScheduledDateKST('2026-05-24');
  expect(d.toISOString()).toBe('2026-05-23T15:00:00.000Z');
});

test('parseScheduledDateKST: YYYY-MM-DD는 UTC 자정이 아닌 KST 자정', () => {
  // UTC 자정이라면 '2026-05-24T00:00:00.000Z'가 되지만,
  // KST 자정이므로 UTC 기준 9시간 빠른 '2026-05-23T15:00:00.000Z'여야 합니다.
  const d = parseScheduledDateKST('2026-05-24');
  expect(d.toISOString()).not.toBe('2026-05-24T00:00:00.000Z');
  expect(d.toISOString()).toBe('2026-05-23T15:00:00.000Z');
});

test('parseScheduledDateKST: offset 포함 ISO 8601은 그대로 파싱', () => {
  // +09:00 offset 포함 → KST 2026-05-24 09:00:00 = UTC 2026-05-24 00:00:00
  const d = parseScheduledDateKST('2026-05-24T09:00:00+09:00');
  expect(d.toISOString()).toBe('2026-05-24T00:00:00.000Z');
});

test('parseScheduledDateKST: UTC(Z) offset은 그대로 파싱', () => {
  // Z suffix → UTC 그대로 해석
  const d = parseScheduledDateKST('2026-05-24T00:00:00Z');
  expect(d.toISOString()).toBe('2026-05-24T00:00:00.000Z');
});

test('parseScheduledDateKST: 날짜 경계 — 연말/월말', () => {
  // 2026-12-31 KST 자정 = 2026-12-30 15:00 UTC
  const d = parseScheduledDateKST('2026-12-31');
  expect(d.toISOString()).toBe('2026-12-30T15:00:00.000Z');
});

// --- hasAmbiguousTimezone ---

test('hasAmbiguousTimezone: 날짜만(YYYY-MM-DD)은 안전', () => {
  expect(hasAmbiguousTimezone('2026-06-01')).toBe(false);
});

test('hasAmbiguousTimezone: offset(+09:00) 명시 datetime은 안전', () => {
  expect(hasAmbiguousTimezone('2026-06-01T09:00:00+09:00')).toBe(false);
});

test('hasAmbiguousTimezone: UTC(Z) datetime은 안전', () => {
  expect(hasAmbiguousTimezone('2026-06-01T09:00:00Z')).toBe(false);
});

test('hasAmbiguousTimezone: offset 없는 datetime은 모호(true)', () => {
  // 0e2df5a 회귀 클래스 — 빌드 서버(UTC)와 개발 머신(KST)에서 ~9시간 어긋남
  expect(hasAmbiguousTimezone('2026-06-01T09:00:00')).toBe(true);
  expect(hasAmbiguousTimezone('2026-06-01T09:00')).toBe(true);
});

test('hasAmbiguousTimezone: ±HHMM(콜론 없음) offset도 안전', () => {
  expect(hasAmbiguousTimezone('2026-06-01T09:00:00+0900')).toBe(false);
});

test('hasAmbiguousTimezone: 공백 구분 datetime도 offset 없으면 모호', () => {
  expect(hasAmbiguousTimezone('2026-06-01 09:00:00')).toBe(true);
});

test('hasAmbiguousTimezone: 비표준 소문자 z도 offset으로 인정(false-positive 방지)', () => {
  // 소문자 z는 ISO 표준은 아니나 Date.parse가 UTC로 받아들이므로 모호하지 않다.
  expect(hasAmbiguousTimezone('2026-06-01T09:00:00z')).toBe(false);
});

test('getKSTCutoffDate: 7days', () => {
  expect(getKSTCutoffDate('7days', '2026-05-25')).toBe('2026-05-18');
});

test('getKSTCutoffDate: 30days', () => {
  expect(getKSTCutoffDate('30days', '2026-05-25')).toBe('2026-04-25');
});

test('getKSTCutoffDate: 월 경계 — 30days가 전월로 넘어감', () => {
  expect(getKSTCutoffDate('30days', '2026-01-15')).toBe('2025-12-16');
});

test('getKSTCutoffDate: 연 경계 — 7days가 전년 마지막 주로 넘어감', () => {
  expect(getKSTCutoffDate('7days', '2027-01-03')).toBe('2026-12-27');
});

test('getKSTCutoffDate: todayKST 미제공 시 현재 KST 기준', () => {
  // 시각 의존이라 정확한 값 비교 대신 cutoff + 7 == today 만 검증
  const cutoff = getKSTCutoffDate('7days');
  const today = getKSTDateISO();
  expect(addDaysISO(cutoff, 7)).toBe(today);
});

// --- msUntilKSTMidnight ---

test('msUntilKSTMidnight: KST 23:00이면 1시간 + 60초', () => {
  // KST 2026-05-08 23:00 = UTC 14:00 → 다음 자정까지 1시간
  const ms = msUntilKSTMidnight(new Date('2026-05-08T14:00:00Z'));
  expect(ms).toBe(60 * 60 * 1000 + 60_000);
});

test('msUntilKSTMidnight: KST 00:01이면 거의 24시간(정확히 24h - 1min + 60s)', () => {
  // KST 2026-05-09 00:01 = UTC 2026-05-08 15:01 → 다음 자정까지 23h59m
  const ms = msUntilKSTMidnight(new Date('2026-05-08T15:01:00Z'));
  expect(ms).toBe(24 * 60 * 60 * 1000); // (86400000 - 60000) + 60000
});

test('msUntilKSTMidnight: KST 자정 정각이면 60초만(경계 비퇴행)', () => {
  // KST 2026-05-09 00:00:00 = UTC 2026-05-08 15:00:00 → 이미 자정이라 여유 60초만
  const ms = msUntilKSTMidnight(new Date('2026-05-08T15:00:00Z'));
  expect(ms).toBe(60_000);
});
