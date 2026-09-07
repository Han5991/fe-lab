/**
 * 문서가 **직접 참조하는** 로컬 자산 경로 — 사이트 루트 기준 절대 경로로
 * 정규화해 돌려준다.
 *
 * `check-bundle`과 `measure-bundle`이 함께 쓴다. 둘이 각자 참조를 긁으면
 * "무엇이 첫 로드에 오는가"의 답이 갈리는데, 하나는 게이트고 하나는 자라서
 * 어긋남이 조용하다.
 *
 * ## 경로 관례를 가정하지 않는다
 *
 * 예전 `check-bundle`은 `/_next/static/chunks/`를 정규식에 박아 두었다.
 * Next.js 산출물 전용이라 다른 프레임워크의 `out/`에서는 청크를 **하나도 못
 * 찾고**, 그러면 "누수 0건"이 아니라 검사가 무력화된 것이다(양성 대조가 전
 * 규칙에서 실패하며 알려 주긴 하지만, 원인을 말해 주진 않는다).
 *
 * **상대 경로도 반드시 함께 받아야 한다.** SvelteKit은 기본값으로
 * `./_app/immutable/…`처럼 페이지 기준 상대 경로를 낸다. 절대 경로만 세던 판은
 * 그 산출물에서 참조를 하나도 못 찾아 0 KB를 보고했다.
 */

/**
 * `<script src>` · `<link href>`에서 로컬 자산 경로를 뽑는다.
 *
 * 속성 순서를 가정하지 않는다(`<script defer src=…>`도 `<script src=… defer>`도
 * 같다). 프로토콜이 붙은 참조(`https://`·`//cdn…`·`data:`)는 자기 산출물이
 * 아니므로 제외한다.
 *
 * @param pagePath 상대 참조를 풀 기준이 되는 페이지 URL 경로
 */
export function collectAssetRefs(html: string, pagePath = '/'): string[] {
  const refs = new Set<string>();
  // 페이지 경로를 base로 삼아 상대 참조를 푼다. 호스트는 버려지므로 아무 값이나
  // 되지만, 파싱이 성립하려면 절대 URL이어야 한다.
  const base = new URL(pagePath, 'https://assets.invalid');
  for (const tag of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const raw = tag[0];
    // script는 src, link는 href. 둘 다 있는 태그는 없다.
    const attr = /\b(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(raw);
    const url = attr?.[1];
    if (url === undefined) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
    let path: string;
    try {
      // URL 해석이 쿼리·프래그먼트도 함께 떼어 준다.
      path = new URL(url, base).pathname;
    } catch {
      continue;
    }
    if (path.endsWith('.js') || path.endsWith('.css')) refs.add(path);
  }
  return [...refs];
}
