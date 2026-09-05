import type { NextConfig } from 'next';

// sangwook.dev -> blog.sangwook.dev 리다이렉트는 더 이상 여기 없다.
// 도메인이 Cloudflare로 넘어가면서 판정이 **Cloudflare Redirect Rules**로 옮겨졌다
// (zone sangwook.dev, http_request_dynamic_redirect 단계, 규칙 2개).
// 이 앱에는 실험용 라우트(/about, /error/*)만 남는다.
const nextConfig: NextConfig = {
  trailingSlash: true,
};

export default nextConfig;
