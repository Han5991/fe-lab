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
      light: '[data-theme=light] &',
    },
  },
  outdir: '../../../packages/@design-system/ui-lib',
  globalCss: {
    extend: {
      html: {
        bg: 'paper.50',
        color: 'ink.950',
        scrollBehavior: 'smooth',
      },
      body: {
        fontFamily: 'sans',
        wordBreak: 'keep-all',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // GitHub 다크: selection은 앰버 대신 중립 회색 + 밝은 텍스트
      '::selection': {
        bg: 'ink.border',
        color: 'ink.900',
      },
      ':focus-visible': {
        outline: '2px solid token(colors.accent.600)',
        outlineOffset: '3px',
        borderRadius: '3px',
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
