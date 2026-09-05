import { describe, expect, test } from 'vitest';
import { postPath, POSTS_PATH } from '@blog/content';
import {
  ABOUT_PATH,
  ADMIN_ANALYTICS_PATH,
  ADMIN_BASE_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_REDIRECT_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  ADMIN_PATH,
  adminAnalyticsPostPath,
  adminLoginRedirectUrl,
  HOME_PATH,
  isAdminLoginPath,
  PRIVACY_PATH,
  SERIES_PATH,
} from './routes';
import {
  ABOUT_TRANSITION_ID,
  HOME_TRANSITION_ID,
  POST_HERO_TRANSITION_GLOB,
  POST_PLAIN_TRANSITION_GLOB,
  POSTS_TRANSITION_ID,
  postTransitionId,
  PRIVACY_TRANSITION_ID,
  SERIES_TRANSITION_ID,
} from './transitions';

describe('정적 페이지 경로', () => {
  test('내부 링크 경로는 후행 슬래시를 단 절대 경로다 — trailingSlash 계약', () => {
    // next.config.ts의 trailingSlash: true. 여기서 어긋나면 링크마다
    // wrangler.jsonc의 html_handling: force-trailing-slash가 내는 307을
    // 한 번 더 탄다.
    for (const path of [
      ABOUT_PATH,
      SERIES_PATH,
      PRIVACY_PATH,
      ADMIN_PATH,
      ADMIN_LOGIN_PATH,
      ADMIN_ANALYTICS_PATH,
    ]) {
      expect(path.startsWith('/'), `절대 경로가 아님: ${path}`).toBe(true);
      expect(path.endsWith('/'), `후행 슬래시 없음: ${path}`).toBe(true);
    }
  });

  test('홈은 슬래시 하나다', () => {
    expect(HOME_PATH).toBe('/');
  });
});

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

describe('admin 경로 상수', () => {
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

  test('대시보드 canonical은 루트의 슬래시형이다', () => {
    expect(ADMIN_PATH).toBe(`${ADMIN_BASE_PATH}/`);
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

describe('adminAnalyticsPostPath', () => {
  test('ASCII slug는 후행 슬래시를 달아 상세 경로가 된다', () => {
    expect(adminAnalyticsPostPath('cache-hit-cold-build')).toBe(
      '/admin/analytics/cache-hit-cold-build/',
    );
  });

  test('`.`이 든 slug도 후행 슬래시를 유지한다 (postPath와 같은 계약)', () => {
    expect(adminAnalyticsPostPath('turborepo-next.js-docker')).toBe(
      '/admin/analytics/turborepo-next.js-docker/',
    );
  });

  test('한글·공백은 인코딩하고 폴더 경로의 `/`는 세그먼트 구분자로 남긴다 — postPath와 같은 규칙', () => {
    const slug = '회고/2025 상반기';
    expect(adminAnalyticsPostPath(slug)).toBe(
      `/admin/analytics/${encodeURIComponent('회고')}/${encodeURIComponent('2025 상반기')}/`,
    );
    // 공개 글 상세와 인코딩 규칙이 같다(prefix만 다르다).
    expect(
      adminAnalyticsPostPath(slug).slice(ADMIN_ANALYTICS_PATH.length),
    ).toBe(postPath(slug).slice(POSTS_PATH.length));
  });
});

describe('전환 ID 네임스페이스', () => {
  test('페이지 전환 ID는 라우트 경로의 무슬래시형이다', () => {
    expect(HOME_TRANSITION_ID).toBe('/');
    expect(POSTS_TRANSITION_ID).toBe('/posts');
    expect(SERIES_TRANSITION_ID).toBe('/series');
    expect(ABOUT_TRANSITION_ID).toBe('/about');
    expect(PRIVACY_TRANSITION_ID).toBe('/privacy');
  });

  test('글 상세 전환 ID는 썸네일 유무로 hero/fade 네임스페이스가 갈린다', () => {
    // 썸네일 있는 글만 hero 매처(/posts/*)에 걸리고, 없는 글은 /posts-plain/*로
    // 빠져 fade 폴백을 탄다 — URL은 어느 쪽이든 /posts/{slug} 그대로다.
    expect(postTransitionId('parallel-io', true)).toBe('/posts/parallel-io');
    expect(postTransitionId('parallel-io', false)).toBe(
      '/posts-plain/parallel-io',
    );
  });

  test('상세 전환 ID는 매처 글롭의 접두와 일치한다 — 어긋나면 hero가 조용히 죽는다', () => {
    const globPrefix = (glob: string) => glob.slice(0, -1); // '/posts/*' → '/posts/'
    expect(
      postTransitionId('any', true).startsWith(
        globPrefix(POST_HERO_TRANSITION_GLOB),
      ),
    ).toBe(true);
    expect(
      postTransitionId('any', false).startsWith(
        globPrefix(POST_PLAIN_TRANSITION_GLOB),
      ),
    ).toBe(true);
  });
});
