import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * @blog/content ESLint 구성 — 앱(apps/blog/web)과 같은 엄격 수준.
 *
 * 이 패키지의 소스는 앱 program에 소스째 섞이므로(소스 익스포트), 린트 기준이
 * 앱과 어긋나면 같은 파일이 위치에 따라 다른 판정을 받는다. 앱 구성에서 React·
 * Next 계열(react-hooks·jsx-a11y·@next/eslint-plugin-next)만 뺀 부분집합이다 —
 * 여기엔 컴포넌트가 없다.
 *
 * 레이어 경계(boundaries)는 앱에 있던 콘텐츠 레이어 모델을 그대로 옮겨 왔다:
 * shared → content(post) → seo → build(scripts) → render-build(scripts/render).
 */
/**
 * 테스트 프로그램(tsconfig.test.json)에 속한 파일. 타입 정보 블록과 단언 규칙의 테스트
 * 예외가 이 값을 함께 쓴다.
 */
const TEST_FILES = [
  '**/*.test.{ts,tsx}',
  '**/*.spec.{ts,tsx}',
  'vitest.config.mts',
];

export default defineConfig([
  {
    // coverage/**: vitest --coverage의 HTML 리포터가 뱉는 번들된 벤더 JS. 소스가 아니다.
    ignores: ['node_modules/**', 'coverage/**'],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: {
      // 빌드 스크립트(node)가 중심이지만 shared에는 브라우저에서 도는 순수
      // 유틸(viewCookie의 document 등)도 있어 앱과 같은 조합으로 둘 다 연다.
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ── 기본 룰셋: 코어 recommended → typescript-eslint strict + stylistic ──
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // ── 타입 정보 기반 룰셋 ────────────────────────────────────────────────────
  ...tseslint.configs.recommendedTypeCheckedOnly,
  {
    // 프로덕션 소스는 projectService가 tsconfig.json을 자동 발견한다.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 테스트 파일은 tsconfig.json이 exclude하고 tsconfig.test.json이 include한다
    // — 앱과 같은 분할. check-types가 보는 프로그램과 정확히 같은 타입 환경.
    files: TEST_FILES,
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 설정 파일(eslint·vitest) 등 JS는 tsconfig program에 속하지 않는다.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    // 상대경로·확장자 없는 import의 경로 해석기 — boundaries가 요구한다.
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
  },

  // ── disable 주석 정책: 인라인 인가 전면 금지 (앱과 같은 기준) ─────────────
  // 룰을 끄는 결정은 이 파일에서만 한다. 근거는 앱 eslint.config.mjs 참조.
  {
    plugins: { '@eslint-community/eslint-comments': eslintComments },
    linterOptions: {
      noInlineConfig: true,
      reportUnusedInlineConfigs: 'error',
    },
    rules: {
      // 무효가 된 주석이 소스에 남아 "껐다"고 오해시키지 않도록 주석 자체를 막는다.
      '@eslint-community/eslint-comments/no-use': 'error',
    },
  },

  {
    files: ['**/*.{ts,mts,cts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
    },
  },

  // ── 타입이 말하는 만큼만 믿는다 (앱과 같은 기준 — 앱 설정의 같은 섹션 주석) ──
  // 재평가: 2027-04-17 — 그때까지 잡은 위반이 없는 규칙은 내린다(AGENTS.md §5).
  {
    files: ['**/*.{ts,mts,cts}'],
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
    },
  },
  {
    // 테스트는 연다 — fixture·mock을 만드는 단언과 방어 검사가 대부분이고 프로덕션으로
    // 새지 않는다.
    files: TEST_FILES,
    rules: {
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },

  // ── 레이어 경계 (eslint-plugin-boundaries) ─────────────────────────────────
  // element는 전부 폴더 단위이고, 이 블록은 src 전체에 걸린다. 패키지 문(`@blog/content`·
  // `/client`)도 자기 폴더(src/door)를 가진 레이어다 — src 안의 모든 파일이 등록된 레이어
  // 하나에 속하고, 나머지를 받아 주는 폴백 element는 없다. 새 폴더나 src 직속 파일은 어떤
  // element에도 속하지 않아 no-unknown-files가 그 파일에서 바로 막는다(레이어로 등록해야 열린다).
  // (`/seo` 문 src/seo/index.ts는 seo element 안에 있다.)
  //
  // 레이어 순서(아래→위): shared → content(post) → seo → build(scripts) →
  // render-build(scripts/render) → cli(scripts/cli). 각 레이어는 자기보다 아래
  // 레이어만 import한다.
  {
    files: ['src/**/*.{js,mjs,cjs,ts,mts,cts}'],
    plugins: { boundaries },
    settings: {
      'boundaries/root-path': import.meta.dirname,
      // 첫 매치 하나만 배정 — scripts/render가 render-build와 build(중첩 폴더)에
      // 동시에 걸리지 않도록 구체적인 패턴을 앞에 둔다.
      'boundaries/elements-single-match': true,
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/shared' },
        { type: 'content', pattern: 'src/post' },
        { type: 'seo', pattern: 'src/seo' },
        { type: 'cli', pattern: 'src/scripts/cli' },
        { type: 'render-build', pattern: 'src/scripts/render' },
        { type: 'build', pattern: 'src/scripts' },
        { type: 'door', pattern: 'src/door' },
      ],
      'boundaries/files': [
        { category: 'test', pattern: ['**/*.test.*', '**/*.spec.*'] },
      ],
      // 'export' 포함 — 배럴의 `export * from`도 의존성으로 센다.
      'boundaries/dependency-nodes': ['import', 'dynamic-import', 'export'],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
      // 어떤 element에도 없는 로컬 파일로 가는 import는 정책 검사를 건너뛴다(checkUnknownLocals
      // 기본값 false) — default disallow가 닿지 않는 뒷문이라 막는다. 재평가: 2027-04-22.
      'boundaries/no-unknown-dependencies': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          checkInternals: true,
          // 평가 규칙: 마지막으로 매치된 policy가 승패를 정한다(last-write-wins).
          policies: [
            {
              dependency: { relationship: { from: 'internal' } },
              allow: { to: { module: { origin: '*' } } },
            },
            {
              from: { element: { type: 'shared' } },
              allow: { to: { module: { origin: 'core' } } },
            },
            {
              from: { element: { type: 'content' } },
              allow: [
                { to: { element: { type: 'shared' } } },
                { to: { module: { origin: 'core' } } },
                {
                  to: { module: { origin: 'external', source: 'gray-matter' } },
                },
              ],
            },
            {
              // SEO 빌더는 순수 계산이다 — 콘텐츠와 shared만 읽는다.
              from: { element: { type: 'seo' } },
              allow: [
                {
                  to: { element: { types: { anyOf: ['shared', 'content'] } } },
                },
              ],
            },
            {
              from: { element: { type: 'build' } },
              allow: [
                {
                  to: {
                    element: { types: { anyOf: ['shared', 'content', 'seo'] } },
                  },
                },
                { to: { module: { origin: 'core' } } },
                {
                  to: { module: { origin: 'external', source: 'gray-matter' } },
                },
              ],
            },
            {
              // 렌더 생성기(og·thumbnails)만 네이티브 이미지 스택(satori·sharp)을 만질 수 있다.
              from: { element: { type: 'render-build' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['shared', 'content', 'seo', 'build'] },
                    },
                  },
                },
                { to: { module: { origin: 'core' } } },
                {
                  to: {
                    module: {
                      origin: 'external',
                      source: ['satori', 'sharp'],
                    },
                  },
                },
              ],
            },
            {
              // 문(src/door)은 공개 레이어를 다시 내보낼 뿐이다 — SEO는 자기
              // 문(src/seo/index.ts)이 따로 있고, 빌드 스크립트는 bin으로만 돈다.
              from: { element: { type: 'door' } },
              allow: {
                to: { element: { types: { anyOf: ['shared', 'content'] } } },
              },
            },
            {
              // CLI는 단계를 이름에 잇는 진입점이라 모든 단계를 든다. 위 레이어를
              // 참조하는 유일한 곳이고, 그래서 여기만 최상위에 둔다 — 대신 단계
              // 모듈은 전부 **동적** import라 부르지 않은 단계의 네이티브 의존
              // (satori·sharp)은 로드되지 않는다.
              from: { element: { type: 'cli' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: [
                          'shared',
                          'content',
                          'seo',
                          'build',
                          'render-build',
                        ],
                      },
                    },
                  },
                },
                { to: { module: { origin: 'core' } } },
                {
                  // 인자 파싱은 CLI만 안다 — 단계 모듈은 파싱된 값을 받는다.
                  to: { module: { origin: 'external', source: 'commander' } },
                },
              ],
            },
            // 프로덕션 코드는 테스트 파일을 import할 수 없다.
            { disallow: { to: { file: { categories: 'test' } } } },
            // 테스트는 무엇이든 import할 수 있다(마지막 매치가 이긴다).
            {
              from: { file: { categories: 'test' } },
              allow: { to: { module: { origin: '*' } } },
            },
          ],
        },
      ],
    },
  },
]);
