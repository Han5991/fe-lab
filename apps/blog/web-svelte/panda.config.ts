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
      /**
       * **언어마다 기본 글자색이 다르다.** 토큰 클래스가 안 붙은 맨 식별자
       * (`mainAxios`·`axios` 같은 것)가 받는 색이고, JS 계열에서는 그것이
       * `code.fg`가 아니라 `code.property`다 — VS Code의 색 규칙이 그렇고,
       * React 판이 쓰는 테마(vscDarkPlus)에도 `code[class*="language-javascript"]`
       * 같은 항목으로 들어 있다. 여기에만 없으면 `axios.create()`의 앞쪽 절반이
       * 두 사이트에서 다른 색이 된다.
       */
      'code[class*="language-javascript"], code[class*="language-jsx"], code[class*="language-typescript"], code[class*="language-tsx"]':
        { color: 'code.property' },
      'code[class*="language-css"]': { color: 'code.string' },

      '.token.comment, .token.prolog, .token.cdata': { color: 'code.comment' },
      '.token.punctuation': { color: 'code.fg' },
      // `script`는 HTML 펜스 안의 `<script>` 본문이다. 규칙이 없으면 부모인
      // `tag`의 초록을 물려받아 자바스크립트 한 덩어리가 통째로 초록이 된다.
      '.token.namespace, .token.doctype, .token.entity, .token.script': {
        color: 'code.muted',
      },
      // `property-access`는 js-extras가 내는 것이라 목록에 없으면 통째로
      // 무채색이 된다 — 원고 전체에서 748번 나온다. React 판에서 이 자리가
      // 파랗게 보이는 것은 규칙 때문이 아니라 `code` 요소의 기본색이 그 색이기
      // 때문인데, 결과가 같으므로 여기서는 역할로 이어 준다.
      '.token.property, .token.property-access, .token.attr-name, .token.variable, .token.parameter':
        {
          color: 'code.property',
        },
      // `instruction`은 bash·docker 펜스의 명령 키워드다(RUN·COPY…).
      '.token.keyword, .token.boolean, .token.atrule, .token.important, .token.instruction':
        {
          color: 'code.keyword',
        },
      '.token.tag, .token.constant': { color: 'code.tag' },
      '.token.string, .token.template-string, .token.char, .token.attr-value, .token.builtin':
        {
          color: 'code.string',
        },
      '.token.number, .token.symbol, .token.unit': { color: 'code.number' },
      '.token.function, .token.function-name, .token.generic-function': {
        color: 'code.function',
      },
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
