/**
 * hydration 대기와 본문 구조 비교 — #413류(클라이언트 컴포넌트가 hydration 뒤에
 * 서버가 그린 본문을 지운다)를 잡는 검사의 부품.
 *
 * 비교의 두 쪽:
 * - **서버 HTML** — 같은 URL의 원문을 받아 브라우저의 `DOMParser`로 파싱한다. 파싱된
 *   문서는 스크립트를 실행하지 않으므로 JS를 끈 방문과 같은 DOM이 나온다(두 번째
 *   내비게이션 없이).
 * - **hydration 뒤 DOM** — React가 본문을 가져가고(파이버가 붙고) 네트워크가 잠잠해진
 *   뒤, 다시 관찰 창(`OBSERVE_MS`)이 지나고 DOM이 조용해진 뒤(`settle`).
 *
 * 비교 축은 셋이다 — 셀 요소 수, 글자 수, 가시성. 수만 세면 글자를 비우거나
 * `display:none`으로 가린 본문이 통과한다.
 */
import type { Page } from '@playwright/test';

/**
 * 셀 요소. 글 상세의 본문에 늘 있고, 클라이언트가 **바꿀 이유가 없는** 것만 고른다.
 *
 * - `svg` 안은 세지 않는다 — mermaid가 placeholder를 SVG로 바꾸면서 노드 라벨마다
 *   `<p>`를 만든다(htmlLabels). 그건 본문이 늘어난 게 아니라 그림이다.
 * - mermaid 펜스는 서버에서 `<pre>`가 아니라 빈 placeholder `<div>`로 나간다
 *   (`MermaidLazy`의 `loading`) — 그래서 `pre`도 양쪽 수가 같아야 한다. 렌더가 실패해
 *   원문 `<pre>`로 떨어지면 수가 달라져 여기서도 잡힌다.
 */
export const STRUCTURE_TAGS = [
  'h2',
  'h3',
  'h4',
  'p',
  'li',
  'pre',
  'table',
  'blockquote',
  'img',
  'a',
] as const;

export type StructureCounts = Record<(typeof STRUCTURE_TAGS)[number], number>;

/** 페이지의 본문 영역. 글 상세는 `#post-content`(PostBody의 DOM 계약), 나머지는 `<main>`. */
export function contentSelector(route: string): string {
  return /^\/posts\/.+/.test(route) ? '#post-content' : 'main';
}

/**
 * React가 문서를 hydrate할 때까지(본문 영역에 파이버가 붙을 때까지) 기다리고, 그 뒤
 * 지연 청크(mermaid 등)·데이터 요청이 끝나 네트워크가 잠잠해질 때까지 기다린다.
 */
export async function waitForHydration(
  page: Page,
  selector: string,
): Promise<void> {
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    return (
      el !== null && Object.keys(el).some(k => k.startsWith('__reactFiber$'))
    );
  }, selector);
  await page.waitForLoadState('networkidle');
}

/**
 * 관찰 창 — 검사는 내비게이션 시작부터 최소 이만큼 지난 뒤에 본다.
 *
 * hydration 직후 한 장만 찍으면 타이머·idle 콜백·IntersectionObserver처럼 **조금 늦게**
 * 도는 클라이언트 코드가 본문을 지워도 통과한다(1.5초·4초 뒤 지우기가 실제로 통과했다).
 * 창 안에서 생기는 DOM 변화·콘솔 에러·axe 위반은 axe가 얼마나 걸리든 결정적으로
 * 잡히고, 창 밖(사용자 입력 없이 5초 넘어 도는 코드)은 이 게이트의 범위 밖이다.
 */
export const OBSERVE_MS = 5_000;
/** 창이 끝난 뒤에도 DOM이 이만큼 조용해야 검사한다. */
const QUIET_MS = 1_000;
/** 계속 바뀌는 DOM(애니메이션 등)이 테스트를 붙잡지 않게 하는 상한. */
const SETTLE_MAX_MS = 15_000;

