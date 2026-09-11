import { expect, test } from 'vitest';
import { matchesAdminEmail } from './adminEmail.ts';

/**
 * 관리자 판정 계약 — **fail-closed여야 한다.**
 */

test('정확히 같은 주소만 통과한다', () => {
  expect(matchesAdminEmail('me@example.com', 'me@example.com')).toBe(true);
  expect(matchesAdminEmail('you@example.com', 'me@example.com')).toBe(false);
  // 대소문자·공백은 정규화하지 않는다 — 관대해질수록 통과 범위가 넓어진다.
  expect(matchesAdminEmail('ME@example.com', 'me@example.com')).toBe(false);
  expect(matchesAdminEmail(' me@example.com', 'me@example.com')).toBe(false);
});

test('설정이 비어 있으면 아무도 관리자가 아니다', () => {
  // 두 값이 모두 undefined일 때 `email === adminEmail`이 true가 되는 것이
  // 이 함수의 유일한 함정이다 — 설정이 빠진 배포에서 전원이 관리자가 된다.
  expect(matchesAdminEmail(undefined, undefined)).toBe(false);
  expect(matchesAdminEmail(null, undefined)).toBe(false);
  expect(matchesAdminEmail('me@example.com', undefined)).toBe(false);
  expect(matchesAdminEmail('', '')).toBe(false);
  expect(matchesAdminEmail(undefined, '')).toBe(false);
});

test('세션이 없으면 통과하지 않는다', () => {
  expect(matchesAdminEmail(null, 'me@example.com')).toBe(false);
  expect(matchesAdminEmail(undefined, 'me@example.com')).toBe(false);
  expect(matchesAdminEmail('', 'me@example.com')).toBe(false);
});
