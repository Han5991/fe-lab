import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  presets: [
    '@pandacss/dev/presets',
    '@design-system/ui/preset',
    '@design-system/ui/blog-preset',
  ],
  preflight: true,
  lightningcss: true,

  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  // 디자인 토큰 강제: 임의 색/값 대신 토큰만 허용. 임의값이 꼭 필요하면
  // 대괄호 이스케이프(`'[6px]'`)로 명시적으로 표기한다.
  strictTokens: true,

  jsxFramework: 'react',

  strictPropertyValues: true,
  // 테마 토글: html[data-theme] 로 라이트/다크 전환. semanticTokens의 _dark
  // 값이 이 조건에서 적용된다. base = 라이트, [data-theme=dark] = 다크.
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
    },
  },
  outdir: '../../../packages/@design-system/ui-lib',
  globalCss: {
    extend: {
      html: {
        bg: 'paper.50',
        color: 'ink.950',
        scrollBehavior: 'smooth',
        // Firefox는 ::-webkit-scrollbar 의사요소를 받지 않는다. 아래 webkit
        // 규칙과 같은 결과를 표준 속성으로 한 번 더 준다.
        scrollbarWidth: 'thin',
        scrollbarColor: 'token(colors.ink.border) transparent',
      },
      body: {
        fontFamily: 'sans',
        wordBreak: 'keep-all',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // GitHub: selection은 중립 회색 + 밝은 텍스트
      '::selection': {
        bg: 'ink.border',
        color: 'ink.900',
      },
      ':focus-visible': {
        outline: '2px solid token(colors.accent.600)',
        outlineOffset: '3px',
        borderRadius: '3px',
      },
      // 스크롤바는 얇은 실선처럼. 리뉴얼 톤이 hairline 보더 중심이라 8px
      // 막대가 지면에서 튄다.
      '::-webkit-scrollbar': {
        width: '4px',
        height: '4px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'transparent',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'ink.border',
        borderRadius: 'pill',
      },
      '::-webkit-scrollbar-thumb:hover': {
        bg: 'ink.borderStrong',
      },
      // Marker(형광펜) — raw HTML 본문의 <span class="marker">…</span> 강조
      '.marker': {
        background:
          'linear-gradient(180deg, transparent 55%, token(colors.marker.300) 55%, token(colors.marker.300) 92%, transparent 92%)',
        padding: '0 2px',
      },
    },
  },
  importMap: {
    css: '@design-system/ui-lib/css',
    recipes: '@design-system/ui-lib/recipes',
    patterns: '@design-system/ui-lib/patterns',
    jsx: '@design-system/ui-lib/jsx',
    tokens: '@design-system/ui-lib/tokens',
  },
});
