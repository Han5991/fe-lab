/**
 * 산출물의 공개 페이지 전부(admin 제외 — `admin.spec.ts`)를 데스크톱·라이트 테마로 연다.
 *
 * 페이지마다:
 * 1. 본문이 hydration을 살아남는다 — 서버 HTML과 hydration 뒤 DOM의 본문 비교(구조·
 *    글자 수·가시성). 관찰 창(`OBSERVE_MS`)이 지난 뒤 한 번, axe가 끝난 뒤 한 번 더 본다.
 * 2. 잡히지 않은 예외·콘솔 에러 0 (`fixtures.ts`가 테스트 끝에서 단언).
 * 3. axe WCAG 2.0/2.1 A·AA 위반 0 — 관찰 창 뒤에 돈다(늦게 그려지는 UI까지).
 *
 * 프로덕션 서빙 규칙(`wrangler.jsonc`) 둘도 여기서 본다 — 없는 경로는 404 상태로
 * 404 화면을, 슬래시 없는 경로는 슬래시 붙은 정규 URL로 보낸다.
 */
import type { Page } from '@playwright/test';
import { axeViolations } from './support/a11y';
import {
  contentSelector,
  type ContentSnapshot,
  serverHtml,
  settle,
  snapshotContent,
  waitForHydration,
} from './support/dom';
import { expect, test } from './support/fixtures';
import { type PageKind, sitePages } from './support/site';

const PAGES = sitePages().filter(p => p.kind !== 'admin');

/** hydration 뒤 본문이 서버 HTML을 지켰는지. `when`은 실패 메시지에 실린다. */
async function expectBodySurvived(
  page: Page,
  selector: string,
  kind: PageKind,
  server: ContentSnapshot,
  when: string,
): Promise<void> {
  const live = await snapshotContent(page, selector);
  if (kind === 'post') {
    // 글 본문은 서버가 다 그린다(PostBody는 서버 컴포넌트) — 수가 정확히 같아야 한다.
    expect(live.counts, `${selector} 구조가 달라졌다 (${when})`).toEqual(
      server.counts,
    );
  } else {
    // 목록·홈은 클라이언트가 덧붙이는 영역(인기 글 레일 등)이 있다 — 줄어들지만 않으면 된다.
    for (const [tag, n] of Object.entries(server.counts)) {
      expect(
        live.counts[tag as keyof typeof live.counts],
        `${selector} 안의 <${tag}>가 줄었다 (${when})`,
      ).toBeGreaterThanOrEqual(n);
    }
  }
  // 수만 같고 글자를 비우거나(textContent = '') 가린(display:none) 본문도 독자에겐 지워진 것이다.
  expect(
    live.textLength,
    `${selector} 글자 수가 서버 HTML보다 줄었다 (${when})`,
  ).toBeGreaterThanOrEqual(server.textLength);
  if (kind === 'post') {
    // 글 본문만 본다 — 목록·홈은 반응형으로 한쪽 폭에서만 보이는 영역(인기 글 레일 등)이 있다.
    expect(live.hidden, `${selector} 안에서 가려진 요소 (${when})`).toEqual([]);
  }
  expect(live.height, `${selector}의 렌더 높이 (${when})`).toBeGreaterThan(100);
  await expect(
    page.locator(selector),
    `${selector} 가시성 (${when})`,
  ).toBeVisible();
}

for (const { route, kind } of PAGES) {
  test(`${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status(), '응답 코드').toBe(200);

    const selector = contentSelector(route);
    await waitForHydration(page, selector);
    const server = await snapshotContent(
      page,
      selector,
      await serverHtml(page),
    );
    const total = Object.values(server.counts).reduce((a, b) => a + b, 0);
    expect(total, `서버 HTML의 ${selector}가 비어 있다`).toBeGreaterThan(0);

    await settle(page);
    await expectBodySurvived(page, selector, kind, server, '관찰 창 뒤');

    expect(await axeViolations(page), 'axe 위반 (라이트)').toEqual([]);

    // axe가 도는 동안 끼어든 변화까지 — 마지막에 한 번 더 본다.
    await expectBodySurvived(page, selector, kind, server, 'axe 뒤');
  });
}

const MISSING = '/e2e-no-such-page/';

test.describe('서빙 규칙', () => {
  test.describe('404', () => {
    // 문서 자체가 404면 크로미움이 그 응답을 콘솔 에러로 찍는다 — 앱이 아니라 브라우저의
    // 기록이고, 404 상태가 바로 이 테스트가 확인하려는 것이다. 이 URL의 이 문구 하나만 뺀다.
    test.use({
      expectedConsoleErrors: [
        `${MISSING} → Failed to load resource: the server responded with a status of 404 (Not Found) (${MISSING})`,
      ],
    });

    test('없는 경로는 404 상태로 404 화면을 그린다', async ({ page }) => {
      const response = await page.goto(MISSING);
      expect(response?.status(), '응답 코드').toBe(404);
      await waitForHydration(page, 'main');
      await expect(
        page.getByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
      ).toBeVisible();
    });
  });

  test('슬래시 없는 경로는 정규 URL(슬래시)로 보낸다', async ({ page }) => {
    const response = await page.goto('/posts');
    expect(response?.status(), '최종 응답 코드').toBe(200);
    await expect(page).toHaveURL(/\/posts\/$/);
  });
});
