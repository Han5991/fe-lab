import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: './src/index.ts',
    preset: './src/preset.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
});
