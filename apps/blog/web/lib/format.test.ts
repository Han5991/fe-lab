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

// 리뉴얼 시각 기준(design-reference.html)이 홈·상세 모두 하이픈 표기라
// 점 표기를 걷어냈다. 표기가 다시 갈리지 않도록 여기서 고정한다.
test('fmtDate: ISO 하이픈 표기를 그대로 유지', () => {
  assert.equal(fmtDate('2026-05-09'), '2026-05-09');
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

test('fmtNum: 999_500 이상은 1000K로 빠지지 않고 1M으로 promote', () => {
  assert.equal(fmtNum(999_500), '1M');
  assert.equal(fmtNum(999_999), '1M');
});

test('fmtNum: 1_000_000은 trailing .0 제거되어 1M', () => {
  assert.equal(fmtNum(1_000_000), '1M');
});

test('fmtNum: M 단위 소수', () => {
  assert.equal(fmtNum(1_500_000), '1.5M');
});

// 리뷰 지적: fmtDate가 항등 함수가 되면서 date-only 슬라이스 책임이 소비처로
// 흩어졌다(PostHeader는 아예 이 함수를 안 거치고 raw date를 찍고 있었다).
// 예약 발행 글의 `date`는 datetime일 수 있어, 빠뜨린 곳은 ISO 문자열이 통째로
// 목록에 찍힌다.
test('fmtDate: datetime이 와도 날짜 부분만 남긴다', () => {
  assert.equal(fmtDate('2026-03-16T09:00:00+09:00'), '2026-03-16');
  assert.equal(fmtDate('2026-03-16T00:00:00Z'), '2026-03-16');
});
