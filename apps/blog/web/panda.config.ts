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
      shadows: {
        accentLeft: { value: 'inset 3px 0 0 oklch(53% 0.22 255)' },
      },
      tokens: {
        fonts: {
          sans: {
            value:
              'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif',
          },
        },
        colors: {
          /* OKLCH blue-tinted neutral palette */
          'ink.950': { value: 'oklch(14% 0.02 250)' },
          'ink.700': { value: 'oklch(40% 0.025 250)' },
          'ink.500': { value: 'oklch(62% 0.02 250)' },
          'ink.200': { value: 'oklch(87% 0.018 250)' },
          'ink.100': { value: 'oklch(93.5% 0.014 250)' },
          'ink.50': { value: 'oklch(97% 0.008 250)' },
          'ink.25': { value: 'oklch(99% 0.005 250)' },
          'ink.border': { value: 'oklch(87% 0.018 250)' },
          'ink.borderStrong': { value: 'oklch(74% 0.025 250)' },
          /* Vivid blue accent */
          'accent.600': { value: 'oklch(53% 0.22 255)' },
          'accent.700': { value: 'oklch(47% 0.24 255)' },
          'accent.50': { value: 'oklch(96.5% 0.022 255)' },
          'accent.200': { value: 'oklch(84% 0.05 255)' },
        },
      },
    },
  },
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
        bg: 'ink.25',
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
  },
});
