import { defineConfig } from '@pandacss/dev';
import { preset } from './src/preset';

// lab 디자인 시스템 — Panda v2의 `panda lib` 모델(design-systems/build-a-design-system).
// 이 패키지가 컴포넌트와 그 컴포넌트를 만든 설정(토큰·레시피)을 한 단위로 내보낸다:
// `panda codegen`이 패키지 안 styled-system/을, `panda lib`이 dist/panda/(manifest·preset·
// buildinfo)와 package.json의 styled-system exports를 쓴다. 소비하는 앱은 설정에
// `designSystem: '@design-system/ui'` 한 줄만 두고, 이 소스를 다시 스캔하지 않는다.
// 블로그는 이 패키지를 쓰지 않는다(블로그 토큰은 @blog/preset).
export default defineConfig({
  // v2는 프리셋을 자동으로 넣지 않는다 — 유틸리티·조건(preset-base)과 기본 토큰(preset-panda)을
  // 명시한다. preset.mjs가 이 이름들을 그대로 싣고, 앱이 그걸 이어받는다.
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda', preset],
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',
  // 앱이 Box·Grid·Center를 쓴다(@design-system/ui/jsx). 런타임 옵션은 앱이 아니라 여기서 정하고
  // 앱은 이어받는다 — 앱이 다른 값을 두면 자기 런타임 전체를 따로 생성한다(consume-with-panda).
  jsxFramework: 'react',
  strictTokens: true,
  strictPropertyValues: true,
});
