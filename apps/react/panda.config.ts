import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  presets: ['@pandacss/dev/presets', '@design-system/ui/preset'],
  // Whether to use css reset
  preflight: true,
  lightningcss: true,

  // Where to look for your css declarations
  include: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@design-system/ui/src/**/*.{js,jsx,ts,tsx}',
  ],

  jsxFramework: 'react',

  outdir: '../../packages/@design-system/ui-lib',
  // ui-lib를 함께 쓰는 packages/@design-system/ui 설정과 같게 둔다 — 생성 타입만
  // 바뀌는 옵션이라, 어긋나면 마지막에 codegen한 쪽의 타입이 나머지에게 새어 든다.
  strictTokens: true,
  strictPropertyValues: true,
  importMap: {
    css: '@design-system/ui-lib/css',
    recipes: '@design-system/ui-lib/recipes',
    patterns: '@design-system/ui-lib/patterns',
    jsx: '@design-system/ui-lib/jsx',
  },
});
