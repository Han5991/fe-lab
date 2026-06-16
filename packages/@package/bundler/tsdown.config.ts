import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  platform: 'node',
  target: 'node24',
  clean: true,
  dts: true,
  sourcemap: true,
});
