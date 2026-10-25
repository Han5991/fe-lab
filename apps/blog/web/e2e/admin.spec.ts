/**
 * `/admin`은 Google OAuth 뒤에 있어 다른 게이트가 렌더 결과를 본 적이 없다.
 *
 * - 비로그인: 모든 admin 페이지가 로그인 화면으로 보내고(가드), 로그인 화면은 axe를 지난다.
 * - 로그인: 가짜 Supabase 세션을 저장소에 미리 심고(실제 OAuth를 흉내 내지 않는다 —
 *   auth-js는 저장된 세션이 만료 전이면 네트워크 없이 그대로 쓴다) Edge Function
 *   응답은 `network.ts`가 RPC 모양으로 채운다. 차트가 그려지고 axe를 지나야 한다.
 * - 분석 화면은 고른 글을 주소에 둔다(`history.pushState` → Next 라우터가 `usePathname`을
 *   맞춘다). jsdom에는 그 라우터가 없어 단위 테스트가 볼 수 없는 연결이라 여기서 본다 —
 *   누르면 주소가 바뀌고, 뒤로 가기가 고르기 전으로 돌아간다.
 *
 * 콘솔 에러·예외 0은 모든 테스트에 걸린다(`fixtures.ts`).
 */
import type { BrowserContext, Locator, Page } from '@playwright/test';
import { ADMIN_POSTS_INDEX_PATH } from '@blog/content/client';
import { ADMIN_VIEW_TRANSITION } from '../src/shared/adminViewTransitions';
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

  // 전체 색인은 비공개 글 제목까지 담는다. noindex를 거는 public/_headers는 경로를 손으로 적은
  // import할 수 없는 사본이라, 산출물 이름이 바뀌면 noindex만 조용히 빠진다 — 프로덕션과 같은
  // Worker가 실제로 거는지 응답 헤더로 본다. 재평가: 2027-04-22 — 그때까지 잡은 것이 없으면 내린다.
  test('admin 전체 색인은 noindex로 나간다', async ({ page }) => {
    const response = await page.request.get(ADMIN_POSTS_INDEX_PATH);
    expect(response.status(), '응답 코드').toBe(200);
    expect(response.headers()['x-robots-tag'], 'X-Robots-Tag').toBe('noindex');
  });
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
  // 눌러야만 생기는 상태(고른 글의 패널·직접선택 기간의 날짜 입력)는 정지 화면 axe가 못 본다.
  test('/admin/analytics/ 글 선택 → 오른쪽 패널 + 직접선택 기간 + axe + 뒤로 가기', async ({
    page,
  }) => {
    await renderAdmin(page, '/admin/analytics/');
    const panel = page.getByRole('region', { name: '글 통계' });
    await expect(panel, '고른 글이 없으면 패널 칼럼이 없다').toHaveCount(0);

    const row = page
      .getByRole('table', { name: '글 목록' })
      .getByRole('link')
      .first();
    const href = await row.getAttribute('href');
    expect(href, '행 링크는 그 글의 통계 주소다').toMatch(
      /^\/admin\/analytics\/.+\/$/,
    );
    await row.click();
    await expect(row).toHaveAttribute('aria-current', 'page');
    await expect(page, '주소가 고른 글을 든다').toHaveURL(href ?? '');
    await expect(panel.locator('.recharts-surface').first()).toBeVisible();
    await expectDistributions(panel);
    await chooseCustomPeriod(page);
    expect(await axeViolations(page), 'axe 위반').toEqual([]);

    await page.goBack();
    await expect(page).toHaveURL('/admin/analytics/');
    await expect(panel).toHaveCount(0);
    await expect(row).not.toHaveAttribute('aria-current');
  });

  // 정렬은 type을 단 transition이라 실제 브라우저에서는 View Transition(목록 교차)을 탄다 — jsdom에는
  // startViewTransition이 없어 그 경로를 지나지 않는다. 전환이 실패하면 React가 전역 에러로 보고해
  // 픽스처의 예외·콘솔 검사가 잡는다.
  test('/admin/analytics/ 정렬을 바꾸면 목록이 교차하며 조회수순이 된다', async ({
    page,
  }) => {
    await renderAdmin(page, '/admin/analytics/');
    const table = page.getByRole('table', { name: '글 목록' });
    await page.getByRole('radio', { name: '조회수순' }).click();
    await expect(
      table.getByRole('columnheader', { name: /조회수/ }),
    ).toHaveAttribute('aria-sort', 'descending');
    const views = (
      await table.locator('tbody tr td:last-child').allTextContents()
    ).map(text => Number(/^[\d,]+/.exec(text)?.[0].replaceAll(',', '')));
    expect(views.length, '행').toBeGreaterThan(1);
    expect(views, '조회수 내림차순').toEqual([...views].sort((a, b) => b - a));
    expect(await axeViolations(page), 'axe 위반').toEqual([]);
  });

  test(`${POST_DETAIL_PAGES[0] ?? ''} 직접선택 기간 + axe`, async ({
    page,
  }) => {
    await renderAdmin(page, POST_DETAIL_PAGES[0] ?? '');
    await chooseCustomPeriod(page);
    expect(await axeViolations(page), 'axe 위반').toEqual([]);
  });

  test.describe('좁은 화면', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    // lg 미만은 패널이 목록을 덮는 시트(다이얼로그)다 — 넓은 화면의 칼럼과 마크업이 달라 따로 본다.
    test(`${POST_DETAIL_PAGES[0] ?? ''} 시트 + axe + Escape`, async ({
      page,
    }) => {
      await page.goto(POST_DETAIL_PAGES[0] ?? '');
      const sheet = page.getByRole('dialog');
      const bar = page.getByRole('banner');
      const barTransitionName = () =>
        bar.evaluate(el => getComputedStyle(el).viewTransitionName);
      await expect(sheet.locator('.recharts-surface').first()).toBeVisible();
      await expectDistributions(sheet);
      await expect(sheet).toHaveAttribute('aria-modal', 'true');
      // 시트가 떠 있는 동안 관리자 바는 따로 찍히지 않는다 — 찍히면 그 사이의 전환(분포 도착 등)에서
      // 바가 루트 위로 올라와 시트 머리와 스크림을 덮는다(375·768 실측).
      expect(await barTransitionName(), '시트가 열린 동안').toBe('none');
      expect(await axeViolations(page), 'axe 위반').toEqual([]);

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(page).toHaveURL('/admin/analytics/');
      expect(await barTransitionName(), '시트를 닫은 뒤').toBe(
        ADMIN_VIEW_TRANSITION.bar,
      );
    });
  });

  // 나머지 글별 분석 화면은 같은 컴포넌트에 slug만 다르고, 그 slug도 이 스위트에선
  // 가짜 응답의 씨앗일 뿐이다 — 로그인 렌더는 하나로 덮고, 경로마다의 가드는 위
  // 비로그인 묶음이 전부 연다(그쪽이 페이지당 1~2초라 전 경로를 감당할 수 있다).
});

