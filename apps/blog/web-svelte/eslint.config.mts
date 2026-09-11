import js from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import globals from 'globals';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

/**
 * `apps/blog/web`과 **같은 엄격 수준**을 목표로 조립한다 — 두 앱의 lint 기준이
 * 갈리면 "Svelte가 더 깔끔하다"가 규율 차이인지 언어 차이인지 알 수 없다.
 *
 * 인라인 `eslint-disable`은 전면 금지다(`noInlineConfig` + eslint-comments의
 * `no-use`). 예외가 필요하면 주석이 아니라 이 파일에 `files` 스코프로 적는다 —
 * 예외가 코드에 흩어지면 어디가 규칙 밖인지 아무도 세지 못한다.
 */
export default tseslint.config(
  {
    ignores: [
      '.svelte-kit/**',
      'build/**',
      'styled-system/**',
      'static/**',
      'node_modules/**',
      // postcss는 Panda 플러그인 한 줄짜리 CJS 설정이다. tsconfig include 밖이라
      // 타입 정보 룰의 프로젝트 서비스가 못 열고, 검사할 코드도 없다.
      'postcss.config.cjs',
    ],
  },
  js.configs.recommended,
  comments.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  svelte.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
    linterOptions: {
      // 규율의 단일 출처를 이 파일로 고정한다.
      noInlineConfig: true,
      reportUnusedDisableDirectives: true,
    },
    rules: {
      '@eslint-community/eslint-comments/no-use': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        parser: tseslint.parser,
        svelteConfig,
      },
    },
  },
  {
    // 설정 파일들은 node에서 도는 빌드 스크립트다 — 타입 정보 룰의 프로젝트
    // 서비스가 tsconfig include 밖이라 잡지 못한다.
    files: ['*.config.{ts,mts,js}', 'content.*.mts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
