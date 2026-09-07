import { defineConfig } from '@pandacss/dev';

/**
 * Panda 설정 — 토큰의 단일 출처는 `@design-system/ui/blog-preset`이다.
 * React 판(`apps/blog/web/panda.config.ts`)과 **같은 프리셋을 쓴다.** 색·간격이
 * 두 사이트에서 갈라지면 번들 비교가 디자인 차이에 오염된다.
 *
 * React 판과 다른 것 둘:
 * - `jsxFramework` 없음 — Svelte는 JSX가 아니다. `css()` 함수만 쓴다
 *   (Panda의 `css()`는 프레임워크 무관한 문자열 생성기다).
 * - `outdir`이 앱 로컬(`styled-system/`)이다 — React 판이 쓰는
 *   `packages/@design-system/ui-lib`는 그 앱의 codegen 산출물이라 공유하면
 *   설정이 다른 두 앱이 같은 디렉터리를 번갈아 덮어쓴다.
 */
export default defineConfig({
  presets: [
    '@pandacss/dev/presets',
    '@design-system/ui/preset',
    '@design-system/ui/blog-preset',
  ],
  preflight: true,
  lightningcss: true,
  include: ['./src/**/*.{js,ts,svelte}'],
  strictTokens: true,
  strictPropertyValues: true,
  minify: true,
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
    },
  },
  outdir: 'styled-system',
});
