import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: 'https://blog.sangwook.dev/',
        permanent: true,
      },
      {
        // 파일 경로(sitemap.xml, robots.txt, 이미지 등)는 후행 슬래시 없이 전달 —
        // GitHub Pages는 파일에 슬래시가 붙으면 404 (과거 6개월 색인 실패 원인).
        // 주의: "마지막 세그먼트에 점이 있으면 파일"이라는 휴리스틱이므로
        //  - 점 포함 슬러그(/vue-3.0 등)는 파일로 오분류되고
        //  - 확장자 없는 well-known 파일(/.well-known/...)은 매칭되지 않는다.
        // 현재 블로그 경로에는 둘 다 없음 — 해당 경로 도입 시 확장자 allowlist로
        // 좁힐 것. 동작은 next.config.test.ts가 잠근다.
        source: '/:path(.+\\.[a-zA-Z0-9]+)',
        destination: 'https://blog.sangwook.dev/:path',
        permanent: true,
      },
      {
        source: '/:path+',
        destination: 'https://blog.sangwook.dev/:path+/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
