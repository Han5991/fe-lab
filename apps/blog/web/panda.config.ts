import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  presets: ['@pandacss/dev/presets', '@design-system/ui/preset'],
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
  theme: {
    extend: {
      tokens: {
        fonts: {
          sans: {
            value:
              'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
        },
      },
    },
  },
  globalCss: {
    extend: {
      body: {
        fontFamily: 'sans',
        wordBreak: 'keep-all',
      },
    },
  },
  importMap: {
    css: '@design-system/ui-lib/css',
    recipes: '@design-system/ui-lib/recipes',
    patterns: '@design-system/ui-lib/patterns',
    jsx: '@design-system/ui-lib/jsx',
  },
});
