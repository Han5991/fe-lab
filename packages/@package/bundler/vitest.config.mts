import { defineConfig } from 'vitest/config';

// 테스트가 process.chdir()를 쓰므로(worker 스레드에선 막힌다) pool은 기본값(forks)으로 둔다
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
