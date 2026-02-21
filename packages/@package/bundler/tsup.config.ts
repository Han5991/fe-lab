import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  target: 'node24',
  clean: true,
  dts: true,
  sourcemap: true,
});
