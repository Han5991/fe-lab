import { describe, expect, test } from 'vitest';
import { isAdminEmail } from './adminAccess';

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
