import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    preset: './src/preset.ts',
    'blog-preset': './src/blog-preset.ts',
    Button: './src/button.tsx',
  },
  format: ['esm'],
  dts: true,
  clean: true,
});
