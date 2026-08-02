import { createRequire } from 'node:module';

import { defineConfig } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import reactHooks from 'eslint-plugin-react-hooks';

// eslint-config-next는 `settings.react.version: 'detect'`를 넣는데, 그 자동 감지
// 경로(eslint-plugin-react `util/version.js`의 resolveBasedir)가 ESLint 10에서
// 제거된 `context.getFilename()`을 폴백 없이 호출해 린트가 통째로 죽습니다
// (TypeError: contextOrFilename.getFilename is not a function).
// 버전을 문자열로 주면 'detect' 분기 자체를 타지 않아 크래시를 피합니다.
// 하드코딩 대신 실제 설치된 react를 읽어 'detect'와 같은 값을 유지합니다 —
// catalog에서 react를 올려도 따라옵니다.
// eslint-plugin-react가 ESLint 10을 지원하면(peer에 ^10 추가) 이 블록은 제거 가능.
const reactVersion = createRequire(import.meta.url)(
  'react/package.json',
).version;

// flat config의 settings 병합은 최상위 키 단위라, `settings.react`를 그냥 쓰면
// 상위 설정이 넣은 react 하위 키가 통째로 날아갑니다(`import/*` 키는 남지만
// react 하위는 교체됨). 지금 eslint-config-next가 넣는 건 version 하나뿐이라
// 손실이 없지만, 나중에 pragma 같은 키가 추가되면 조용히 사라지므로 상속값을
// 먼저 모아 두고 version만 덮어씁니다.
const inheritedReactSettings = [...nextCoreWebVitals, ...nextTypescript].reduce(
  (acc, config) => ({ ...acc, ...(config.settings?.react ?? {}) }),
  {},
);

export default defineConfig([
  {
    ignores: ['.next/**', 'out/**', 'public/**', 'supabase/**'],
  },
  // core-web-vitals가 react recommended + react-hooks v7(recommended-latest의
  // React Compiler 진단 룰: purity/immutability/refs/set-state-in-render 등)을
  // 이미 error로 포함합니다. next.config.ts의 reactCompiler: true와 짝.
  ...nextCoreWebVitals,
  ...nextTypescript,
  // 위 두 설정이 넣은 `react.version: 'detect'`를 덮어씁니다. 순서 의존적이라
  // nextCoreWebVitals 뒤에 와야 합니다.
  {
    settings: {
      react: { ...inheritedReactSettings, version: reactVersion },
    },
  },
  {
    // recommended-latest 중 core-web-vitals에서 유일하게 빠진 컴파일러 룰.
    // core-web-vitals와 동일한 플러그인 인스턴스라 재등록 충돌 없음.
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/void-use-memo': 'error',
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
