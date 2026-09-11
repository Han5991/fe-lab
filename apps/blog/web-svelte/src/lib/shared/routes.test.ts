import { expect, test } from 'vitest';
import {
  ADMIN_ANALYTICS_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  adminAnalyticsPostPath,
  isAdminLoginPath,
} from './routes.ts';

/**
 * 라우트 계약.
 *
 * `isAdminLoginPath`는 **가드의 탈출구**다 — 이게 틀리면 둘 중 하나가 된다:
 * 로그인 화면이 자기 자신으로 무한 리다이렉트하거나(true여야 할 때 false),
 * 아무 admin 경로나 가드를 지나지 않는다(false여야 할 때 true).
 */

test('후행 슬래시가 있든 없든 로그인 경로로 본다', () => {
  // 호스팅이 후행 슬래시를 강제하지만, 클라이언트 라우팅 중에는 둘 다 온다.
  expect(isAdminLoginPath('/admin/login/')).toBe(true);
  expect(isAdminLoginPath('/admin/login')).toBe(true);
});

test('다른 admin 경로는 로그인 경로가 아니다 — 가드를 지나야 한다', () => {
  expect(isAdminLoginPath('/admin/')).toBe(false);
  expect(isAdminLoginPath('/admin/analytics/')).toBe(false);
  // 접두사만 같은 경로가 통과하면 가드에 구멍이 난다.
  expect(isAdminLoginPath('/admin/login/extra/')).toBe(false);
  expect(isAdminLoginPath('/admin/loginx/')).toBe(false);
  expect(isAdminLoginPath('/')).toBe(false);
});

test('내부 경로는 전부 후행 슬래시로 끝난다', () => {
  // 호스팅의 force-trailing-slash와 짝이다 — 없으면 클릭마다 리다이렉트를 탄다.
  for (const path of [ADMIN_ANALYTICS_PATH, ADMIN_LOGIN_PATH]) {
    expect(path.endsWith('/'), path).toBe(true);
  }
});

test('글 통계 경로는 slug를 인코딩한다', () => {
  // 날것으로 이어 붙이면 한글 slug와 폴더 경로 폴백이 깨진다.
  expect(adminAnalyticsPostPath('hello')).toBe('/admin/analytics/hello/');
  expect(adminAnalyticsPostPath('한글 제목')).toBe(
    '/admin/analytics/%ED%95%9C%EA%B8%80%20%EC%A0%9C%EB%AA%A9/',
  );
  // 폴더 구분자는 남긴다 — `시리즈/파일명`이 두 세그먼트여야 라우트와 맞는다.
  expect(adminAnalyticsPostPath('series/post')).toBe(
    '/admin/analytics/series/post/',
  );
});

test('권한 없음 안내는 쿼리로 구분한다', () => {
  expect(ADMIN_LOGIN_UNAUTHORIZED_PATH.startsWith(ADMIN_LOGIN_PATH)).toBe(true);
  expect(
    new URL(ADMIN_LOGIN_UNAUTHORIZED_PATH, 'https://x').searchParams.get(
      'error',
    ),
  ).toBe('unauthorized');
});
