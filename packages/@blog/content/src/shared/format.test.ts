import { expect, test } from 'vitest';
import { estimateReadMin, fmtDate, fmtNum } from './format.ts';

test('estimateReadMin: 빈 문자열도 최소 1분', () => {
  expect(estimateReadMin('')).toBe(1);
});

test('estimateReadMin: 짧은 문구는 1분', () => {
  expect(estimateReadMin('hello')).toBe(1);
});

test('estimateReadMin: 정확히 500자는 1분 (Math.ceil(500/500) = 1)', () => {
  expect(estimateReadMin('a'.repeat(500))).toBe(1);
});

test('estimateReadMin: 501자는 2분', () => {
  expect(estimateReadMin('a'.repeat(501))).toBe(2);
});

// 리뉴얼 디자인 시안이 홈·상세 모두 하이픈 표기라
// 점 표기를 걷어냈다. 표기가 다시 갈리지 않도록 여기서 고정한다.
test('fmtDate: ISO 하이픈 표기를 그대로 유지', () => {
  expect(fmtDate('2026-05-09')).toBe('2026-05-09');
});

test('fmtDate: null/undefined는 빈 문자열', () => {
  expect(fmtDate(null)).toBe('');
  expect(fmtDate(undefined)).toBe('');
  expect(fmtDate('')).toBe('');
});

test('fmtNum: 1000 미만은 그대로', () => {
  expect(fmtNum(0)).toBe('0');
  expect(fmtNum(1)).toBe('1');
  expect(fmtNum(999)).toBe('999');
});

test('fmtNum: 1000 경계', () => {
  // 1000 / 1000 = 1.0 → "1.0K".replace(.0K → K) = "1K"
  expect(fmtNum(1000)).toBe('1K');
});

test('fmtNum: 천 단위 — 정수 K는 trailing .0 제거', () => {
  expect(fmtNum(2000)).toBe('2K');
});

test('fmtNum: 천 단위 — 소수 1자리 유지', () => {
  expect(fmtNum(1234)).toBe('1.2K');
  expect(fmtNum(84210)).toBe('84.2K');
});

test('fmtNum: 999_500 이상은 1000K로 빠지지 않고 1M으로 promote', () => {
  expect(fmtNum(999_500)).toBe('1M');
  expect(fmtNum(999_999)).toBe('1M');
});

test('fmtNum: 1_000_000은 trailing .0 제거되어 1M', () => {
  expect(fmtNum(1_000_000)).toBe('1M');
});

test('fmtNum: M 단위 소수', () => {
  expect(fmtNum(1_500_000)).toBe('1.5M');
});

// 리뷰 지적: fmtDate가 항등 함수가 되면서 date-only 슬라이스 책임이 소비처로
// 흩어졌다(PostHeader는 아예 이 함수를 안 거치고 raw date를 찍고 있었다).
// 예약 발행 글의 `date`는 datetime일 수 있어, 빠뜨린 곳은 ISO 문자열이 통째로
// 목록에 찍힌다.
test('fmtDate: datetime이 와도 날짜 부분만 남긴다', () => {
  expect(fmtDate('2026-03-16T09:00:00+09:00')).toBe('2026-03-16');
  expect(fmtDate('2026-03-16T00:00:00Z')).toBe('2026-03-16');
});
