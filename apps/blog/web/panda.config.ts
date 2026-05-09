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
  // 이 블로그 앱 자체에서 codegen을 돌릴 때는 strictTokens=true로 새 코드의 토큰 사용을
  // 강제한다. 다만 ui-lib(공용 출력)는 `@design-system/ui` 패키지의 prepare 훅에서
  // strictTokens 없이 생성되므로, CI/배포에서는 기존 임의값(`maxW: '1200px'` 등)도
  // 빌드에 통과한다. 새로 추가하는 코드는 가급적 토큰을 쓰자.
  strictTokens: true,

  jsxFramework: 'react',

  strictPropertyValues: true,
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
      '::selection': {
        bg: 'marker.300',
        color: 'ink.950',
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
