import { defineConfig } from '@pandacss/dev';
import preset from './src/preset';

export default defineConfig({
  // lab 전용 — 블로그 프리셋은 블로그 설정(apps/blog/web)만 싣고, 그 생성물은
  // packages/@blog/styled-system으로 따로 간다. ui-lib의 작성자는 이 설정과
  // lab 앱 둘(apps/react·apps/next.js)이고, 셋 다 같은 프리셋·같은 strictTokens라
  // 누가 마지막에 codegen해도 같은 ui-lib가 나온다.
  presets: ['@pandacss/dev/presets', preset],
  // Whether to use css reset
  preflight: true,
  lightningcss: true,

  // The extension for the emitted JavaScript files
  outExtension: 'mjs',
  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}'],

  // The output directory for your css system
  outdir: '../ui-lib',
  importMap: {
    css: '@design-system/ui-lib/css',
    recipes: '@design-system/ui-lib/recipes',
    patterns: '@design-system/ui-lib/patterns',
    jsx: '@design-system/ui-lib/jsx',
    tokens: '@design-system/ui-lib/tokens',
  },
  // The JSX framework to use
  jsxFramework: 'react',

  strictTokens: true,
  strictPropertyValues: true,
  // The CSS Syntax to use to use
  syntax: 'object-literal',
});
