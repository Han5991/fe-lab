import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateReadMin, fmtDate, fmtNum } from './format';

test('estimateReadMin: 빈 문자열도 최소 1분', () => {
  assert.equal(estimateReadMin(''), 1);
});

test('estimateReadMin: 짧은 문구는 1분', () => {
  assert.equal(estimateReadMin('hello'), 1);
});

test('estimateReadMin: 정확히 500자는 1분 (Math.ceil(500/500) = 1)', () => {
  assert.equal(estimateReadMin('a'.repeat(500)), 1);
});

test('estimateReadMin: 501자는 2분', () => {
  assert.equal(estimateReadMin('a'.repeat(501)), 2);
});

test('fmtDate: 일반 ISO', () => {
  assert.equal(fmtDate('2026-05-09'), '2026.05.09');
});

test('fmtDate: null/undefined는 빈 문자열', () => {
  assert.equal(fmtDate(null), '');
  assert.equal(fmtDate(undefined), '');
  assert.equal(fmtDate(''), '');
});

test('fmtNum: 1000 미만은 그대로', () => {
  assert.equal(fmtNum(0), '0');
  assert.equal(fmtNum(1), '1');
  assert.equal(fmtNum(999), '999');
});

test('fmtNum: 1000 경계', () => {
  // 1000 / 1000 = 1.0 → "1.0K".replace(.0K → K) = "1K"
  assert.equal(fmtNum(1000), '1K');
});

test('fmtNum: 천 단위 — 정수 K는 trailing .0 제거', () => {
  assert.equal(fmtNum(2000), '2K');
});

test('fmtNum: 천 단위 — 소수 1자리 유지', () => {
  assert.equal(fmtNum(1234), '1.2K');
  assert.equal(fmtNum(84210), '84.2K');
});

test('fmtNum: 백만 미만 상한 (M 분기로 안 넘어가는 quirk)', () => {
  // 999999 / 1000 = 999.999 → toFixed(1) = "1000.0" → ".0K$" 매치되어 "1000K"
  // 의도된 동작은 아니지만 현재 구현 기준 결과를 고정.
  assert.equal(fmtNum(999_999), '1000K');
});

test('fmtNum: 1_000_000은 M 분기 (1.0M)', () => {
  assert.equal(fmtNum(1_000_000), '1.0M');
});

test('fmtNum: M 단위 소수', () => {
  assert.equal(fmtNum(1_500_000), '1.5M');
});
