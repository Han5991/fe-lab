import { defineConfig } from '@pandacss/dev';
import preset from './src/preset';

export default defineConfig({
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
  },
  // The JSX framework to use
  jsxFramework: 'react',

  strictPropertyValues: true,
  // The CSS Syntax to use to use
  syntax: 'object-literal',
});
