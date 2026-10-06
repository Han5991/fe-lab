/**
 * 런타임 게이트 — JS가 **실행된 뒤**의 블로그를 본다.
 *
 * 다른 게이트(`check-seo`·`check-bundle`·vitest/jsdom)는 전부 JS 실행 전의 산출물을
 * 본다. #392에서 클라이언트 컴포넌트가 mermaid 글의 본문을 통째로 지웠는데 PR 12개가
 * 모든 게이트를 통과했다 — 이 스위트가 그 사각지대를 맡는다.
 *
 * 서버는 프로덕션과 같은 `wrangler dev`(정적 자산 Worker, `wrangler.jsonc`의
 * `html_handling`·`not_found_handling` 그대로)다. 이 스위트는 빌드하지 않는다 —
 * `out/`이 없으면 바로 실패한다.
 */
import { defineConfig, devices } from '@playwright/test';
import { APP_ROOT, assertBuilt } from './support/site';

assertBuilt();

const PORT = Number(process.env['E2E_PORT'] ?? 8788);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CI = Boolean(process.env['CI']);

// 브라우저 바이너리를 바꿔 끼우는 탈출구 — `playwright install`을 쓸 수 없는 환경
// (브라우저가 미리 깔린 샌드박스 등)용. CI는 쓰지 않는다.
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];

export default defineConfig({
  testDir: '.',
  outputDir: '../.playwright/results',
  fullyParallel: true,
  forbidOnly: CI,
  // 기본은 재시도 0 — 봉인된(hermetic) 스위트라 흔들리면 그 자체가 결함이다(PR에서 드러나야 한다 —
  // PR은 페이지 표본만 연다).
  // 무인 cron 배포만 `E2E_RETRIES=1`을 준다(blog-e2e 액션의 `retries`): 한 번의 흔들림이
  // 그날 예약 글 공개를 막지 않게 하되, 재시도로 통과한 테스트는 리포트에 flaky로 남는다.
  retries: Number(process.env['E2E_RETRIES'] ?? 0),
  // CI는 코어(4)보다 많이 띄운다 — 페이지 검사는 대부분 관찰 창(`OBSERVE_MS`)을 기다리는 시간이라
  // 코어 수만큼만 띄우면 CPU가 논다(4 → 6에서 같은 스위트가 2.9분 → 2.4분).
  workers: CI ? 6 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // HTML 리포트·트레이스는 앱 루트의 `.playwright/`에 모인다 — CI가 실패 시 통째로 올린다.
  reporter: [
    ['list'],
    ['html', { outputFolder: '../.playwright/report', open: 'never' }],
    ...(CI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // 라이트가 기본이다 — 테마 사전 스크립트는 쿠키가 없으면 prefers-color-scheme을 따른다.
    colorScheme: 'light',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // 프로덕션과 같은 정적 자산 Worker. 자격 증명 없이 로컬(miniflare)로만 돈다.
    command: `pnpm exec wrangler dev --ip 127.0.0.1 --port ${PORT} --log-level warn --show-interactive-dev-session=false`,
    cwd: APP_ROOT,
    url: `${BASE_URL}/`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    // 메트릭 전송과 Request.cf 조회(workers.cloudflare.com)를 끈다 — 서버까지 봉인한다.
    env: {
      WRANGLER_SEND_METRICS: 'false',
      CLOUDFLARE_CF_FETCH_ENABLED: 'false',
    },
    gracefulShutdown: { signal: 'SIGINT', timeout: 5_000 },
  },
});