/**
 * 사용자가 읽는 것처럼 끝까지 내렸다가 올라와(스크롤·교차 관찰로 도는 코드를 깨운다)
 * 관찰 창이 지나고 `<body>`가 조용해질 때까지 기다린다.
 *
 * `observeMs`를 0으로 주면 창은 건너뛰고 조용해지기만 기다린다 — 같은 페이지를 이미
 * 창까지 지켜본 검사(`pages.spec.ts`)가 있는 대표 페이지 검사(다크·모바일)용이다.
 */
export async function settle(
  page: Page,
  { observeMs = OBSERVE_MS }: { observeMs?: number } = {},
): Promise<void> {
  await page.evaluate(async () => {
    const frame = () =>
      new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const step = Math.max(window.innerHeight, 400);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await frame();
    }
    window.scrollTo(0, 0);
    await frame();
  });
  await page.evaluate(
    async ({ observeMs, quietMs, maxMs }) => {
      let last = performance.now();
      const observer = new MutationObserver(() => {
        last = performance.now();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      const deadline = performance.now() + maxMs;
      await new Promise<void>(resolve => {
        const tick = () => {
          const now = performance.now();
          if ((now >= observeMs && now - last >= quietMs) || now >= deadline) {
            observer.disconnect();
            resolve();
          } else {
            setTimeout(tick, 100);
          }
        };
        tick();
      });
    },
    { observeMs, quietMs: QUIET_MS, maxMs: SETTLE_MAX_MS },
  );
}

/** 본문 영역 한 장 — 셀 요소 수와 글자 수, 그리고 (라이브 DOM이면) 가려진 요소. */
export interface ContentSnapshot {
  counts: StructureCounts;
  /** `svg`·`script`·`style` 밖 글자 수(공백 제외). 글자를 비운 본문을 잡는다. */
  textLength: number;
  /**
   * 화면에 안 보이는 셀 요소(`checkVisibility`). 닫힌 `<details>`의 내용만 정당하게
   * 가려진다 — 그 밖은 수는 같아도 독자에겐 지워진 것과 같다(`display:none`된 본문).
   */
  hidden: string[];
  /** 본문 영역의 렌더 높이(px). 서버 쪽은 렌더하지 않으므로 -1. */
  height: number;
}

/** 서버 HTML(같은 URL의 원문을 `DOMParser`로)과 지금 DOM 쪽의 본문 한 장. */
export async function snapshotContent(
  page: Page,
  selector: string,
  html?: string,
): Promise<ContentSnapshot> {
  return page.evaluate(
    ({ html, selector, tags }) => {
      const doc =
        html === undefined
          ? document
          : new DOMParser().parseFromString(html, 'text/html');
      const root = doc.querySelector(selector);
      const cells = root
        ? tags.flatMap(tag =>
            [...root.querySelectorAll(tag)].filter(el => !el.closest('svg')),
          )
        : [];
      const counts = Object.fromEntries(
        tags.map(tag => [
          tag,
          root ? cells.filter(el => el.localName === tag).length : -1,
        ]),
      ) as StructureCounts;
      let textLength = -1;
      if (root) {
        const copy = root.cloneNode(true) as Element;
        for (const el of copy.querySelectorAll('svg, script, style')) {
          el.remove();
        }
        textLength = (copy.textContent ?? '').replace(/\s+/g, '').length;
      }
      const live = html === undefined;
      const hidden = live
        ? cells
            .filter(
              el =>
                !el.checkVisibility({
                  visibilityProperty: true,
                  opacityProperty: true,
                }),
            )
            .filter(el => {
              const closed = el.closest('details:not([open])');
              return !closed || el.closest('summary') !== null;
            })
            .map(
              el => `${el.localName}: ${(el.textContent ?? '').slice(0, 40)}`,
            )
        : [];
      const height =
        live && root ? Math.round(root.getBoundingClientRect().height) : -1;
      return { counts, textLength, hidden, height };
    },
    { html, selector, tags: [...STRUCTURE_TAGS] },
  );
}

/** 같은 URL의 서버 HTML 원문 — JS를 끈 방문과 같은 DOM의 재료. */
export async function serverHtml(page: Page): Promise<string> {
  const response = await page.request.get(page.url());
  return response.text();
}
