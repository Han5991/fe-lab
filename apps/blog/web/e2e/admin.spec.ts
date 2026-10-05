/**
 * `/admin`은 Google OAuth 뒤에 있어 다른 게이트가 렌더 결과를 본 적이 없다.
 *
 * - 비로그인: 모든 admin 페이지가 로그인 화면으로 보내고(가드), 로그인 화면은 axe를 지난다.
 * - 로그인: 가짜 Supabase 세션을 저장소에 미리 심고(실제 OAuth를 흉내 내지 않는다 —
 *   auth-js는 저장된 세션이 만료 전이면 네트워크 없이 그대로 쓴다) Edge Function
 *   응답은 `network.ts`가 RPC 모양으로 채운다. 차트가 그려지고 axe를 지나야 한다.
 *
 * 콘솔 에러·예외 0은 모든 테스트에 걸린다(`fixtures.ts`).
 */
import type { BrowserContext, Page } from '@playwright/test';
import { axeViolations } from './support/a11y';
import { expect, test } from './support/fixtures';
import { ADMIN_EMAIL, SUPABASE_URL, sitePages } from './support/site';

const LOGIN = '/admin/login/';
const ADMIN_PAGES = sitePages()
  .filter(p => p.kind === 'admin')
  .map(p => p.route);

const GUARDED_PAGES = ADMIN_PAGES.filter(r => r !== LOGIN);

/** 글별 분석 화면 — 같은 컴포넌트에 slug만 다르다. */
const POST_DETAIL_PAGES = ADMIN_PAGES.filter(r =>
  /^\/admin\/analytics\/.+/.test(r),
);

/** 로그인 상태로 렌더·axe까지 도는 admin 화면 — 개요·분석, 그리고 글별 화면 하나. */
const AXE_PAGES = ['/admin/', '/admin/analytics/', POST_DETAIL_PAGES[0] ?? ''];

if (
  !ADMIN_PAGES.includes(LOGIN) ||
  AXE_PAGES.some(r => !ADMIN_PAGES.includes(r))
) {
  throw new Error(
    `admin 페이지 수집이 어긋났습니다: ${ADMIN_PAGES.join(', ')}`,
  );
}

const CHUNKS = 4;

function chunks<T>(items: readonly T[]): T[][] {
  const size = Math.ceil(items.length / CHUNKS);
  return Array.from({ length: CHUNKS }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  ).filter(c => c.length > 0);
}

test.describe('비로그인', () => {
  test('로그인 화면이 그려지고 axe를 지난다', async ({ page }) => {
    await page.goto(LOGIN);
    await expect(
      page.getByRole('heading', { name: 'FE Lab 관리자' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Google 계정으로 계속하기' }),
    ).toBeEnabled();
    expect(await axeViolations(page), 'axe 위반').toEqual([]);
  });

  // 페이지마다 컨텍스트를 새로 띄우면 검사보다 기동이 비싸다 — 몇 묶음으로 나눠
  // 한 페이지에서 차례로 연다(묶음끼리는 병렬).
  for (const [i, routes] of chunks(GUARDED_PAGES).entries()) {
    test(`가드가 로그인 화면으로 보낸다 (${i + 1}/${CHUNKS})`, async ({
      page,
    }) => {
      for (const route of routes) {
        await page.goto(route);
        await expect(page, route).toHaveURL(LOGIN);
        await expect(
          page.getByRole('heading', { name: 'FE Lab 관리자' }),
        ).toBeVisible();
      }
    });
  }
});

/** base64url(JSON) — 서명은 검증되지 않는다(auth-js는 저장된 토큰을 해독만 한다). */
function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** auth-js가 `sb-<ref>-auth-token`에 저장하는 세션 모양. 한 시간 뒤 만료. */
function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: ADMIN_EMAIL,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {},
    created_at: new Date(0).toISOString(),
  };
  const accessToken = [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({
      sub: user.id,
      aud: user.aud,
      role: user.role,
      email: user.email,
      iat: now,
      exp: now + 3600,
    }),
    'e2e-unsigned',
  ].join('.');
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'e2e-refresh-token',
    user,
  };
}

async function signIn(context: BrowserContext): Promise<void> {
  const key = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  await context.addInitScript(
    ([k, v]) => {
      // about:blank 등 불투명 출처에서는 localStorage 접근이 SecurityError다.
      if (window.location.protocol.startsWith('http')) {
        window.localStorage.setItem(k, v);
      }
    },
    [key, JSON.stringify(fakeSession())] as const,
  );
}

test.describe('로그인', () => {
  test.beforeEach(async ({ context }) => {
    await signIn(context);
  });

  for (const route of AXE_PAGES) {
    test(`${route} 렌더 + axe`, async ({ page }) => {
      await renderAdmin(page, route);
      await page.waitForLoadState('networkidle');
      expect(await axeViolations(page), 'axe 위반').toEqual([]);
    });
  }
  // 펼쳐야만 생기는 상태(글 아코디언·직접선택 기간의 날짜 입력)는 정지 화면 axe가 못 본다.
  test('/admin/analytics/ 글 펼침 + 직접선택 기간 + axe', async ({ page }) => {
    await renderAdmin(page, '/admin/analytics/');
    const toggle = page.locator('main button[aria-expanded]').first();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await chooseCustomPeriod(page);
    expect(await axeViolations(page), 'axe 위반').toEqual([]);
  });

  test(`${POST_DETAIL_PAGES[0] ?? ''} 직접선택 기간 + axe`, async ({
    page,
  }) => {
    await renderAdmin(page, POST_DETAIL_PAGES[0] ?? '');
    await chooseCustomPeriod(page);
    expect(await axeViolations(page), 'axe 위반').toEqual([]);
  });

  // 나머지 글별 분석 화면은 같은 컴포넌트에 slug만 다르고, 그 slug도 이 스위트에선
  // 가짜 응답의 씨앗일 뿐이다 — 로그인 렌더는 하나로 덮고, 경로마다의 가드는 위
  // 비로그인 묶음이 전부 연다(그쪽이 페이지당 1~2초라 전 경로를 감당할 수 있다).
});

async function renderAdmin(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await expect(page.locator('main svg').first(), route).toBeVisible();
  await expect(page, '가드가 로그인 화면으로 보냈다').toHaveURL(route);
  if (route.startsWith('/admin/analytics/')) {
    // recharts가 실제로 그렸는지 — 데이터가 비면 차트 대신 안내 문구가 나온다.
    await expect(
      page.locator('.recharts-surface').first(),
      route,
    ).toBeVisible();
  }
}

async function chooseCustomPeriod(page: Page): Promise<void> {
  await page
    .getByRole('combobox', { name: '기간' })
    .first()
    .selectOption('custom');
  await expect(page.getByLabel('시작일').first()).toBeVisible();
  await expect(page.getByLabel('종료일').first()).toBeVisible();
}
