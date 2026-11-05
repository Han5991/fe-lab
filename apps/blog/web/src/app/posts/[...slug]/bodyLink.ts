/**
 * 본문 링크의 href가 **이 사이트의 페이지**를 가리키면 사이트 내부 경로(경로·쿼리·해시)를, 아니면 null을
 * 돌려준다. `PostBody`의 `a` 매퍼가 이 값으로 `TransitionLink`(클라이언트 내비게이션)와 맨 `<a>`를 가른다.
 *
 * - **같은 출처만** — `siteUrl`과 origin이 같은 절대 URL(원고는 다른 글을 `https://blog.sangwook.dev/posts/…/`로
 *   적는다)과 루트 상대 경로(`/…`). 다른 사이트·`mailto:`는 문서가 바뀌는 이동이라 라우터가 할 일이 없다.
 * - **지금 주소에 기대는 값은 받지 않는다** — 지금 글 기준의 상대 경로(`./x`·`x/`), 해시(`#…`), 프로토콜 상대
 *   주소(`//host/…` — 스킴을 지금 페이지에서 빌린다)는 브라우저가 지금 주소로 풀어 여기서 정할 수 없다.
 * - **페이지만** — 페이지 URL은 전부 후행 슬래시로 끝난다(`next.config.ts`의 `trailingSlash` 계약,
 *   `@blog/content`의 `postPath`). `/rss.xml`·이미지 같은 파일은 클라이언트 라우터가 열 수 없다.
 *
 * 절대 URL을 상대 경로로 바꾸므로 로컬·PR 프리뷰에서도 본문 링크가 프로덕션으로 튀지 않고 그 서버의 글을 연다.
 */
export function sitePagePath(href: string, siteUrl: string): string | null {
  const site = new URL(siteUrl);
  const url =
    href.startsWith('/') && !href.startsWith('//')
      ? URL.parse(href, site)
      : URL.parse(href);
  if (url === null || url.origin !== site.origin) return null;
  if (!url.pathname.endsWith('/')) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
