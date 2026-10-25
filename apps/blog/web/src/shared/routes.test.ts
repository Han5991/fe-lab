import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { postPath, POSTS_PATH } from '@blog/content/client';
import {
  ABOUT_PATH,
  ADMIN_ANALYTICS_PATH,
  ADMIN_BASE_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_LOGIN_REDIRECT_PATH,
  ADMIN_LOGIN_UNAUTHORIZED_PATH,
  ADMIN_PATH,
  ADMIN_SEGMENT,
  adminAnalyticsPostPath,
  adminAnalyticsSlugFromPath,
  adminLoginErrorPath,
  adminLoginRedirectUrl,
  HOME_PATH,
  isAdminLoginPath,
  PRIVACY_PATH,
  SERIES_PATH,
  slugFromRouteParam,
} from './routes';

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

  test('OAuth 실패 경로는 로그인 화면에 사유를 인코딩해 싣는다', () => {
    const path = adminLoginErrorPath('Signups not allowed & more');
    const url = new URL(path, 'https://blog.sangwook.dev');

    expect(isAdminLoginPath(url.pathname)).toBe(true);
    expect(url.searchParams.get('error')).toBe('oauth');
    expect(url.searchParams.get('error_description')).toBe(
      'Signups not allowed & more',
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

describe('slugFromRouteParam', () => {
  test('ASCII slug는 그대로 통과한다', () => {
    expect(slugFromRouteParam('cache-hit-cold-build')).toBe(
      'cache-hit-cold-build',
    );
  });

  test('인코딩된 한글 slug를 디코드한다 — post.slug(디코드 원문)와의 lookup 계약', () => {
    expect(slugFromRouteParam(encodeURIComponent('한글-슬러그'))).toBe(
      '한글-슬러그',
    );
  });

  test('배열 세그먼트는 /로 잇고 디코드한다', () => {
    expect(slugFromRouteParam([encodeURIComponent('회고'), '2024'])).toBe(
      '회고/2024',
    );
  });

  test('세그먼트가 없으면 빈 문자열', () => {
    expect(slugFromRouteParam(undefined)).toBe('');
  });

  test('잘못된 percent-encoding은 던지지 않고 원문을 돌려준다 (lookup만 빗나가게)', () => {
    expect(() => slugFromRouteParam('100%-done')).not.toThrow();
    expect(slugFromRouteParam('100%-done')).toBe('100%-done');
    expect(slugFromRouteParam(['a%', 'b'])).toBe('a%/b');
  });

  test('링크 → 라우트 왕복: adminAnalyticsPostPath가 만든 경로의 세그먼트를 넣으면 원래 slug가 나온다', () => {
    // 링크 쪽 인코딩과 라우트 쪽 디코드는 서로의 역함수여야 한다.
    const segmentsOf = (path: string) =>
      path.slice(ADMIN_ANALYTICS_PATH.length).replace(/\/$/, '').split('/');
    for (const slug of [
      'cache-hit-cold-build',
      'turborepo-next.js-docker',
      '한글-슬러그',
      '회고/2025 상반기',
      'react/component/toast',
    ]) {
      expect(slugFromRouteParam(segmentsOf(adminAnalyticsPostPath(slug)))).toBe(
        slug,
      );
    }
  });
});

describe('adminAnalyticsSlugFromPath', () => {
  test('링크 → 주소 왕복: adminAnalyticsPostPath가 만든 경로에서 원래 slug가 나온다', () => {
    // 분석 화면은 고른 글을 주소에만 둔다 — 행이 만드는 주소와 화면이 읽는 주소가 역함수여야 한다.
    for (const slug of [
      'cache-hit-cold-build',
      'turborepo-next.js-docker',
      '한글-슬러그',
      '회고/2025 상반기',
      'react/component/toast',
    ]) {
      expect(adminAnalyticsSlugFromPath(adminAnalyticsPostPath(slug))).toBe(
        slug,
      );
    }
  });

  test('dev 서버의 무슬래시형도 같은 글이다', () => {
    expect(adminAnalyticsSlugFromPath('/admin/analytics/my-post')).toBe(
      'my-post',
    );
  });

  test('통계 목록 자체와 통계 영역 밖은 고른 글이 없다', () => {
    expect(adminAnalyticsSlugFromPath(ADMIN_ANALYTICS_PATH)).toBeNull();
    expect(adminAnalyticsSlugFromPath('/admin/analytics')).toBeNull();
    expect(adminAnalyticsSlugFromPath(ADMIN_PATH)).toBeNull();
    expect(adminAnalyticsSlugFromPath('/posts/my-post/')).toBeNull();
    // 접두만 같은 다른 경로(`/admin/analytics-old/…`)를 통계로 읽지 않는다.
    expect(adminAnalyticsSlugFromPath('/admin/analytics-old/x/')).toBeNull();
  });

  test('잘못된 percent-encoding은 던지지 않는다 — slugFromRouteParam과 같은 규칙', () => {
    expect(adminAnalyticsSlugFromPath('/admin/analytics/100%-done/')).toBe(
      '100%-done',
    );
  });
});

describe('ADMIN_SEGMENT', () => {
  // 세그먼트는 손으로 적은 폴더 이름의 사본이다(라우트는 파일 시스템이 정한다). 폴더를 옮기고
  // 이 값을 두면 루트 레이아웃이 admin에 사이트 셸을 씌우고, 화면은 두 셸이 겹친 채 멀쩡히 뜬다.
  test('src/app 아래 admin 라우트 폴더의 이름이다', () => {
    expect(
      existsSync(
        new URL(`../app/${ADMIN_SEGMENT}/layout.tsx`, import.meta.url),
      ),
    ).toBe(true);
  });
});
