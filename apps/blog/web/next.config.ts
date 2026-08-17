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
  //
  // optimizePackageImports: @blog/content의 배럴(export *)은 로더(series·service,
  // node:fs)까지 함께 연다. 클라이언트 컴포넌트가 배럴에서 순수 유틸을 named
  // import할 때 이 최적화가 실제 사용 모듈로 좁혀 주어, dev(트리셰이킹 없음)에서도
  // node:fs가 클라이언트 그래프에 들어가지 않는다. 패키지 sideEffects:false와 짝.
  experimental: {
    optimizePackageImports: ['@blog/content'],
    ...(isDev ? { turbopackRustReactCompiler: true } : {}),
  },
  // dev에서는 키를 생략한다. 예전의 `output: undefined`와 동등하다 — 이 객체의
  // 유일한 소비자인 next의 assignDefaults(dist/server/config.js)가 undefined 값을
  // 키째 건너뛰므로, 키 유무는 관찰되지 않는다(exactOptionalPropertyTypes 대응).
  ...(isDev ? {} : { output: 'export' as const }),
  trailingSlash: true,
  // `<Link>`·router.push는 상대 href를 normalizePathTrailingSlash(next/dist/client)에
  // 통과시키는데, trailingSlash: true일 때 **마지막 세그먼트에 `.`이 있으면 파일로
  // 간주해 후행 슬래시를 벗긴다**(`/\.[^/]+\/?$/`). 그래서 postPath가 계약대로
  // `/posts/turborepo-next.js-docker/`를 만들어도 HTML에는 `…docker`로 나갔다 —
  // GitHub Pages는 `…docker/index.html`을 서빙하므로 클릭마다 301을 한 번 더 타고,
  // export 모드의 클라이언트 라우터는 `…docker.txt`(없음)를 받으러 갔다가 404 →
  // MPA 폴백으로 떨어졌다. 이 플래그가 그 정규화를 통째로 끈다(패스스루).
  //
  // 대신 **내부 href는 전부 스스로 후행 슬래시를 달아야 한다** — postPath·
  // POSTS_PATH·archivePath는 원래 그렇고, 리터럴 href도 마찬가지다.
  // check-seo의 `link-trailing-slash`가 산출물에서 이를 검사한다.
  //
  // dev 서버의 자동 리다이렉트(`/posts/foo` → `/posts/foo/`)도 함께 꺼진다 — 두 형태
  // 모두 200으로 그냥 서빙된다. 잃는 게 없다: 프로덕션은 서버 없는 정적 export라
  // 리다이렉트는 원래 GitHub Pages 몫이고, 우리 링크는 전부 슬래시를 달고 나간다.
  // (서버 쪽 "파일" 판정 정규식은 `\.\w+$`라 클라이언트 쪽보다 좁다 — 이 slug는
  // 서버에서는 어느 방향으로도 리다이렉트되지 않았다. 어긋남은 순전히 클라이언트
  // 정규화 한 곳이었다.)
  skipTrailingSlashRedirect: true,
  images: {
    unoptimized: true,
  },
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
};

export default nextConfig;
