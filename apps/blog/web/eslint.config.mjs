import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import reactHooks from 'eslint-plugin-react-hooks';

const eslintConfig = [
  {
    ignores: ['.next/**', 'out/**', 'public/**', 'supabase/**'],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // 신규 React Compiler 규칙. 기존 코드 다수 위반 — 점진 정리 위해 warn 강등.
      // TODO(#84): SearchDialog/tocHooks 등 useEffect setState 제거 리팩터링 후 error 복귀.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    files: ['src/components/post/MarkdownImage.tsx'],
    rules: {
      // 정적 호스팅(GitHub Pages)에서 next/image 비활성화 — 의도적 <img> 사용.
      '@next/next/no-img-element': 'off',
    },
  },
];

export default eslintConfig;
