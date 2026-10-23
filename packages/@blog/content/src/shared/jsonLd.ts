import type { AuthorConfig, SiteConfig } from './contentConfig.ts';

/**
 * `<script type="application/ld+json">` 본문에 안전하게 넣을 JSON 문자열을 만든다.
 * 실행되는 인라인 스크립트에 값을 리터럴로 넣을 때도 이것을 쓴다(앱 layout의 테마 스크립트) —
 * JSON은 그대로 JS 리터럴이고, 아래 이스케이프는 JS 문자열 안에서도 같은 `<`로 읽힌다.
 *
 * `JSON.stringify`는 `<`를 그대로 두기 때문에, 값에 `</script>`(태그 조기 종료)나
 * `<!--`(HTML 주석 시작)가 들어가면 스크립트 블록이 깨지거나 XSS로 이어질 수 있다.
 * `<` 한 글자만 유니코드 이스케이프(`\\u003c`)로 바꾸면 두 시퀀스가 모두 무력화된다.
 * JSON 구조 문자에는 `<`가 없어 치환은 항상 문자열 값 내부에서만 일어나므로, 다시
 * 파싱하면 원래 값과 동일하다(의미 보존). Next.js 내부도 같은 패턴을 쓴다.
 *
 * 현재 JSON-LD는 전부 상수라 실제 악용은 없지만, 필드가 외부 데이터와 연결되는 순간을
 * 대비한 구조적 하드닝이다.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * 사이트 전역 JSON-LD 노드 — 홈 `@graph`가 정의하고, 다른 페이지와 글이 `@id`로 가리킨다.
 * `@id`가 자리마다 손으로 조립되면 한 곳만 바뀌어 참조가 허공을 가리킨다.
 */
export type SiteNode = 'website' | 'organization' | 'author';

export function siteNodeId(siteUrl: string, node: SiteNode): string {
  return `${siteUrl}/#${node}`;
}

/**
 * 발행처(Organization) 노드의 공통 필드 — 글의 `publisher`가 그대로 쓰고, 홈 `@graph`의
 * 정의가 여기에 소개·창립자·링크를 더한다. 같은 `@id`의 두 정의가 이름·로고부터 갈라지지 않게
 * 한 곳에서 만든다.
 */
export function buildOrganizationJsonLd(
  site: Pick<SiteConfig, 'url' | 'name' | 'logo'>,
) {
  return {
    '@type': 'Organization',
    '@id': siteNodeId(site.url, 'organization'),
    name: site.name,
    url: site.url,
    logo: {
      '@type': 'ImageObject',
      url: `${site.url}${site.logo.path}`,
      width: site.logo.width,
      height: site.logo.height,
    },
  };
}

/** 저자(Person) 노드의 공통 필드 — 글의 `author`가 그대로 쓰고, 앱의 저자 정의가 여기에 더한다. */
export function buildAuthorJsonLd(
  site: Pick<SiteConfig, 'url'>,
  author: Pick<AuthorConfig, 'name' | 'alternateName'>,
) {
  return {
    '@type': 'Person',
    '@id': siteNodeId(site.url, 'author'),
    name: author.name,
    alternateName: author.alternateName,
    url: site.url,
  };
}
