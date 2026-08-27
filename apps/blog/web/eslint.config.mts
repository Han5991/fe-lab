import { resolve } from 'node:path';
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig } from 'eslint/config';
import boundaries from 'eslint-plugin-boundaries';
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
 * 타입 정보가 필요한 룰셋은 recommendedTypeCheckedOnly + projectService로 켠다.
 * 프로덕션 파일은 projectService가 tsconfig.json을 자동 발견하고, 테스트 파일은
 * 아래 전용 블록이 tsconfig.test.json 프로그램을 쓴다(각 블록 주석 참조).
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
      // vitest --coverage의 HTML 리포터가 뱉는 번들된 벤더 JS. 소스가 아니다.
      'coverage/**',
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

  // ── 타입 정보 기반 룰셋 ────────────────────────────────────────────────────
  // recommendedTypeCheckedOnly = recommended 중 타입 정보가 필요한 룰만.
  // (strict/stylistic 비-타입 룰은 위에서 이미 적용했으므로 *Only로 중복을 피한다)
  ...tseslint.configs.recommendedTypeCheckedOnly,
  {
    // projectService는 파일별로 가장 가까운 tsconfig.json을 자동 발견한다.
    // 프로덕션 소스는 전부 tsconfig.json 소속이므로 이걸로 충분하다.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 테스트 파일은 tsconfig.json이 exclude하고 tsconfig.test.json이 include한다
    // (프로덕션 전용 엄격 플래그 3개를 끄기 위한 분할 — PR5). projectService의
    // 자동 발견은 파일명이 tsconfig.json인 것만 찾으므로 테스트 파일이 "어느
    // 프로젝트에도 없음"으로 떨어진다. allowDefaultProject로 우회하지 않는 이유:
    // `**` 글롭을 금지해 테스트 위치(domain/·lib/·scripts/·src/)마다 패턴을
    // 나열해야 하고, 그렇게 열어도 tsconfig.test.json이 아니라 defaultProject
    // 단일 파일 추론으로 검사돼 check-types가 보는 프로그램과 어긋난다.
    // 대신 이 블록에서 tsconfig.test.json 프로그램을 명시해 check-types와
    // 정확히 같은 타입 환경으로 린트한다. 파일 목록은 tsconfig.test.json의
    // include와 대칭 — 저쪽을 고치면 여기도 함께 고칠 것.
    files: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'vitest.config.mts',
      'vitest.setup.ts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 설정 파일 등 JS는 어떤 tsconfig 프로그램에도 속하지 않는다 — 타입 룰 해제.
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

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
      // 스크롤 표 래퍼(role="region"+aria-label+tabIndex=0, PostBody.tsx)는 axe
      // scrollable-region-focusable이 요구하는 패턴이다 — 마우스 없이 스크롤할
      // 방법이 있어야 한다. 룰 기본 허용 목록(tabpanel)에 region을 더한다.
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { roles: ['tabpanel', 'region'] },
      ],
      // 위 4개(click-events-have-key-events · no-noninteractive-element-
      // interactions · interactive-supports-focus · no-static-element-
      // interactions)는 예전에 현행 위반 5건 때문에 'warn'으로 내려 두고
      // --max-warnings=5로 봉해 뒀다. 위반을 설계로 풀었으므로(MobileTOC 앵커,
      // CodeTabs 키 핸들러를 탭으로, SearchDialog 백드롭 presentation) 여기서
      // 되돌리지 않는다 — recommended의 'error'가 그대로 산다.
    },
  },

  {
    // Supabase CLI(`pnpm gen:types` → `supabase gen types --local`) 생성 파일 —
    // 손대면 재생성 때 되돌아온다. 생성기 출력 형태(type 별칭·인덱스 시그니처)에
    // 스타일 룰을 묻지 않는다.
    files: ['lib/platform/database.types.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      // 생성기가 union에 `never`를 남긴다(Functions가 빈 스키마일 때 등).
      '@typescript-eslint/no-redundant-type-constituents': 'off',
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

  // ── disable 주석 정책: 인라인 인가 전면 금지 ───────────────────────────────
  // 룰을 끄는 결정은 **이 파일에서만** 한다. 소스에 흩어진 한 줄짜리 인가는
  // 리뷰에서 diff 한 줄로 지나가고, 한 번 붙으면 근거가 유효한지 아무도 다시
  // 묻지 않는다. 여기서 끄면 최소한 "무엇을 왜 껐나"가 한곳에 모인다.
  {
    plugins: { '@eslint-community/eslint-comments': eslintComments },
    linterOptions: {
      // 인라인 설정 주석을 **읽지 않는다.** eslint-disable·eslint-enable·
      // eslint(룰 설정)·globals 전부 무효가 된다.
      noInlineConfig: true,
      reportUnusedInlineConfigs: 'error',
    },
    rules: {
      // noInlineConfig는 주석을 조용히 무시할 뿐이라, 그것만 켜면 "끈 줄 알았는데
      // 안 꺼진" 죽은 주석이 소스에 남는다. 주석 자체를 에러로 만들어 그 상태를
      // 없앤다 — 인가가 필요하면 이 설정 파일에 files 스코프로 적어야 한다.
      '@eslint-community/eslint-comments/no-use': 'error',
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

  // ── 아키텍처 경계 강제 (헥사고날 레이어링: src → domain → lib → shared) ─────
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
      // 수 있습니다. 클라이언트 import 자체를 lib/platform/client·lib/platform/publicClient로
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
    // 공개 페이지가 여는 배럴은 모듈 최상위에 부수효과를 두지 않습니다.
    // 번들러가 부수효과로 보는 순간, 거기 매달린 모듈 전부를 공개 청크에서
    // 떨궈내지 못합니다 — #326에서 `new AnalyticsService()` 하나가 계산 모듈
    // 전체를 모든 공개 페이지에 실었습니다. 싱글톤 생성은 admin 전용 배럴
    // (domain/*/admin.ts, domain/auth/index.ts)의 일이라 그쪽은 대상이 아닙니다.
    // 새 공개 배럴이 생기면 이 files 목록에 추가하세요. 산출물 쪽 안전망은
    // `pnpm build` 마지막의 check-bundle(마커 검사)이 맡습니다 — 이 룰은 원인을,
    // 그쪽은 결과를 봅니다.
    files: ['domain/analytics/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program > ExpressionStatement > NewExpression',
          message:
            '공개 배럴의 모듈 최상위 부수효과는 공개 청크 누수를 만듭니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector: 'Program > ExpressionStatement > CallExpression',
          message:
            '공개 배럴의 모듈 최상위 부수효과는 공개 청크 누수를 만듭니다. 호출이 필요하면 소비자 쪽으로 옮기세요.',
        },
        {
          selector:
            ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > NewExpression.init',
          message:
            '공개 배럴의 모듈 최상위 new는 번들러에 부수효과입니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector:
            ':matches(Program, Program > ExportNamedDeclaration) > VariableDeclaration > VariableDeclarator > CallExpression.init',
          message:
            '공개 배럴의 모듈 최상위 호출은 번들러에 부수효과입니다. 값이 필요하면 소비자 쪽에서 만드세요.',
        },
        // default export 경로도 막는다 — `export default new X()`는 위 두 계열
        // (표현식문·변수 초기화) 어느 쪽에도 매치되지 않는다(리뷰 지적).
        {
          selector: 'Program > ExportDefaultDeclaration > NewExpression',
          message:
            '공개 배럴의 모듈 최상위 new는 번들러에 부수효과입니다. 싱글톤 생성은 admin 배럴로 옮기세요.',
        },
        {
          selector: 'Program > ExportDefaultDeclaration > CallExpression',
          message:
            '공개 배럴의 모듈 최상위 호출은 번들러에 부수효과입니다. 값이 필요하면 소비자 쪽에서 만드세요.',
        },
      ],
    },
  },
  {
    // lib은 domain·src(상위 레이어)를 import할 수 없습니다. 아래로는 shared만 연다.
    files: ['lib/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/domain', '**/domain/**', '**/src', '**/src/**'],
              message: 'lib은 상위 레이어(domain·src)를 import할 수 없습니다.',
            },
          ],
        },
      ],
    },
  },
  {
    // shared(최하단)는 어떤 상위 레이어도 import할 수 없습니다 — 모든 레이어가
    // 기대는 라우트 상수 같은 순수 계약만 둡니다(외부는 @blog/content만, boundaries).
    //
    // shared는 **모든 레이어가 여는 유일한 폴더**라, 여기 뚫린 구멍은 앱 전체가
    // 공유한다. 그래서 import 방향(위 boundaries)에 더해 모듈의 **모양**까지 잠근다:
    //
    // (1) 재수출 금지 — `export … from` / `export * from`은 shared를 다른 모듈의
    //     2차 문으로 만드는 세탁 통로다. 특히 @blog/content 재수출은 배럴 좁히기
    //     (next.config의 optimizePackageImports가 '@blog/content' import 문만
    //     좁힌다)를 우회해 node:fs가 클라이언트 번들로 새는 길을 다시 연다.
    //     shared는 자기 선언만 내보낸다 — 패키지가 필요하면 소비자가 직접 연다.
    // (2) 모듈 최상위 문(statement) 금지 — 어디서나 import되는 모듈이라 부수효과가
    //     생기면 모든 청크에 함께 실린다(공개 배럴 규칙과 같은 이유). 'use client'
    //     지시문도 여기 걸린다 — shared는 클라이언트 경계가 아니다. 파생 상수의
    //     순수 함수 호출(`export const X = f(Y)`)은 문이 아니라 초기화라 걸리지
    //     않는다 — transitions.ts가 그 형태다.
    files: ['shared/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/lib',
                '**/lib/**',
                '**/domain',
                '**/domain/**',
                '**/src',
                '**/src/**',
              ],
              message:
                'shared는 최하단 레이어입니다. lib·domain·src를 import할 수 없습니다.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message:
            'shared에서 재수출(export * from)은 금지입니다 — shared가 다른 모듈의 2차 문이 되어 경계·배럴 최적화를 우회합니다. 자기 선언만 내보내세요.',
        },
        {
          selector: 'ExportNamedDeclaration[source]',
          message:
            'shared에서 재수출(export … from)은 금지입니다 — 필요한 쪽이 원본 모듈을 직접 여세요.',
        },
        {
          selector: 'Program > ExpressionStatement',
          message:
            'shared 모듈 최상위에는 문(statement)을 두지 않습니다 — 모든 레이어에 실려 가는 모듈이라 부수효과·지시문(use client)이 앱 전체에 퍼집니다.',
        },
      ],
    },
  },
  {
    // shared에는 컴포넌트가 없다 — .tsx 자체를 막는다. JSX 자동 런타임은 react
    // import 없이 컴파일되므로 boundaries의 외부 의존 차단만으로는 못 잡는다.
    // 컴포넌트는 src/, 여러 화면이 공유하는 컴포넌트도 src/components/shared/다.
    files: ['shared/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            'shared에는 .tsx(컴포넌트)를 두지 않습니다 — 순수 계약(.ts)만. 공유 컴포넌트는 src/components/shared/로.',
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

  // ── 레이어 경계 (eslint-plugin-boundaries) ─────────────────────────────────
  // element는 전부 **폴더 단위**다. `boundaries/files` 카테고리로 파일을 골라
  // element를 우회 배정하는 뒷문을 열지 않는다 — 폴더에 새 파일이 떨어지면
  // 자동으로 그 element를 상속하고, element 폴더 밖에 떨어지면
  // no-unknown-files가 잡는다.
  //
  // 레이어 순서(아래→위): shared → platform → analytics → app. shared는 모든
  // 레이어가 쓸 수 있는 최하단(라우트 상수 등 순수 계약)이다. 콘텐츠 레이어는
  // packages/@blog/content로 이사했다 — 그쪽 eslint.config.mjs가 같은 모델로
  // 내부 경계를 강제하고, 앱에서는 `@blog/content`가 외부 패키지(external)로
  // 보인다.
  //
  // no-unknown-files와 이 블록 전체는 **LAYERED 4개 폴더에만** 건다. 전역으로
  // 걸면 앱 루트의 설정 파일들이 전부 unknown이 되고, 오탐 시 탈출구가 없다.
  {
    files: ['{domain,lib,shared,src}/**/*.{js,mjs,cjs,ts,tsx,mts,cts}'],
    plugins: { boundaries },
    settings: {
      // 기준 경로가 **워크스페이스 루트**인 이유: @blog/content는 소스
      // 익스포트라 import가 pnpm 심링크 realpath(packages/@blog/content/src/…)
      // 로 해석된다. 기준이 앱 루트면 그 경로가 `../../../packages/…`가 되는데
      // micromatch의 `**`는 `..` 세그먼트를 건너지 못해 패키지 파일을 어떤
      // element에도 배정하지 못하고, 반대로 folder 패턴('src')은 경로 어디서든
      // 매치라 엉뚱하게 app으로 배정된다. 루트를 워크스페이스로 올리고 모든
      // 패턴을 앱 경로로 앵커해 둘 다 피한다. (lint 실행 cwd 비의존인 것은
      // 예전과 같다 — next.rootDir 주석 참고.)
      'boundaries/root-path': resolve(import.meta.dirname, '..', '..', '..'),
      'boundaries/elements-single-match': true,
      // v7에서 folder 매칭이 기본이라 mode는 쓰지 않는다.
      'boundaries/elements': [
        { type: 'content-pkg', pattern: 'packages/@blog/content' },
        { type: 'shared', pattern: 'apps/blog/web/shared' },
        { type: 'platform', pattern: 'apps/blog/web/lib/platform' },
        { type: 'analytics', pattern: 'apps/blog/web/domain/analytics' },
        { type: 'auth', pattern: 'apps/blog/web/domain/auth' },
        { type: 'app', pattern: 'apps/blog/web/src' },
      ],
      // 테스트는 element 배정은 그대로 두고 파일 카테고리 축으로만 표시한다.
      // 아래 policies 마지막 두 줄이 "테스트는 전부 import 가능 / 프로덕션은
      // 테스트를 import 불가"를 만든다 — 예전 ignores 방식보다 후자가 공짜다.
      'boundaries/files': [
        { category: 'test', pattern: ['**/*.test.*', '**/*.spec.*'] },
      ],
      // 'export'를 포함해 배럴의 `export * from`도 의존성으로 센다 — 안 세면
      // 배럴 한 줄로 모든 경계를 우회할 수 있다(src/components에 배럴 3개).
      'boundaries/dependency-nodes': ['import', 'dynamic-import', 'export'],
    },
    rules: {
      // element 폴더 밖에 떨어진 파일(예: lib/ 바로 아래 새 파일)을 막는다.
      'boundaries/no-unknown-files': 'error',
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // 로컬 element 간 의존뿐 아니라 외부 패키지·node 코어까지 전부 검사
          // 대상으로 — 레이어별 외부 화이트리스트가 아래 policies다.
          checkAllOrigins: true,
          // 같은 element 안의 import도 검사한다. 테스트가 프로덕션 파일과 같은
          // 폴더(=같은 element)에 살기 때문에, 이걸 꺼 두면 "프로덕션이 테스트를
          // import 금지"가 가장 흔한 사고(옆자리 *.test.ts import)를 못 잡는다.
          checkInternals: true,
          // 평가 규칙: 마지막으로 매치된 policy가 승패를 정한다(last-write-wins).
          policies: [
            // 같은 element 안에서는 자유 — 단, 아래 "테스트 import 금지"가
            // 뒤에 오므로 같은 폴더라도 프로덕션→테스트는 막힌다.
            {
              dependency: { relationship: { from: 'internal' } },
              allow: { to: { module: { origin: '*' } } },
            },
            // 로컬 의존: 각 레이어는 자기보다 아래 레이어만. 외부 의존: 실측
            // 화이트리스트(레이어에 새 외부 의존이 생기면 여기 추가해야 한다).
            // @blog/content는 여기서 외부 패키지다 — analytics가 패키지 유틸
            // (dates)을 그 문으로 가져온다.
            {
              // shared(최하단)는 앱 내부 어디에도 기대지 않는다 — 패키지의
              // 라우트 계약(encodePostSlug·POSTS_PATH)만 가져온다.
              from: { element: { type: 'shared' } },
              allow: [
                { to: { element: { types: { anyOf: ['content-pkg'] } } } },
              ],
            },
            {
              from: { element: { type: 'platform' } },
              allow: [
                { to: { element: { types: { anyOf: ['shared'] } } } },
                {
                  to: {
                    module: {
                      origin: 'external',
                      source: [
                        '@supabase/supabase-js',
                        '@supabase/postgrest-js',
                      ],
                    },
                  },
                },
              ],
            },
            {
              from: { element: { type: 'analytics' } },
              allow: [
                {
                  to: {
                    element: {
                      types: { anyOf: ['shared', 'platform', 'content-pkg'] },
                    },
                  },
                },
              ],
            },
            {
              // auth는 세션 API(client.auth)를 만지는 유일한 레이어다 —
              // supabase 타입도 여기서 끝내므로(구조적 부분형) 외부 의존이 없다.
              from: { element: { type: 'auth' } },
              allow: [
                {
                  to: { element: { types: { anyOf: ['shared', 'platform'] } } },
                },
              ],
            },
            {
              // app은 node 코어를 직접 만지지 않는다 — fs 접근은 전부
              // @blog/content(로더)의 일이다(클라이언트 번들 누수 예방,
              // 계획의 "배럴이 fs를 끌고 온다" 회귀 참고).
              //
              // platform도 직접 만지지 않는다 — Supabase 접근은 전부 도메인
              // 레이어(analytics·auth) 경유다. 예전에는 auth 세 파일(가드·
              // 로그아웃·로그인)이 예외로 client를 직접 import했고, 그걸 막던
              // no-restricted-syntax는 변수 이름 기반이라 alias로 우회 가능했다.
              // 여기서 import 경로 자체를 끊으면 우회가 없다.
              from: { element: { type: 'app' } },
              allow: [
                {
                  to: {
                    element: {
                      types: {
                        anyOf: ['shared', 'analytics', 'auth', 'content-pkg'],
                      },
                    },
                  },
                },
                { to: { module: { origin: 'external' } } },
              ],
            },
            // 프로덕션 코드는 테스트 파일을 import할 수 없다.
            { disallow: { to: { file: { categories: 'test' } } } },
            // 테스트는 무엇이든 import할 수 있다(마지막 매치가 이기므로
            // 바로 위 정책보다 뒤에 둬야 테스트→테스트도 허용된다).
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
