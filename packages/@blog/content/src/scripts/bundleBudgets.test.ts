import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import type { BundleBudgetsConfig } from '../shared/contentConfig.ts';
import { defineTestContent } from '../shared/testValues.ts';
import { checkBudgets, formatBudgetTable } from './bundleBudgets.ts';
import { main } from './check-bundle.ts';
import { collectPages } from './check-seo.ts';
import { createContext } from './context.ts';
import { measurePages } from './measure-bundle.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

/** 산출물 하나를 tmpdir에 짓는다 — 측정이 실제 파일을 읽고 압축하므로 씨앗은 fs다. */
function buildOut(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'budget-'));
  dirs.push(dir);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

/**
 * gzip이 거의 줄이지 못하는 본문 — 고정 시드의 의사 난수라 크기가 실행마다 같다.
 * `kb`는 대략의 gzip KB다(문자 하나가 6비트 남짓이라 압축 후 ~0.75배).
 */
function noise(kb: number, seed: number): string {
  let state = seed;
  let out = '';
  const alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';
  for (let i = 0; i < Math.round((kb * 1024) / 0.75); i += 1) {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    // 하위 비트는 주기가 짧다(LCG) — 상위 비트에서 뽑는다.
    out += alphabet[(state >>> 16) % alphabet.length];
  }
  return out;
}

const CHUNKS = '/_next/static/chunks';
const page = (...assets: string[]) =>
  `<!doctype html><html><head>${assets
    .map(a =>
      a.endsWith('.css')
        ? `<link rel="stylesheet" href="${a}">`
        : `<script src="${a}" async></script>`,
    )
    .join('')}</head><body>hi</body></html>`;

/** 홈·글 두 그룹 — 글 하나만 무거운 청크를 더 싣는다. */
function site(): string {
  return buildOut({
    'index.html': page(`${CHUNKS}/main.js`, '/_next/static/css/app.css'),
    'posts/index.html': page(`${CHUNKS}/main.js`, '/_next/static/css/app.css'),
    'posts/light/index.html': page(
      `${CHUNKS}/main.js`,
      '/_next/static/css/app.css',
    ),
    'posts/heavy/index.html': page(
      `${CHUNKS}/main.js`,
      `${CHUNKS}/heavy.js`,
      '/_next/static/css/app.css',
    ),
    '_next/static/chunks/main.js': noise(4, 1),
    '_next/static/chunks/heavy.js': noise(8, 2),
    '_next/static/css/app.css': noise(1, 3),
  });
}

const measured = (out: string) => measurePages(collectPages(out), out);

// 픽스처 예산은 실제 사이트 값과 일부러 다른 자릿수다 — 소비자의 숫자를 베끼지 않는다.
// 측정(홈·글 JS ~4.0 KB, 무거운 글 ~11.7 KB, CSS ~1.05 KB)과 상한 사이가 `budget-slack`
// 하한(80%) 안쪽이 되게 잡는다.
const ROOT_AND_POSTS: BundleBudgetsConfig = [
  { group: '/', jsGzipKB: 4.5, cssGzipKB: 1.2 },
  { group: '/posts/', jsGzipKB: 13, cssGzipKB: 1.2 },
];

test('모든 그룹이 상한 아래면 위반이 없고, 표에 그룹마다 최대값이 찍힌다', () => {
  const report = checkBudgets(ROOT_AND_POSTS, measured(site()));

  expect(report.violations).toStrictEqual([]);
  expect(report.rows.map(r => [r.group, r.pages])).toStrictEqual([
    ['/', 1],
    ['/posts/', 3],
  ]);
  const posts = report.rows.find(r => r.group === '/posts/');
  const root = report.rows.find(r => r.group === '/');
  // 그룹 최대는 무거운 글의 것이다 — 중앙값이면 예산 밖으로 숨는다.
  expect(posts?.maxJsGzip).toBeGreaterThan(root?.maxJsGzip ?? Infinity);
  expect(formatBudgetTable(report.rows)).toHaveLength(3);
});

