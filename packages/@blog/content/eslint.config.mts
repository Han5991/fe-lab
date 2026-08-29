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
 * 여기엔 컴포넌트가 없다(feedRenderer의 createElement 호출은 스크립트 코드다).
 *
 * 레이어 경계(boundaries)는 앱에 있던 콘텐츠 레이어 모델을 그대로 옮겨 왔다:
 * shared → content(post) → seo → build(scripts) → render-build(scripts/render).
 */
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
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'vitest.config.mts'],
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
  // element는 전부 폴더 단위(배럴 src/index.ts·src/seo/index.ts만 예외로
  // 스코프 밖). 새 파일이 element 폴더 밖(src/ 바로 아래)에 떨어지면
  // no-unknown-files가 잡는다.
  //
  // 레이어 순서(아래→위): shared → content(post) → seo → build(scripts) →
  // render-build(scripts/render) → cli(scripts/cli). 각 레이어는 자기보다 아래
  // 레이어만 import한다.
  {
    files: ['src/{shared,post,seo,scripts}/**/*.{js,mjs,cjs,ts,mts,cts}'],
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
      ],
      'boundaries/files': [
        { category: 'test', pattern: ['**/*.test.*', '**/*.spec.*'] },
      ],
      // 'export' 포함 — 배럴의 `export * from`도 의존성으로 센다.
      'boundaries/dependency-nodes': ['import', 'dynamic-import', 'export'],
    },
    rules: {
      'boundaries/no-unknown-files': 'error',
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
              // 렌더 생성기(rss·og·thumbnails)만 React 스택을 만질 수 있다.
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
                      source: [
                        'react',
                        'react-dom',
                        'react-markdown',
                        'remark-gfm',
                        'rehype-raw',
                        'satori',
                        'sharp',
                      ],
                    },
                  },
                },
              ],
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
