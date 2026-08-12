import { createRequire } from 'node:module';

import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

// eslint-config-next는 `settings.react.version: 'detect'`를 넣는데, 그 자동 감지
// 경로(eslint-plugin-react `util/version.js`의 resolveBasedir)가 ESLint 10에서
// 제거된 `context.getFilename()`을 폴백 없이 호출해 린트가 통째로 죽습니다.
// 버전을 문자열로 주면 'detect' 분기 자체를 타지 않아 크래시를 피합니다.
// eslint-plugin-react가 ESLint 10을 지원하면 이 블록은 제거 가능.
// (apps/blog/web/eslint.config.mjs와 같은 워크어라운드)
const reactVersion = createRequire(import.meta.url)(
  'react/package.json',
).version;

// flat config의 settings 병합은 최상위 키 단위라, 상속값을 모아 version만 덮어씁니다.
const inheritedReactSettings = [...nextCoreWebVitals, ...nextTypescript].reduce(
  (acc, config) => ({ ...acc, ...(config.settings?.react ?? {}) }),
  {},
);

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  // 위 두 설정이 넣은 `react.version: 'detect'`를 덮어씁니다. 순서 의존적이라
  // nextCoreWebVitals 뒤에 와야 합니다.
  {
    settings: {
      react: { ...inheritedReactSettings, version: reactVersion },
    },
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
    },
  },
];

export default eslintConfig;
