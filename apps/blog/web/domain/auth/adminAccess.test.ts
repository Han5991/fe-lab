import { describe, expect, test } from 'vitest';
import {
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_REDIRECT_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  adminLoginRedirectUrl,
  isAdminEmail,
  isAdminLoginPath,
} from './adminAccess';

describe('isAdminLoginPath', () => {
  test('canonical(슬래시형)과 dev 서버의 무슬래시형을 둘 다 인정한다', () => {
    // skipTrailingSlashRedirect라 dev에서는 두 형태가 모두 200으로 서빙된다.
    // 어느 형태로 열어도 "로그인 화면을 로그인 화면으로 보내는" 루프가 없어야 한다.
    expect(isAdminLoginPath('/admin/login/')).toBe(true);
    expect(isAdminLoginPath('/admin/login')).toBe(true);
  });

  test('다른 admin 경로·비어 있는 값은 아니다', () => {
    expect(isAdminLoginPath('/admin/')).toBe(false);
    expect(isAdminLoginPath('/admin/login/extra/')).toBe(false);
    expect(isAdminLoginPath(null)).toBe(false);
    expect(isAdminLoginPath(undefined)).toBe(false);
  });
});

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

describe('경로 상수', () => {
  test('로그인 경로는 파생되지만 값은 슬래시형 canonical 그대로다', () => {
    // ADMIN_BASE_PATH에서 조립하므로, 파생이 어긋나면 여기서 먼저 걸린다.
    expect(ADMIN_LOGIN_PATH).toBe('/admin/login/');
  });

  test('unauthorized 경로는 로그인 경로에서 파생된다', () => {
    expect(ADMIN_LOGIN_UNAUTHORIZED_PATH).toBe(
      `${ADMIN_LOGIN_PATH}?error=unauthorized`,
    );
  });

  test('OAuth 복귀 경로는 무슬래시다 — Supabase 허용 목록과 짝이라 고정', () => {
    // 사이트 계약은 슬래시형이지만 여기만 예외다. 목록이 정확 일치로
    // 걸려 있어서, 이 값이 슬래시형으로 바뀌면 프로덕션 로그인이 깨진다.
    expect(ADMIN_LOGIN_REDIRECT_PATH).toBe('/admin');
  });
});

describe('adminLoginRedirectUrl', () => {
  test('origin에 복귀 경로를 붙인 절대 URL을 만든다', () => {
    expect(adminLoginRedirectUrl('https://blog.sangwook.dev')).toBe(
      'https://blog.sangwook.dev/admin',
    );
  });

  test('로컬·프리뷰 origin도 그대로 쓴다 — 고정 SITE_URL이면 안 되는 이유', () => {
    // 정적 export라 서버가 없고 Next도 origin을 주지 않아 브라우저에서 받는다.
    // SITE_URL로 고정하면 여기서 프로덕션으로 튕겨 로그인이 안 된다.
    expect(adminLoginRedirectUrl('http://localhost:3000')).toBe(
      'http://localhost:3000/admin',
    );
  });
});
