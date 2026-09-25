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
  test('쿼리·프래그먼트 어디에 실려 와도 사람이 읽을 사유를 꺼낸다', () => {
    expect(
      readOAuthRedirectError(
        '?error=access_denied&error_description=Signups+not+allowed+for+this+instance',
        '',
      ),
    ).toBe('Signups not allowed for this instance');
    expect(
      readOAuthRedirectError(
        '',
        '#error=server_error&error_description=Database%20error',
      ),
    ).toBe('Database error');
  });

  test('설명이 없으면 오류 코드라도 돌려준다', () => {
    expect(readOAuthRedirectError('?error=access_denied', '')).toBe(
      'access_denied',
    );
  });

  test('실패가 아닌 복귀(토큰·빈 URL)는 null이다', () => {
    expect(readOAuthRedirectError('', '#access_token=abc&type=bearer')).toBe(
      null,
    );
    expect(readOAuthRedirectError('', '')).toBe(null);
    expect(readOAuthRedirectError('?error=%20', '')).toBe(null);
  });

  test('URL에서 온 글자라 길이를 자른다', () => {
    const long = 'x'.repeat(500);
    expect(readOAuthRedirectError(`?error_description=${long}`, '')).toBe(
      'x'.repeat(200),
    );
  });
});
