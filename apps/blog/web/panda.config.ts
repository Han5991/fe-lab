import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  presets: ['@pandacss/dev/presets', '@design-system/ui/preset', '@design-system/ui/blog-preset'],
  preflight: true,
  lightningcss: true,

  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  strictTokens: true,

  jsxFramework: 'react',

  strictPropertyValues: true,
  outdir: '../../../packages/@design-system/ui-lib',
  globalCss: {
    extend: {
      html: {
        bg: 'ink.25',
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
        bg: 'accent.600',
        color: 'white',
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
