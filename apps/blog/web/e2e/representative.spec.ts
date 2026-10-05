/**
 * 대표 페이지(홈·글 목록·시리즈·코드가 가장 많은 글·mermaid 글·404, 그리고 리터럴
 * 글자색이 남은 글)에서만 도는 검사.
 * 전 페이지에 돌리기엔 비싸고, 레이아웃·테마는 페이지 종류마다 하나씩이면 덮인다.
 *
 * - 다크 테마 axe — 색 토큰은 라이트/다크 두 벌이라 대비도 두 번 봐야 한다.
 * - 모바일(375px) 가로 넘침 — 레일·거터(`Rail.tsx`)가 좁은 화면에서 깨지면 내용이
 *   화면 밖으로 나간다. 상자 기반 검사(jsdom)로는 보이지 않는다.
 *
 * 넘침은 `documentElement.scrollWidth`만으로는 못 본다 — 본문은 `PageTransition`의
 * `overflowX: clip` 안에 있어, 넓은 요소가 잘려 읽을 수 없게 돼도 문서 폭은 그대로다.
 * 그래서 요소마다 상자를 잰다. 일부러 가로 스크롤하는 상자(코드 블록·표, overflow-x
 * auto/scroll) 안은 넘쳐도 정상이라 뺀다.
 */
import { axeViolations } from './support/a11y';
import { contentSelector, settle, waitForHydration } from './support/dom';
import { expect, test } from './support/fixtures';
import { representatives } from './support/site';

const { routes } = representatives();

test.describe('다크 테마', () => {
  test.use({ colorScheme: 'dark' });

  for (const route of routes) {
    test(`axe ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForHydration(page, contentSelector(route));
      await settle(page, { observeMs: 0 });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await axeViolations(page), 'axe 위반 (다크)').toEqual([]);
    });
  }
});

test.describe('모바일 375px', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  for (const route of routes) {
    test(`가로 넘침 없음 ${route}`, async ({ page }) => {
      await page.goto(route);
      await waitForHydration(page, contentSelector(route));
      await settle(page, { observeMs: 0 });
      const { scrollWidth, clientWidth, outside } = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const inScroller = (el: Element) => {
          for (let a = el.parentElement; a; a = a.parentElement) {
            const { overflowX } = getComputedStyle(a);
            if (overflowX === 'auto' || overflowX === 'scroll') return true;
          }
          return false;
        };
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: width,
          outside: [...document.body.querySelectorAll('*')]
            .filter(el => {
              const box = el.getBoundingClientRect();
              return (
                box.width > 0 &&
                box.height > 0 &&
                (box.right > width + 1 || box.left < -1) &&
                !inScroller(el)
              );
            })
            .slice(0, 10)
            .map(
              el =>
                `<${el.localName} class="${el.getAttribute('class') ?? ''}"> ${Math.round(el.getBoundingClientRect().left)}..${Math.round(el.getBoundingClientRect().right)}px`,
            ),
        };
      });
      expect(clientWidth).toBe(375);
      expect(scrollWidth, '문서가 뷰포트보다 넓다').toBeLessThanOrEqual(
        clientWidth,
      );
      expect(outside, '뷰포트 밖으로 나간 요소').toEqual([]);
    });
  }
});
