import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * `apps/blog/web`·`@blog/content`와 **같은 엄격 수준**으로 조립한다
 * (strict + stylistic + recommendedTypeCheckedOnly).
 *
 * 이 코드는 블로그 앱에서 그대로 옮겨 온 것이라, 패키지로 나오면서 lint 밖으로
 * 나가면 규율이 조용히 한 단 낮아진다 — 옮긴 것 자체가 회귀가 된다.
 * `@blog/diagram`·`@blog/site-values`가 lint를 두지 않은 것과 다른 판단인데,
 * 그 둘은 순수 리터럴·순수 계산이라 tsconfig가 사실상 전부인 반면 여기에는
 * 저장소·검증·에러 처리가 있다.
 *
 * 인라인 `eslint-disable`은 금지다(`noInlineConfig` + eslint-comments의 `no-use`).
 * 예외가 필요하면 주석이 아니라 이 파일에 `files` 스코프로 적는다.
 *
 * `eslint-plugin-boundaries`는 두지 않는다 — 이 패키지는 레이어가 아니라
 * 소스 열셋(테스트까지 스물)의 평평한 묶음이고, 방향은 `index.ts` 하나로 정리된다.
 */
export default tseslint.config(
  { ignores: ['node_modules/**'] },
  // 순서가 중요하다 — tseslint 프리셋 안의 eslint-recommended 오버라이드가
  // TS 파일에서 코어 no-undef·no-unused-vars 등(컴파일러가 이미 잡는 것)을
  // 꺼 주므로 코어를 먼저 두고 ts를 뒤에 둔다.
  js.configs.recommended,
  comments.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  // 타입 정보가 필요한 룰은 **recommended 범위만** 켠다 — `apps/blog/web`·
  // `@blog/content`가 같은 조합이다. 여기만 `strictTypeChecked`로 올리면 옮겨 온
  // 코드에 새 지적이 생기는데(실측 6건), 그건 이 PR이 "옮기기만 했다"는 말을
  // 거짓으로 만든다. 수준을 올릴 거라면 블로그 스택 셋을 함께 올릴 일이다.
  tseslint.configs.recommendedTypeCheckedOnly,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: true,
    },
    rules: {
      '@eslint-community/eslint-comments/no-use': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // 숫자 보간을 허용한다 — 이 패키지의 문자열은 대부분 에러 메시지이고,
      // 거기에 행 수·상태 코드를 넣는 것이 정상이다. 의도치 않은 객체·null
      // 보간을 막는다는 룰의 목적은 숫자를 허용해도 그대로 남는다.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
    },
  },
  {
    // Supabase CLI(`pnpm gen:types` → `supabase gen types --local`) 생성 파일 —
    // 손대면 재생성 때 되돌아온다. 생성기 출력 형태(type 별칭·인덱스 시그니처)에
    // 스타일 룰을 묻지 않는다. 앱에 있던 예외를 파일과 함께 옮겨 왔다.
    files: ['src/database.types.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      // 생성기가 union에 `never`를 남긴다(Functions가 빈 스키마일 때 등).
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  {
    // 테스트 파일은 tsconfig.json이 exclude하고 tsconfig.test.json이 include한다
    // (프로덕션/테스트 분할). projectService는 그 분기를 모르므로 여기만 끈다 —
    // `@blog/content`가 같은 자리에서 같은 일을 한다.
    files: ['**/*.test.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: ['./tsconfig.test.json'],
      },
    },
  },
  {
    files: ['*.config.{ts,mts}'],
    ...tseslint.configs.disableTypeChecked,
  },
);