/** 차트를 그리는 화면 — 대시보드(일별 시계열)와 글을 고른 분석 화면(패널의 차트). */
const CHART_PAGES = new Set(['/admin/', ...POST_DETAIL_PAGES]);

async function renderAdmin(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await expect(page.locator('main svg').first(), route).toBeVisible();
  await expect(page, '가드가 로그인 화면으로 보냈다').toHaveURL(route);
  await expect(
    page.getByRole('navigation', { name: '관리자 메뉴' }),
    '관리자 바',
  ).toBeVisible();
  if (CHART_PAGES.has(route)) {
    // recharts가 실제로 그렸는지 — 데이터가 비면 차트 대신 안내 문구가 나온다.
    await expect(
      page.locator('.recharts-surface').first(),
      route,
    ).toBeVisible();
    if (POST_DETAIL_PAGES.includes(route)) await expectDistributions(page);
  } else if (route === '/admin/analytics/') {
    await expect(
      page.getByRole('table', { name: '글 목록' }).getByRole('link').first(),
      route,
    ).toBeVisible();
  }
}

/**
 * 글 통계 패널의 시간대·요일 분포가 설 때까지. 분포는 패널의 나머지보다 늦게 와서 따로 드러나고,
 * 패널이 밀려 오는 View Transition이 도는 동안에는 React가 그 커밋을 미룬다 — 일별 차트가 보여도
 * 분포는 아직 없을 수 있다. 그때 axe를 부르면 `settleAnimations`가 기다릴 애니메이션이 아직 없어서,
 * 검사 도중 투명도 0에서 떠오르는 분포 글자를 대비 위반(color-contrast)으로 잰다. 분포가 서면 그
 * 진입 애니메이션은 이미 돌고 있어 `settleAnimations`가 끝까지 기다린다.
 */
async function expectDistributions(scope: Page | Locator): Promise<void> {
  await expect(scope.getByRole('heading', { name: '시간대별' })).toBeVisible();
}

async function chooseCustomPeriod(page: Page): Promise<void> {
  await page
    .getByRole('combobox', { name: '기간' })
    .first()
    .selectOption('custom');
  await expect(page.getByLabel('시작일').first()).toBeVisible();
  await expect(page.getByLabel('종료일').first()).toBeVisible();
}
