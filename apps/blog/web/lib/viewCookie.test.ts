import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  slugToViewKey,
  hasViewCookie,
  buildViewCookieStr,
  getViewCookieExpiry,
  VIEW_COOLDOWN_HOURS,
} from './viewCookie';

// ── slugToViewKey ───────────────────────────────────────────────────────────

test('slugToViewKey: 영숫자/하이픈 그대로 보존', () => {
  assert.equal(slugToViewKey('hello-world-123'), 'viewed_hello-world-123');
});

test('slugToViewKey: 슬래시·한글 등 특수문자는 _로 치환', () => {
  const key = slugToViewKey('번들러/소개');
  // 한글·슬래시 모두 _로
  assert.match(key, /^viewed_[a-zA-Z0-9_-]+$/);
});

test('slugToViewKey: 빈 문자열이어도 prefix는 유지', () => {
  assert.equal(slugToViewKey(''), 'viewed_');
});

// ── hasViewCookie ───────────────────────────────────────────────────────────

test('hasViewCookie: 쿠키가 없으면 false', () => {
  assert.equal(hasViewCookie('', 'viewed_hello'), false);
});

test('hasViewCookie: 정확히 일치하는 쿠키가 있으면 true', () => {
  const cookie = 'other=x; viewed_hello=true; another=y';
  assert.equal(hasViewCookie(cookie, 'viewed_hello'), true);
});

test('hasViewCookie: 접두어가 겹치는 다른 쿠키는 false', () => {
  // viewed_hello_world ≠ viewed_hello
  const cookie = 'viewed_hello_world=true';
  assert.equal(hasViewCookie(cookie, 'viewed_hello'), false);
});

test('hasViewCookie: 쿠키가 첫 번째 항목으로 있어도 true', () => {
  const cookie = 'viewed_slug=true; foo=bar';
  assert.equal(hasViewCookie(cookie, 'viewed_slug'), true);
});

// ── getViewCookieExpiry ─────────────────────────────────────────────────────

test('getViewCookieExpiry: VIEW_COOLDOWN_HOURS 뒤의 Date를 반환', () => {
  const now = new Date('2026-05-24T10:00:00Z');
  const expiry = getViewCookieExpiry(now);
  const expectedMs = now.getTime() + VIEW_COOLDOWN_HOURS * 60 * 60 * 1000;
  assert.equal(expiry.getTime(), expectedMs);
});

// ── buildViewCookieStr ──────────────────────────────────────────────────────

test('buildViewCookieStr: 올바른 쿠키 직렬화 문자열 생성', () => {
  const key = 'viewed_hello';
  const expires = new Date('2026-05-24T16:00:00Z');
  const result = buildViewCookieStr(key, expires);
  assert.equal(
    result,
    `viewed_hello=true; expires=${expires.toUTCString()}; path=/`,
  );
});

// ── 동시 탭 레이스 시나리오 ─────────────────────────────────────────────────

test('레이스 시나리오: 쿠키 먼저 set → 두 번째 탭은 hasViewCookie=true 반환', () => {
  // 탭 A가 쿠키를 RPC 전에 set했다고 가정
  const key = slugToViewKey('my-post');
  const expiry = getViewCookieExpiry(new Date());
  const cookieWrittenByTabA = buildViewCookieStr(key, expiry);

  // 브라우저 document.cookie는 새로 set된 쿠키가 전체 쿠키 문자열에 추가됨
  // 탭 B가 읽는 시점의 cookie string을 시뮬레이션
  const simulatedDocumentCookie = `other=x; ${cookieWrittenByTabA.split(';')[0]}`;

  // 탭 B는 hasViewed=true → RPC 호출 차단
  assert.equal(hasViewCookie(simulatedDocumentCookie, key), true);
});
