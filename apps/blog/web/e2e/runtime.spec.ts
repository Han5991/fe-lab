/**
 * JS 없이는 존재하지 않는 동작만 확인한다 — 웹 폰트 적재, 테마 전환, ⌘K 검색,
 * mermaid 렌더, Web Vitals 전송. 화면 문구·배치는 다른 게이트(jsdom·check-seo)의 몫이다.
 */
import type { Page } from '@playwright/test';
import { axeViolations } from './support/a11y';
import { waitForHydration } from './support/dom';
import { expect, test } from './support/fixtures';
import {
  mermaidChartCount,
  publishedPosts,
  representatives,
} from './support/site';

const { codePost, mermaidPost } = representatives();

test.describe('웹 폰트', () => {
  // 폰트가 빠져도 상자 크기는 시스템 폰트로 그대로 나온다(#392) — 상자 기반 검사로는
  // 보이지 않으므로, 계산된 font-family의 첫 패밀리가 실제로 적재됐는지 본다.
  //
  // "face 하나라도 적재"로는 부족하다 — Pretendard는 unicode-range 조각 92개라 라틴
  // 조각만 살고 한글 조각이 전부 깨져도 통과했다(디코드 실패는 콘솔 에러가 아니라 경고다).
  // 그래서 **그 글의 실제 글자**에 필요한 face를 전부 받아 보고, 하나라도 깨지면 실패다.
  for (const { family, selector, textOf } of [
    {
      family: 'Pretendard Variable',
      selector: '#post-content p',
      textOf: '#post-content',
    },
    {
      family: 'JetBrains Mono',
      selector: '#post-content pre code',
      textOf: '#post-content pre',
    },
  ]) {
    test(`${family} — ${selector}`, async ({ page }) => {
      await page.goto(codePost);
      await waitForHydration(page, '#post-content');
      const result = await page
        .locator(selector)
        .first()
        .evaluate(
          async (el, { family, textOf }) => {
            await document.fonts.ready;
            const first = getComputedStyle(el)
              .fontFamily.split(',')[0]
              ?.trim()
              .replace(/^["']|["']$/g, '');
            const text = [...document.querySelectorAll(textOf)]
              .map(node => node.textContent ?? '')
              .join('');
            const font = `16px "${family}"`;
            let loadError = '';
            let needed: FontFace[] = [];
            try {
              needed = await document.fonts.load(font, text);
            } catch (error) {
              loadError = String(error);
            }
            const faces = [...document.fonts].filter(
              f => f.family.replace(/^["']|["']$/g, '') === family,
            );
            return {
              first,
              faces: faces.length,
              needed: needed.length,
              notLoaded: needed.filter(f => f.status !== 'loaded').length,
              errored: faces
                .filter(f => f.status === 'error')
                .map(f => f.unicodeRange.slice(0, 40)),
              check: document.fonts.check(font, text),
              loadError,
            };
          },
          { family, textOf },
        );
      expect(result.first, '계산된 font-family의 첫 패밀리').toBe(family);
      expect(result.faces, `@font-face ${family}`).toBeGreaterThan(0);
      expect(result.loadError, `${family} 적재 실패`).toBe('');
      expect(result.needed, `글자에 필요한 ${family} face`).toBeGreaterThan(0);
      expect(result.notLoaded, `적재되지 않은 ${family} face`).toBe(0);
      expect(result.errored, `깨진 ${family} face`).toEqual([]);
      expect(result.check, `document.fonts.check(${family})`).toBe(true);
    });
  }
});

test('테마 토글이 html[data-theme]을 바꾸고 새로고침 뒤에도 유지된다', async ({
  page,
}) => {
  await page.goto('/');
  await waitForHydration(page, 'main');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: '테마 전환 (라이트/다크)' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // 시스템 설정(light)을 쿠키가 이겨야 한다 — 사전 페인트 스크립트의 우선순위.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
});

// 검색 다이얼로그는 열어야만 존재한다 — 페이지별 axe가 못 보는 UI라 여기서 연 채로 돌린다.
for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`검색 (${colorScheme})`, () => {
    test.use({ colorScheme });

    test('⌘K/Ctrl+K 검색이 열리고 알려진 글을 찾는다 — 목록·결과·결과 없음 axe', async ({
      page,
    }) => {
      const target = publishedPosts()[0];
      if (!target) throw new Error('검색할 글이 없습니다');

      await page.goto('/');
      await waitForHydration(page, 'main');
      await page.keyboard.press('ControlOrMeta+KeyK');

      const dialog = page.getByRole('dialog', { name: '글 검색' });
      await expect(dialog).toBeVisible();
      // 검색어가 없으면 최근 글 10편이 목록으로 나온다 — 결과 영역이 넘쳐 스크롤된다.
      await expect(dialog.getByRole('option')).toHaveCount(10);
      expect(await axeViolations(page), 'axe 위반 (검색어 없음)').toEqual([]);

      await dialog.getByRole('combobox', { name: '검색어' }).fill(target.title);
      await expect(
        dialog.getByRole('option').filter({ hasText: target.title }).first(),
      ).toBeVisible();
      expect(await axeViolations(page), 'axe 위반 (결과)').toEqual([]);

      await dialog
        .getByRole('combobox', { name: '검색어' })
        .fill('e2e-없는-검색어-zzzz');
      await expect(dialog.getByRole('status')).toHaveText(
        '검색 결과가 없습니다',
      );
      expect(await axeViolations(page), 'axe 위반 (결과 없음)').toEqual([]);
    });
  });
}

test('mermaid 펜스가 SVG로 그려진다', async ({ page }) => {
  const charts = mermaidChartCount(mermaidPost);
  await page.goto(mermaidPost);
  await waitForHydration(page, '#post-content');

  const svgs = page.locator('#post-content svg[id^="mermaid-"]');
  await expect(svgs).toHaveCount(charts);
  // 실패하면 MermaidChart가 원문을 role="note" 상자로 대신 보여 준다.
  await expect(page.locator('#post-content [role="note"]')).toHaveCount(0);
});

/** GA `dataLayer`에 쌓인 Web Vitals 이벤트 — `gtag()`가 넣는 항목은 `arguments` 객체라 배열로 편다. */
function webVitalsEvents(page: Page) {
  return page.evaluate(() => {
    const layer =
      (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ??
      [];
    return layer
      .map(entry => Array.from(entry))
      .filter(
        (args): args is ['event', string, Record<string, unknown>] =>
          args[0] === 'event' &&
          ['CLS', 'FCP', 'LCP', 'TTFB', 'INP'].includes(String(args[1])),
      )
      .map(([, name, params]) => ({ name, params }));
  });
}

// 등록이 빠지거나 GA 초기화보다 먼저 보고된 지표는 소리 없이 사라진다(sendGAEvent는 경고만
// 남긴다 — instrumentation-client가 곧바로 등록하면 FCP·TTFB가 빠졌다) — 실제로 실리는지 보는 양성 대조.
// 홈에서 글로 **소프트 내비게이션**한 뒤 숨긴다. LCP·CLS는 그때 보고되지만 재는 대상은
// 하드 로드한 홈이라, 이벤트가 그 순간의 주소(글)가 아니라 홈으로 찍혀야 한다.
test('Web Vitals가 하드 로드한 페이지 이름으로 GA dataLayer에 실린다', async ({
  page,
}) => {
  await page.goto('/');
  await waitForHydration(page, 'main');
  const landing = page.url();
  await page
    .locator('main a[href^="/posts/"]:not([href="/posts/"])')
    .first()
    .click();
  await page.waitForURL(/\/posts\/.+\//, { waitUntil: 'commit' });
  await waitForHydration(page, '#post-content');
  // 하드 내비게이션이었다면 아래 page_location 단언은 의미가 없다 — 문서가 그대로인지 본다.
  expect(
    await page.evaluate(
      () => performance.getEntriesByType('navigation')[0]?.name,
    ),
  ).toBe(landing);
  // LCP·CLS는 페이지가 숨겨질 때 확정된다 — 탭 전환을 흉내 낸다.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  await expect
    .poll(async () => (await webVitalsEvents(page)).map(e => e.name).sort())
    .toEqual(expect.arrayContaining(['CLS', 'FCP', 'LCP', 'TTFB']));
  for (const { name, params } of await webVitalsEvents(page)) {
    expect(params, name).toMatchObject({
      value: expect.any(Number),
      metric_id: expect.any(String),
      metric_value: expect.any(Number),
      metric_delta: expect.any(Number),
      metric_rating: expect.stringMatching(/^(good|needs-improvement|poor)$/),
      non_interaction: true,
      page_location: landing,
    });
    expect(Number.isInteger(params['value']), `${name} value 정수`).toBe(true);
  }
});
