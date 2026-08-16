import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  // React Compiler의 Rust 포트를 Turbopack 안에서 네이티브로 돌린다(next 16.3 실험 플래그).
  // Babel을 거치지 않아 dev 시작이 콜드 34% / 웜 46% 빨라진다.
  //
  // dev에서만 켠다. 배포 산출물(out/)은 검증된 babel-plugin-react-compiler 경로를
  // 그대로 쓰게 두어, rust 포트의 미해결 코드젠 회귀가 프로덕션에 새지 않게 한다:
  //   - vercel/next.js#95709 catch 바인딩 rename 후 rebinding 누락 → ReferenceError
  //     (이 앱에 해당 패턴 5곳: CodeBlock / MermaidChart / ShareButton×2 / usePostDetailStats)
  //   - vercel/next.js#95557 shadowed 식별자가 intrinsic 태그를 <table_0>로 렌더
  //
  // 주의: `next build --debug-prerender`는 NODE_ENV를 development로 세팅하므로
  //       그 경로에서만 isDev가 true가 되어 플래그가 켜진다(output: 'export'가
  //       함께 풀리는 기존 동작과 같은 성질). 프로덕션 배포는 deploy-blog.yml이
  //       NODE_ENV: production을 명시하므로 영향받지 않는다.
  //
  // babel-plugin-react-compiler는 지우면 안 된다 — prod 빌드가 여전히 이 경로를 쓴다.
  experimental: isDev ? { turbopackRustReactCompiler: true } : {},
  // dev에서는 키를 생략한다. 예전의 `output: undefined`와 동등하다 — 이 객체의
  // 유일한 소비자인 next의 assignDefaults(dist/server/config.js)가 undefined 값을
  // 키째 건너뛰므로, 키 유무는 관찰되지 않는다(exactOptionalPropertyTypes 대응).
  ...(isDev ? {} : { output: 'export' as const }),
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
};

export default nextConfig;
