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
      // 숫자 보간을 허용한다. `${count}편` 같은 표현이 Svelte 템플릿에서는
      // 일상적인데(JSX의 `{count}`에 해당한다), 기본값은 이걸 막아 String()
      // 래핑을 강요한다. 의도치 않은 객체·null 보간을 막는다는 룰의 목적은
      // 숫자를 허용해도 그대로 남는다.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      // href를 `resolve()`로 감싸라는 룰을 끈다.
      //
      // 이 앱의 내부 href는 **라우트 ID가 아니라 콘텐츠 URL 계약**에서 온다 —
      // `postPath(slug)`가 만든 문자열을 서버가 계산해 내려보낸다(그렇게 하는
      // 이유는 `+layout.server.ts` 주석에 있다: 화면이 `@blog/content`를 직접
      // import하면 node:fs가 클라이언트 그래프에 들어간다). `resolve()`는 그런
      // 런타임 문자열에 걸 수 없고, base path도 비어 있어 얻을 것이 없다.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // 글 본문만 `{@html}`을 쓴다.
    //
    // 삽입되는 HTML은 **빌드 타임에** 이 저장소의 원고에서 만들어진다
    // (`src/lib/server/markdown.ts` — remark/rehype). 사용자 입력이 닿는
    // 경로가 없으므로 XSS 표면이 아니고, raw HTML을 살리는 것이 이 블로그
    // 저작 문법의 전제다(`<callout>` 같은 커스텀 태그). 예외를 파일 스코프로
    // 둬서 다른 화면이 실수로 같은 문을 열 수 없게 한다.
    // 글롭에서 `[...slug]`는 **문자 클래스**로 해석돼 실제 파일에 매치되지
    // 않는다(처음에 그렇게 적었다가 예외가 조용히 안 걸렸다). 디렉터리
    // 와일드카드로 우회한다 — posts 아래 페이지는 글 상세 하나뿐이다.
    files: ['src/routes/posts/**/+page.svelte'],
    rules: { 'svelte/no-at-html-tags': 'off' },
  },
  {
    // Giscus는 **자기 자신을 iframe으로 갈아치우는 서드파티 스크립트**다.
    //
    // 붙이는 방법이 `<script src=giscus.app/client.js data-*>` 태그 하나뿐이고,
    // 그 스크립트가 자기 부모 안에 iframe을 만들어 넣는다. Svelte 템플릿으로는
    // 표현할 수 없다 — `{@html}`로 넣은 script는 실행되지 않는다.
    //
    // 룰이 막으려는 것은 **Svelte가 관리하는 자식**과 실제 DOM이 어긋나는
    // 것이다. 여기 호스트 div는 템플릿에 자식이 하나도 없어서 Svelte가 그 안을
    // 건드릴 일이 없고, 정리는 컴포넌트가 사라질 때 div째 없어지는 것으로
    // 끝난다. React 판은 `@giscus/react`가 같은 일을 대신해 줘서 이 자리가
    // 보이지 않을 뿐, 하는 일은 똑같다.
    files: ['src/lib/client/Comments.svelte'],
    rules: { 'svelte/no-dom-manipulating': 'off' },
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
