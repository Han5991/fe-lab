import { defineConfig } from '@pandacss/dev';

// lab 디자인 시스템(@design-system/ui)을 Panda v2 방식으로 소비한다(design-systems/consume-with-panda).
// designSystem 한 줄이 그 패키지의 프리셋·importMap·buildinfo를 불러온다 — 프리셋·importMap을 손으로
// 적거나 디자인 시스템 소스를 include에 넣지 않는다(넣으면 이미 기록된 스타일을 다시 추출한다).
// jsxFramework·strictTokens 같은 런타임 옵션도 디자인 시스템에서 이어받으므로 여기 두지 않는다.
// 이 앱은 자기 토큰을 더하지 않아 @design-system/ui/{css,jsx}를 바로 import한다. 토큰·유틸리티·
// 조건을 더하게 되면 import를 로컬 styled-system으로 바꾸고 predev·prebuild에 `panda codegen`을 둔다.
export default defineConfig({
  designSystem: '@design-system/ui',
  include: ['./src/**/*.{ts,tsx}'],
  exclude: ['**/*.test.{ts,tsx}'],
  // 번들러 플러그인이 빌드마다 다시 쓰는 로컬 생성물(.gitignore)
  outdir: 'styled-system',
});
