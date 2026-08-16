import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * ESLint 10 구성 — `eslint-config-next`를 걷어내고 플러그인을 직접 조립한다.
 *
 * 프리셋이 끌고 오는 eslint-plugin-react@7.x가 ESLint 10에서 제거된
 * `context.getFilename()`을 가드 없이 호출해(util/version.js의 version:'detect'
 * 경로) 린트가 통째로 죽는다. 여기서 조립하는 플러그인들은 전부 ESLint 10에서
 * 동작을 실측한 조합이다. react 계열 정적 검사는 react-hooks recommended-latest
 * (React Compiler 진단 룰 포함)가 담당한다 — next.config.ts의 reactCompiler와 짝.
 *
 * 타입 정보가 필요한 *-type-checked 룰셋은 여기 없다 — 별도 PR 몫.
 */
export default defineConfig([
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'public/**',
      'supabase/**',
      '.cache/**',
      'next-env.d.ts',
    ],
  },

  {
    // `eslint .`가 순회할 확장자 등록 + 전역 식별자. 이 앱은 빌드 스크립트(node)와
    // 클라이언트 컴포넌트(browser)가 한 트리에 있어 둘 다 연다 — config-next가
    // 넣어 주던 것과 같은 조합이다.
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ── 기본 룰셋: 코어 recommended → typescript-eslint strict + stylistic ──
  // 순서가 중요하다 — tseslint 프리셋 안의 eslint-recommended 오버라이드가
  // TS 파일에서 코어 no-undef·no-unused-vars 등(컴파일러가 이미 잡는 것)을
  // 꺼 주므로 코어를 먼저 두고 ts를 뒤에 둔다. strict는 recommended의 상위집합.
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  nextPlugin.configs['core-web-vitals'],
  {
    // 모노레포에서 lint 실행 cwd가 앱 루트라는 보장이 없으므로 명시한다.
    // 없으면 @next/next/no-html-link-for-pages가 cwd에서 pages/·app/을 찾는다.
    settings: { next: { rootDir: import.meta.dirname } },
  },

  reactHooks.configs.flat['recommended-latest'],

  jsxA11y.flatConfigs.recommended,
  {
    rules: {
      // 스크롤 표 래퍼(role="region"+aria-label+tabIndex=0, PostClient.tsx)는 axe
      // scrollable-region-focusable이 요구하는 패턴이다 — 마우스 없이 스크롤할
      // 방법이 있어야 한다. 룰 기본 허용 목록(tabpanel)에 region을 더한다.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { roles: ['tabpanel', 'region'] },
      ],
      // 아래 4개의 현행 위반(MobileTOC li onClick, CodeTabs tablist,
      // SearchDialog 백드롭)은 키보드 동선 설계 — 핸들러·role 추가 = DOM/동작
      // 변경 — 가 필요하다. 동작 무변경이 원칙인 이 PR에서는 에러로 못 올리므로
      // 경고로 남겨 두고, 후속에서 설계로 풀면서 에러로 올린다.
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
    },
  },

  {
    // Supabase CLI(`supabase gen types`) 생성 파일 — 손대면 재생성 때 되돌아온다.
    // 생성기 출력 형태(type 별칭·인덱스 시그니처)에 스타일 룰을 묻지 않는다.
    files: ['lib/database.types.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
    },
  },

  {
    // 별칭(@/)·확장자 없는 import의 경로 해석기. config-next가 사설 트리로
    // 제공하던 것을 명시 선언으로 바꾼다. 지금 이 설정을 읽는 룰은 없지만,
    // eslint-module-utils 기반 플러그인(boundaries 등)이 들어오는 즉시 이게
    // 없으면 별칭 import가 전부 미해석된다(옆 저장소 실측 104건).
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
    },
  },

  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },

  {
    rules: {
      // `_` prefix 식별자는 의도적 미사용으로 간주 (destructuring rest 패턴 등)
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
  {
    // SSG(GitHub Pages) 환경이라 next/image 자체가 비활성 — 의도적 <img> 사용
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },

  // ── 아키텍처 경계 강제 (헥사고날 레이어링: src → domain → lib) ──────────────
  // 경계를 컨벤션이 아니라 lint로 강제해 회귀를 막습니다.
  {
    // src(상위)는 domain/<x>의 공개 API(배럴)만 쓰고, repository(인프라)를 직접
    // 찌르거나 Supabase client를 직접 호출하지 않습니다.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      // `**/` 접두로 alias(@/domain/...)와 상대경로(../../domain/...) 양쪽을 차단.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // adminRepository처럼 접두사가 붙은 것도 함께 막습니다.
              group: [
                '**/domain/*/*[rR]epository',
                '**/domain/*/*[rR]epository.*',
              ],
              message:
                'repository는 인프라 레이어입니다. domain/<x> 공개 API(배럴, 예: @/domain/analytics, @/domain/analytics/admin)를 통해 접근하세요.',
            },
          ],
        },
      ],
      // 주의: 아래 selector는 식별자 이름(client/supabase/publicDb)에 매칭하므로,
      // Supabase 클라이언트를 임의 이름으로 alias하면(예: `client as db`) 우회될
      // 수 있습니다. 클라이언트 import 자체를 lib/client·lib/publicClient로
      // 한정하는 컨벤션과 함께 봐야 합니다. 새 클라이언트를 만들면 이 정규식에도
      // 이름을 추가하세요 — 안 그러면 가드에 구멍이 생깁니다.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='from'][callee.object.name=/^(client|supabase|publicDb)$/]",
          message:
            'Supabase 데이터 접근은 src에서 직접 하지 말고 domain repository/service(배럴)를 통하세요.',
        },
        {
          selector:
            "CallExpression[callee.property.name='rpc'][callee.object.name=/^(client|supabase|publicDb)$/]",
          message:
            'Supabase RPC는 src에서 직접 호출하지 말고 domain repository를 통하세요.',
        },
      ],
    },
  },
  {
    // domain(중간)은 상위 레이어(src)를 import할 수 없습니다(역방향 의존 금지).
    files: ['domain/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src', '**/src/**'],
              message: 'domain은 상위 레이어(src)를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    // lib(최하위)은 domain·src를 import할 수 없습니다.
    files: ['lib/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domain', '**/domain/**', '**/src', '**/src/**'],
              message:
                'lib은 최하위 레이어입니다. domain·src를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    // 타입은 항상 `import type`으로 — isolatedModules 정확성 + 번들 누수 예방.
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
    },
  },
]);
