import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'public/**', 'supabase/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
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
              group: ['**/domain/*/repository', '**/domain/*/repository.*'],
              message:
                'repository는 인프라 레이어입니다. domain/<x> 공개 API(배럴, 예: @/domain/analytics)를 통해 접근하세요.',
            },
          ],
        },
      ],
      // 주의: 아래 selector는 식별자 이름(client/supabase)에 매칭하므로, Supabase
      // 클라이언트를 임의 이름으로 alias하면(예: `client as db`) 우회될 수 있습니다.
      // 클라이언트 import 자체를 lib/client로 한정하는 컨벤션과 함께 봐야 합니다.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='from'][callee.object.name=/^(client|supabase)$/]",
          message:
            'Supabase 데이터 접근은 src에서 직접 하지 말고 domain repository/service(배럴)를 통하세요.',
        },
        {
          selector:
            "CallExpression[callee.property.name='rpc'][callee.object.name=/^(client|supabase)$/]",
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
];

export default eslintConfig;
