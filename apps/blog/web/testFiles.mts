/**
 * 이 앱의 테스트 파일이 어디에 있고 누가 돌리는지 — 한 출처.
 *
 * - 단위 테스트(`UNIT_TESTS`): vitest. 레이어 폴더(`NODE_LAYERS`)는 node 프로젝트, 나머지
 *   src는 jsdom 프로젝트가 돌린다. 두 프로젝트의 include가 같은 접미사(`TEST_SUFFIX`)에서
 *   나오므로, 타입 검사·lint는 받는데 어느 프로젝트도 돌리지 않는 단위 테스트는 생길 수 없다.
 * - 런타임 게이트(`E2E_FILES`): Playwright(`e2e/playwright.config.ts`).
 *
 * vitest.config.mts·eslint.config.mts·panda.config.ts가 여기서 파생한다. JSON이라 import할 수
 * 없는 tsconfig.json·tsconfig.test.json은 src/app/testFiles.test.ts가 같은 집합인지 잠근다.
 */
export const TEST_SUFFIX = '*.{test,spec}.{ts,tsx}';
export const UNIT_TESTS = `src/**/${TEST_SUFFIX}`;
/** node 환경에서 도는 src 아래 레이어 폴더 — DOM이 없는 순수 로직·와이어 계약. */
export const NODE_LAYERS = ['shared', 'domain', 'lib'] as const;
export const E2E_FILES = 'e2e/**/*.ts';
/** 테스트 프로그램(tsconfig.test.json)이 검사하는 파일 — 테스트와 그 러너 설정. */
export const TEST_PROGRAM_FILES = [
  UNIT_TESTS,
  E2E_FILES,
  'vitest.config.mts',
  'vitest.setup.ts',
];
