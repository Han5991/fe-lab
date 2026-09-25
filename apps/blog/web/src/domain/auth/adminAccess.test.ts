import { describe, expect, test } from 'vitest';
import { isAdminEmail, readOAuthRedirectError } from './adminAccess';

// 로그인 경로 계약(isAdminLoginPath·ADMIN_LOGIN_PATH…)은 shared/routes.ts로
// 이사했다 — 그쪽 테스트는 shared/routes.test.ts.

describe('isAdminEmail', () => {
  test('설정된 관리자 이메일과 정확히 일치할 때만 참', () => {
    expect(isAdminEmail('me@example.com', 'me@example.com')).toBe(true);
    expect(isAdminEmail('you@example.com', 'me@example.com')).toBe(false);
  });

  test('이메일이 비었으면 관리자 설정이 비어 있어도 거짓 — fail-closed', () => {
    // NEXT_PUBLIC_ADMIN_EMAIL 미주입 빌드에서 undefined === undefined로
    // 전원이 관리자가 되는 사고를 막는 축이다.
    expect(isAdminEmail(undefined, undefined)).toBe(false);
    expect(isAdminEmail(null, undefined)).toBe(false);
    expect(isAdminEmail('', '')).toBe(false);
  });
});

describe('readOAuthRedirectError', () => {
  test.each([
    // 쿼리·프래그먼트 어디에 실려 와도 사람이 읽을 사유를 꺼낸다.
    [
      '?error=access_denied&error_description=Signups+not+allowed+for+this+instance',
      '',
      'Signups not allowed for this instance',
    ],
    [
      '',
      '#error=server_error&error_description=Database%20error',
      'Database error',
    ],
    // 설명이 없으면 오류 코드라도.
    ['?error=access_denied', '', 'access_denied'],
    // 실패가 아닌 복귀(토큰·빈 URL)는 null.
    ['', '#access_token=abc&type=bearer', null],
    ['', '', null],
    ['?error=%20', '', null],
    // URL에서 온 글자라 길이를 자른다.
    [`?error_description=${'x'.repeat(500)}`, '', 'x'.repeat(200)],
  ])('search %j · hash %j → %j', (search, hash, reason) => {
    expect(readOAuthRedirectError(search, hash)).toBe(reason);
  });
});
