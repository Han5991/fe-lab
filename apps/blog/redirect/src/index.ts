// apps/next.js 의 next.config.ts redirects() 를 Worker로 옮긴 것.
// sangwook.dev 로 들어온 모든 요청을 blog.sangwook.dev 로 넘긴다.
//
// Cloudflare Redirect Rules로 하지 않은 이유: 파일/디렉터리 판별에 정규식이
// 필요한데 rules 표현식의 `matches` 연산자가 Business 플랜부터라 Free에서는 못 쓴다.

const TARGET_ORIGIN = 'https://blog.sangwook.dev';

// 원본 규칙의 source: '/:path(.+\\.[a-zA-Z0-9]+)' 와 같은 판정.
// "마지막 세그먼트에 점이 있으면 파일"이라는 휴리스틱이므로
//  - 점 포함 슬러그(/vue-3.0 등)는 파일로 오분류되고
//  - 확장자 없는 well-known 파일(/.well-known/...)은 매칭되지 않는다.
// 원본과 동일한 한계를 의도적으로 유지한다. 좁히려면 확장자 allowlist로 바꿀 것.
const FILE_PATH = /^.+\.[a-zA-Z0-9]+$/;

export function resolveRedirect(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, '').replace(/\/+$/, '');

  if (trimmed === '') {
    return `${TARGET_ORIGIN}/`;
  }

  // 파일 경로에는 후행 슬래시를 붙이지 않는다 — 붙이면 정적 호스팅에서 404가 난다
  // (과거 sitemap.xml 이 6개월간 색인 실패한 원인).
  const suffix = FILE_PATH.test(trimmed) ? '' : '/';
  return `${TARGET_ORIGIN}/${trimmed}${suffix}`;
}

export default {
  fetch(request: Request): Response {
    const url = new URL(request.url);
    // Next의 permanent: true 는 301이 아니라 308이다. 메서드 보존 동작까지 그대로 맞춘다.
    return Response.redirect(resolveRedirect(url.pathname) + url.search, 308);
  },
};