test('over-budget: 가장 무거운 페이지·지표·측정값 대 상한·큰 파일을 말한다', () => {
  const out = site();
  const pages = measured(out);
  const heavy = pages.find(p => p.path === '/posts/heavy/');
  const light = pages.find(p => p.path === '/posts/light/');
  if (!heavy || !light) throw new Error('픽스처 페이지가 없습니다');
  // 상한을 두 글 사이에 둔다 — 무거운 글만 넘친다.
  const limitKB = Math.ceil((light.jsGzip + 1) / 1024);
  expect(heavy.jsGzip).toBeGreaterThan(limitKB * 1024);

  const { violations } = checkBudgets(
    [ROOT_AND_POSTS[0], { ...ROOT_AND_POSTS[1], jsGzipKB: limitKB }],
    pages,
  );

  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['over-budget', '/posts/'],
  ]);
  const message = violations[0]?.message ?? '';
  expect(message).toContain('/posts/heavy/');
  expect(message).toContain('JS');
  expect(message).toContain(`${(heavy.jsGzip / 1024).toFixed(1)} KB`);
  expect(message).toContain(`예산 ${String(limitKB)} KB`);
  // 원인 후보는 무거운 순 — 더 큰 heavy.js가 main.js보다 먼저 나온다.
  expect(message.indexOf(`${CHUNKS}/heavy.js`)).toBeGreaterThan(-1);
  expect(message.indexOf(`${CHUNKS}/heavy.js`)).toBeLessThan(
    message.indexOf(`${CHUNKS}/main.js`),
  );
});

test('over-budget: 한 그룹에서 여러 페이지가 넘치면 가장 무거운 페이지 하나로 묶고 나머지 수를 센다', () => {
  const { violations } = checkBudgets(
    [ROOT_AND_POSTS[0], { ...ROOT_AND_POSTS[1], jsGzipKB: 1 }],
    measured(site()),
  );
  expect(violations).toHaveLength(1);
  expect(violations[0]?.message).toContain('/posts/heavy/');
  expect(violations[0]?.message).toContain('같은 그룹 2개 페이지도 초과');
});

test('CSS도 따로 잰다 — JS가 통과해도 CSS 초과는 실패다', () => {
  const { violations } = checkBudgets(
    [{ ...ROOT_AND_POSTS[0], cssGzipKB: 0.5 }, ROOT_AND_POSTS[1]],
    measured(site()),
  );
  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['over-budget', '/'],
  ]);
  expect(violations[0]?.message).toContain('CSS');
  expect(violations[0]?.message).toContain('/_next/static/css/app.css');
});

test('budget-slack: 측정 최대가 상한의 80% 아래면 느슨한 예산으로 실패한다', () => {
  const { violations } = checkBudgets(
    [ROOT_AND_POSTS[0], { ...ROOT_AND_POSTS[1], jsGzipKB: 20 }],
    measured(site()),
  );
  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['budget-slack', '/posts/'],
  ]);
  expect(violations[0]?.message).toContain('JS');
  expect(violations[0]?.message).toContain('예산 20 KB');
});

test('budget-slack: 수집기가 태그를 하나도 못 찾으면 상한만으로는 통과하지만 하한에 걸린다', () => {
  // Next가 태그 모양을 바꿔 청크를 못 찾는 날 — 모든 페이지가 HTML만 남아 "가볍다".
  const out = site();
  for (const rel of [
    'index.html',
    'posts/index.html',
    'posts/light/index.html',
    'posts/heavy/index.html',
  ]) {
    const file = join(out, rel);
    writeFileSync(
      file,
      readFileSync(file, 'utf8').replaceAll(
        '<script src=',
        '<script data-src=',
      ),
    );
  }

  const { violations } = checkBudgets(ROOT_AND_POSTS, measured(out));

  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['budget-slack', '/'],
    ['budget-slack', '/posts/'],
  ]);
  expect(violations[0]?.message).toContain('수집기');
});

