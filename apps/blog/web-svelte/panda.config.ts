import { defineConfig } from '@pandacss/dev';

/**
 * Panda 설정 — 토큰의 단일 출처는 `@design-system/ui/blog-preset`이다.
 * React 판(`apps/blog/web/panda.config.ts`)과 **같은 프리셋을 쓴다.** 색·간격이
 * 두 사이트에서 갈라지면 번들 비교가 디자인 차이에 오염된다.
 *
 * React 판과 다른 것 둘:
 * - `jsxFramework` 없음 — Svelte는 JSX가 아니다. `css()` 함수만 쓴다
 *   (Panda의 `css()`는 프레임워크 무관한 문자열 생성기다).
 * - `outdir`이 앱 로컬(`styled-system/`)이다 — React 판이 쓰는
 *   `packages/@design-system/ui-lib`는 그 앱의 codegen 산출물이라 공유하면
 *   설정이 다른 두 앱이 같은 디렉터리를 번갈아 덮어쓴다.
 */
export default defineConfig({
  presets: [
    '@pandacss/dev/presets',
    '@design-system/ui/preset',
    '@design-system/ui/blog-preset',
  ],
  preflight: true,
  lightningcss: true,
  include: ['./src/**/*.{js,ts,svelte}'],
  strictTokens: true,
  strictPropertyValues: true,
  minify: true,
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
    },
  },
  outdir: 'styled-system',
  theme: {
    extend: {
      keyframes: {
        /**
         * `ReadingProgress.svelte`의 스크롤 구동 진행 바. React 판
         * `panda.config.ts`와 **같은 정의**다 — 한쪽만 바꾸면 같은
         * 컴포넌트가 두 사이트에서 다르게 움직인다.
         *
         * width 대신 `transform: scaleX()`를 애니메이션해 컴포지터
         * 스레드만으로 처리되게 한다.
         */
        'reading-progress-fill': {
          to: { transform: 'scaleX(1)' },
        },
      },
    },
  },
  globalCss: {
    extend: {
      html: { bg: 'paper.50', color: 'ink.950', wordBreak: 'keep-all' },
      body: { fontFamily: 'sans', margin: '0' },
      /**
       * 구문 강조 색 — Prism 토큰 클래스를 `code.*` 역할 토큰에 잇는다.
       *
       * React 판은 서드파티 테마 객체(vscDarkPlus)의 **hex를 역할 토큰으로
       * 치환하는** 변환을 돈다. 그쪽은 남의 테마를 받아쓰기 때문에 그 우회가
       * 필요했지만, 여기서는 refractor가 내는 토큰 클래스에 역할을 직접 이으면
       * 된다 — `code.*`가 이미 색 이름이 아니라 **역할 이름**이라서 가능하다.
       *
       * **그래서 두 사이트의 코드 색이 완전히 같지는 않다.** 원본 테마가 같은
       * hex로 묶어 둔 의미 그룹과 여기서 클래스로 묶은 그룹이 미세하게 다르다.
       * 지금 아는 차이는 흐름 키워드(`import`·`return`)다 — vscDarkPlus는 그것만
       * 따로 색을 주는데(`code.keywordFlow`), Prism 클래스로는 일반 키워드와
       * 구분되지 않는다. 이 목록에 없는 토큰은 `code.fg`로 떨어진다.
       */
      '.token.comment, .token.prolog, .token.cdata': { color: 'code.comment' },
      '.token.punctuation': { color: 'code.fg' },
      '.token.namespace, .token.doctype, .token.entity': {
        color: 'code.muted',
      },
      '.token.property, .token.attr-name, .token.variable, .token.parameter': {
        color: 'code.property',
      },
      '.token.keyword, .token.boolean, .token.atrule, .token.important': {
        color: 'code.keyword',
      },
      '.token.tag, .token.constant': { color: 'code.tag' },
      '.token.string, .token.char, .token.attr-value, .token.builtin': {
        color: 'code.string',
      },
      '.token.number, .token.symbol, .token.unit': { color: 'code.number' },
      '.token.function, .token.function-name': { color: 'code.function' },
      '.token.class-name, .token.maybe-class-name, .token.known-class-name': {
        color: 'code.class',
      },
      '.token.regex': { color: 'code.regex' },
      '.token.selector': { color: 'code.selector' },
      '.token.operator, .token.url': { color: 'code.fg' },
      // diff의 +/−는 라이트에서도 색으로 갈려야 한다 — 안 갈리면 diff가 아니다.
      '.token.inserted': { color: 'code.inserted' },
      '.token.deleted': { color: 'code.deleted' },
      '.token.italic': { fontStyle: 'italic' },
      '.token.bold': { fontWeight: 'bold' },
      // 코드 표면 위 드래그 선택. 전역 ::selection은 라이트에서 옅은 하늘색이라
      // 코드의 파란 계열 토큰을 지운다.
      'pre ::selection': { bg: 'code.selection' },
    },
  },
});
