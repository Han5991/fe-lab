import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    preset: './src/preset.ts',
    'blog-preset': './src/blog-preset.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
});