test('budget-dead: 페이지가 0개인 그룹의 예산은 아무것도 지키지 않으므로 실패다', () => {
  const { violations } = checkBudgets(
    [...ROOT_AND_POSTS, { group: '/series/', jsGzipKB: 4.5, cssGzipKB: 1.2 }],
    measured(site()),
  );
  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['budget-dead', '/series/'],
  ]);
});

test('unbudgeted-group: 예산 없는 그룹이 산출물에 있으면 측정값과 함께 실패한다', () => {
  const out = site();
  mkdirSync(join(out, 'about'));
  writeFileSync(join(out, 'about', 'index.html'), page(`${CHUNKS}/main.js`));

  const { violations, rows } = checkBudgets(ROOT_AND_POSTS, measured(out));

  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['unbudgeted-group', '/about/'],
  ]);
  expect(violations[0]?.message).toContain('/about/');
  expect(rows.find(r => r.group === '/about/')?.budget).toBeUndefined();
});

test('asset-missing: 참조한 자산이 없으면 0으로 삼키지 않고 실패한다', () => {
  // 없는 파일을 0으로 세면 "가벼워졌다"로 보여 예산을 조용히 통과한다.
  const out = site();
  writeFileSync(
    join(out, 'index.html'),
    page(`${CHUNKS}/main.js`, `${CHUNKS}/gone.js`, '/_next/static/css/app.css'),
  );

  const { violations } = checkBudgets(ROOT_AND_POSTS, measured(out));

  expect(violations.map(v => [v.rule, v.group])).toStrictEqual([
    ['asset-missing', '/'],
  ]);
  expect(violations[0]?.message).toContain(`${CHUNKS}/gone.js`);
});

// ── main: check-bundle이 예산을 실제 산출물에 돌린다 ─────────────────────────

/** main을 돌리고 출력과 종료 코드를 모은다 — exit는 던져서 흐름을 끊는다. */
function runMain(out: string, budgets: BundleBudgetsConfig) {
  const logs: string[] = [];
  const errors: string[] = [];
  const log = vi
    .spyOn(console, 'log')
    .mockImplementation((...args: unknown[]) => {
      logs.push(args.join(' '));
    });
  const error = vi
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      errors.push(args.join(' '));
    });
  const exit = vi.spyOn(process, 'exit').mockImplementation(code => {
    throw new Error(`exit ${String(code)}`);
  });
  let exitCode: number | undefined;
  try {
    main(
      createContext(
        defineTestContent({ root: out, bundleBudgets: budgets }),
        join(out, 'content.config.mts'),
      ),
      out,
    );
  } catch (thrown) {
    const match = /^exit (\d+)$/.exec((thrown as Error).message);
    if (!match) throw thrown;
    exitCode = Number(match[1]);
  } finally {
    log.mockRestore();
    error.mockRestore();
    exit.mockRestore();
  }
  return { logs: logs.join('\n'), errors: errors.join('\n'), exitCode };
}

test('main: 예산만 선언해도(규칙 없이) 산출물을 재고 통과하면 표와 함께 끝난다', () => {
  const result = runMain(site(), ROOT_AND_POSTS);
  expect(result.exitCode).toBeUndefined();
  expect(result.logs).toContain('번들 예산 2개 그룹 통과');
  expect(result.logs).toContain('/posts/');
  expect(result.errors).toBe('');
});

test('main: 예산을 넘기면 위반을 찍고 exit(1)', () => {
  const result = runMain(site(), [
    ROOT_AND_POSTS[0],
    { ...ROOT_AND_POSTS[1], jsGzipKB: 1 },
  ]);
  expect(result.exitCode).toBe(1);
  expect(result.errors).toContain('[over-budget]');
  expect(result.errors).toContain('/posts/heavy/');
});
