import { decodeUrlSafe } from '../shared/url.ts';

/**
 * 문서가 **첫 로드에 받게 하는** 로컬 JS·CSS 경로 — 사이트 루트 기준 절대
 * 경로로 정규화해 돌려준다. `measure-bundle`의 수집기이고, `check-bundle`의
 * 예산(`bundleBudgets`)도 같은 측정(`measurePages`)을 거쳐 이것을 쓴다.
 *
 * `check-bundle`의 누수 규칙이 쓰는 `collectChunkRefs`와는 일부러 다르다. 그쪽은 "이 페이지가
 * 도달할 수 있는 청크 전부"를 묻는 게이트라 태그를 가리지 않고(인라인 RSC
 * 페이로드 속 청크 이름까지) 긁은 뒤 지연 로드 폐포를 더한다. 여기는 "브라우저가
 * 첫 로드에 실제로 내려받는 것"을 재는 자라서, 브라우저가 첫 로드에 가져가는
 * 태그만 센다:
 *
 * - `<script src>` — 단, `nomodule`은 모듈을 지원하는 브라우저가 받지 않는다
 *   (Next의 polyfills 청크가 이 꼴이다).
 * - `<link rel=stylesheet|modulepreload>`, `<link rel=preload as=script|style>`.
 *   `prefetch`·`icon`·`manifest`·`preload as=font` 같은 나머지 link는 세지 않는다.
 *
 * 같은 파일이 `preload`와 `script` 양쪽에 실리는 것이 Next 산출물의 실제 모양이라
 * 경로로 합친다. 수집 규칙은 `assetRefs.test.ts`가 잠근다.
 */

/** 첫 로드 전송으로 세는 `<link rel>` 토큰 — `preload`는 `as`를 따로 본다. */
const FETCHED_LINK_RELS = new Set(['stylesheet', 'modulepreload']);
const PRELOAD_AS = new Set(['script', 'style']);

/** 태그 하나의 속성 — 이름은 소문자, 값 없는 속성(`async`, `nomodule`)은 빈 문자열. */
function parseAttributes(tag: string): Map<string, string> {
  const attrs = new Map<string, string>();
  // 태그 이름 뒤부터 본다 — `<script`의 `script`를 속성으로 읽지 않도록.
  const body = tag.replace(/^<[a-z]+/i, '').replace(/\/?>$/, '');
  for (const m of body.matchAll(
    /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const name = m[1]?.toLowerCase();
    if (name === undefined || attrs.has(name)) continue;
    attrs.set(name, m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** 이 태그가 첫 로드에 내려받게 하는 URL — 세지 않는 태그면 undefined. */
function fetchedUrl(
  kind: string,
  attrs: ReadonlyMap<string, string>,
): string | undefined {
  if (kind === 'script') {
    return attrs.has('nomodule') ? undefined : attrs.get('src');
  }
  const rels = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
  const fetched =
    rels.some(rel => FETCHED_LINK_RELS.has(rel)) ||
    (rels.includes('preload') &&
      PRELOAD_AS.has((attrs.get('as') ?? '').toLowerCase()));
  return fetched ? attrs.get('href') : undefined;
}

/**
 * 첫 로드에 내려받는 로컬 JS·CSS 경로를 모은다.
 *
 * @param pagePath 상대 참조를 풀 기준이 되는 페이지 URL 경로
 */
export function collectAssetRefs(html: string, pagePath = '/'): string[] {
  const refs = new Set<string>();
  // 호스트는 버려진다 — 파싱이 성립하려면 절대 URL이어야 해서 둘 뿐이다.
  const base = new URL(pagePath, 'https://assets.invalid');
  for (const tag of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const kind = (tag[1] ?? '').toLowerCase();
    const url = fetchedUrl(kind, parseAttributes(tag[0]));
    if (url === undefined || url === '') continue;
    // 프로토콜·프로토콜 상대 참조는 우리 산출물이 아니다(분석 태그·CDN).
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) continue;
    let path: string;
    try {
      // 디렉터리 이름은 퍼센트 인코딩돼 나온다(`%5B...slug%5D`) — 디스크 경로로 푼다.
      path = decodeUrlSafe(new URL(url, base).pathname);
    } catch {
      continue;
    }
    if (path.endsWith('.js') || path.endsWith('.css')) refs.add(path);
  }
  return [...refs];
}
