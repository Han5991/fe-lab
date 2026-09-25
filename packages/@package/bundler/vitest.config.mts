import { defineConfig } from 'vitest/config';

/**
 * Graph.generate()가 cwd의 dist/에 쓰기 때문에 테스트가 process.chdir()로 임시 폴더에
 * 들어간다 — worker 스레드에서는 chdir이 막히니 pool은 기본값(forks)으로 둔다.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
