/**
 * 문서가 **직접 참조하는** 로컬 자산 경로 — 사이트 루트 기준 절대 경로로
 * 정규화해 돌려준다.
 *
 * `check-bundle`(게이트)과 `measure-bundle`(자)이 함께 쓴다. 둘이 각자 참조를
 * 긁으면 "무엇이 첫 로드에 오는가"의 답이 갈리는데, 하나는 게이트고 하나는
 * 자라서 어긋남이 조용하다.
 *
 * 수집 규칙은 `assetRefs.test.ts`가 잠근다.
 */

/**
 * `<script src>` · `<link href>`에서 로컬 자산 경로를 뽑는다.
 *
 * @param pagePath 상대 참조를 풀 기준이 되는 페이지 URL 경로
 */
export function collectAssetRefs(html: string, pagePath = '/'): string[] {
  const refs = new Set<string>();
  // 호스트는 버려진다 — 파싱이 성립하려면 절대 URL이어야 해서 둘 뿐이다.
  const base = new URL(pagePath, 'https://assets.invalid');
  for (const tag of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const raw = tag[0];
    const attr = /\b(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(raw);
    const url = attr?.[1];
    if (url === undefined) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
    let path: string;
    try {
      path = new URL(url, base).pathname;
    } catch {
      continue;
    }
    if (path.endsWith('.js') || path.endsWith('.css')) refs.add(path);
  }
  return [...refs];
}
