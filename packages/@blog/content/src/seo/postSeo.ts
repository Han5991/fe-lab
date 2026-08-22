/**
 * 포스트 상세 페이지의 SEO 메타데이터 / 구조화 데이터(JSON-LD) 빌더.
 *
 * 이전에는 page.tsx에 인라인되어 단위 테스트가 불가능했습니다. 순수 함수로 분리해
 * 콘텐츠(post) → SEO 출력의 계약을 테스트로 고정합니다.
 *
 * 반환형은 Next의 `Metadata`가 아니라 **프레임워크 중립 DTO**(PostSeoData)입니다
 * — 이 모듈은 콘텐츠 → SEO 데이터 계산만 하고, Next Metadata로의 어댑트는 앱
 * (page.tsx + nextMetadata.ts)이 합니다. next에 묶이지 않아야 이 계산이 나중에
 * 콘텐츠 패키지로 이사할 수 있습니다.
 */
import {
  archiveUrl,
  postPath,
  postUrl,
  resolveExcerpt,
  type PostData,
} from '../post/index.ts';
import { resolveAbsoluteThumbnailUrl } from '../post/thumbnail.ts';
import type { ContentConfig } from '../shared/contentConfig.ts';

/**
 * 아래 빌더들이 받는 `slug`는 **디코드된** 값입니다 — page.tsx가
 * `decodeURIComponent(resolvedParams.slug.join('/'))`로 먼저 풀어서 넘깁니다.
 * 이미 인코딩된 slug를 넘기면 postPath가 `%`를 다시 인코딩해(`%25…`) canonical과
 * og:url이 통째로 404를 가리키게 됩니다.
 *
 * canonical·og:url은 예전의 리터럴 조합과 달리 **퍼센트 인코딩되어** 나갑니다.
 * Next의 `new URL()`은 대괄호를 인코딩하지 않아 페이지 링크(postPath, 인코딩됨)와
 * canonical이 갈릴 수 있었고, check-seo는 양쪽을 디코드해 비교하므로 인코딩으로
 * 통일해도 새 위반이 생기지 않습니다.
 */

/** SEO 빌더가 필요로 하는 post 필드만 추린 타입 */
export type SeoPost = Pick<
  PostData,
  | 'title'
  | 'seoTitle'
  | 'excerpt'
  | 'content'
  | 'date'
  | 'updatedAt'
  | 'thumbnail'
  | 'relativeDir'
  | 'tags'
  | 'series'
>;

/**
 * `<title>`에 쓸 제목. `seoTitle`이 있으면 그것을, 없으면 `title`을 쓴다.
 *
 * 화면 제목(h1)·OG 카드·JSON-LD headline은 이 함수를 거치지 않는다 — 잘림이
 * 실제로 문제인 곳은 검색 결과의 `<title>` 하나뿐이라, 거기만 짧은 이름을
 * 쓰고 나머지에는 글의 원래 제목이 그대로 나가게 둔다.
 */
export function resolveSeoTitle(
  post: Pick<PostData, 'title' | 'seoTitle'>,
): string {
  return post.seoTitle ?? post.title;
}

/**
 * description: excerpt가 있으면 그대로, 없으면 본문 앞부분 발췌.
 *
 * 폴백 계산은 도메인의 `resolveExcerpt` 하나를 씁니다. 예전에는 여기서 **마크다운
 * 원문**을 그대로 160자 자르고 있어서, 이미지·코드만 있는 글처럼 평문이 비는
 * 경우에 `#`·`*`·`![](…)` 같은 기호가 그대로 description으로 나갔습니다
 * (그러면 check-seo가 길이와 말줄임 두 항목에서 걸어 배포를 막습니다).
 */
export function buildDescription(
  post: Pick<PostData, 'excerpt' | 'content'>,
  descriptionMaxLength: number,
): string {
  return resolveExcerpt(post.content, post.excerpt, descriptionMaxLength);
}

/**
 * 'YYYY-MM-DD' → 설정 타임존의 자정 ISO(`...T00:00:00+09:00`).
 * null/undefined면 undefined.
 *
 * validate-posts가 권장하는 offset 포함 full-ISO(`2026-05-24T09:00:00+09:00`)는
 * 이미 완전한 형식이므로 그대로 반환한다 (suffix를 덧붙이면 invalid ISO가 됨).
 * offset은 인자다 — 예전엔 `+09:00`이 여기 박혀 있어, 설정으로 타임존을 덮어도
 * JSON-LD·OG의 발행 시각만 KST로 남았다.
 */
export function toKstIsoDate(
  date: string | null | undefined,
  isoOffset: string,
): string | undefined {
  if (!date) return undefined;
  return date.includes('T') ? date : `${date}T00:00:00${isoOffset}`;
}

/** 마크다운 본문의 대략적 단어 수(JSON-LD wordCount용). 기호 제거 후 공백 분할. */
export function countWords(content: string): number {
  return content
    .replace(/[#*`_>~[\]()!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

/** OG 이미지 한 장의 프레임워크 중립 서술 */
export interface PostSeoImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * 포스트 SEO 메타데이터의 프레임워크 중립 DTO.
 * Next `Metadata`로의 변환은 앱 어댑터(nextMetadata.ts)가 한다.
 */
export interface PostSeoData {
  /** `<title>` 전체(접미사 포함) */
  title: string;
  description: string;
  /** canonical 상대 경로 — 페이지 링크와 같은 빌더(postPath), 인코딩 포함 */
  canonicalPath: string;
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    type: 'article';
    /** KST 기준 완전한 ISO 8601. date가 없으면 undefined */
    publishedTime: string | undefined;
    images: PostSeoImage[];
  };
  twitter: {
    card: 'summary_large_image';
    title: string;
    description: string;
    images: string[];
  };
}

export interface PostSeoBuilders {
  buildPostSeo: (post: SeoPost, slug: string) => PostSeoData;
  buildPostJsonLd: (post: SeoPost, slug: string) => Record<string, unknown>;
  buildBreadcrumbJsonLd: (
    post: Pick<PostData, 'title'>,
    slug: string,
  ) => Record<string, unknown>;
}

/**
 * 설정에 앵커한 SEO 빌더 factory.
 *
 * 사이트 정체성(`site`)·저자(`author`)·OG 카드 규격(`og` — 생성기
 * generate-og-images와 같은 값)·SEO 예산(`seo`)·타임존을 **전부 설정에서**
 * 읽는다. 예전에는 정체성만 모듈 스코프 상수라, 설정으로 사이트 이름이나
 * origin을 덮어도 메타 태그와 JSON-LD는 옛 값을 내보냈다.
 */
export function createPostSeo(
  config: Pick<ContentConfig, 'og' | 'author' | 'site' | 'seo' | 'timezone'>,
): PostSeoBuilders {
  const ogImageWidth = config.og.width;
  const ogImageHeight = config.og.height;
  const { site, seo, timezone } = config;
  const describe = (post: Parameters<typeof buildDescription>[0]) =>
    buildDescription(post, seo.descriptionMaxLength);
  const toIsoDate = (date: string | null | undefined) =>
    toKstIsoDate(date, timezone.isoOffset);
  const absoluteThumbnail = (
    post: Parameters<typeof resolveAbsoluteThumbnailUrl>[0],
  ) => resolveAbsoluteThumbnailUrl(post, site);

  /** 포스트 상세의 SEO 메타데이터(OG/Twitter/canonical) DTO를 만든다. */
  function buildPostSeo(post: SeoPost, slug: string): PostSeoData {
    const description = describe(post);
    const absoluteThumbnailUrl = absoluteThumbnail({ ...post, slug });
    return {
      title: `${resolveSeoTitle(post)}${seo.titleSuffix}`,
      description,
      canonicalPath: postPath(slug),
      openGraph: {
        // og:title에는 짧은 seoTitle이 아니라 **원래 제목**이 나간다. 잘림이
        // 문제인 건 SERP의 `<title>`이고, 공유 카드는 폭이 넉넉하다.
        title: post.title,
        description,
        url: postPath(slug),
        // 사이트 이름은 상수 하나에서만 온다. 예전엔 여기만 'Frontend Lab Blog'라
        // 홈·목록·about('Frontend Lab')과 어긋나서 og:site_name이 두 종류였다.
        siteName: site.name,
        // 홈·목록에만 있고 글에는 없어서 44/46 페이지에 og:locale이 빠져 있었다.
        locale: 'ko_KR',
        type: 'article',
        // JSON-LD(datePublished)와 동일하게 KST 기준 완전한 ISO 8601로 통일
        publishedTime: toIsoDate(post.date),
        images: [
          {
            url: absoluteThumbnailUrl,
            width: ogImageWidth,
            height: ogImageHeight,
            alt: post.title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description,
        images: [absoluteThumbnailUrl],
      },
    };
  }

  /** Schema.org BlogPosting JSON-LD. */
  function buildPostJsonLd(
    post: SeoPost,
    slug: string,
  ): Record<string, unknown> {
    const url = postUrl(slug, site.url);
    const absoluteThumbnailUrl = absoluteThumbnail({ ...post, slug });
    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      datePublished: toIsoDate(post.date),
      // updatedAt이 있으면 그것을, 없으면 date를 dateModified로.
      dateModified: post.updatedAt
        ? toIsoDate(post.updatedAt)
        : toIsoDate(post.date),
      description: describe(post),
      image: {
        '@type': 'ImageObject',
        url: absoluteThumbnailUrl,
        width: ogImageWidth,
        height: ogImageHeight,
      },
      inLanguage: 'ko',
      isAccessibleForFree: true,
      wordCount: countWords(post.content),
      ...(post.tags &&
        post.tags.length > 0 && { keywords: post.tags.join(', ') }),
      // articleSection은 "이 글이 속한 섹션"이지 연재 여부가 아니다. 시리즈로
      // 선언하지 않은 주제 폴더도 섹션이므로 물리적 폴더(`relativeDir`)를 쓴다
      // — `series`로 쓰면 선언되지 않은 폴더의 글에서만 이 필드가 사라진다.
      ...(post.relativeDir && { articleSection: post.relativeDir }),
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      url,
      // 저자·발행처 식별값은 설정(defineContent의 author/site)에서 온다 —
      // 예전에는 여기만 리터럴이라 constants와 어긋날 수 있었다.
      author: {
        '@type': 'Person',
        '@id': `${site.url}/#author`,
        name: config.author.name,
        alternateName: config.author.alternateName,
        url: site.url,
      },
      publisher: {
        '@type': 'Organization',
        '@id': `${site.url}/#organization`,
        name: site.name,
        url: site.url,
        logo: {
          '@type': 'ImageObject',
          url: `${site.url}/logo-wordmark.svg`,
          width: 280,
          height: 60,
        },
      },
      isPartOf: { '@id': `${site.url}/#website` },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: [
          'h1',
          'h2:first-of-type',
          'article > p.tldr, article > p:first-of-type',
        ],
      },
    };
  }

  /** Schema.org BreadcrumbList JSON-LD (Home > Posts > 글제목). */
  function buildBreadcrumbJsonLd(
    post: Pick<PostData, 'title'>,
    slug: string,
  ): Record<string, unknown> {
    const items = [
      { position: 1, name: 'Home', item: `${site.url}/` },
      { position: 2, name: 'Posts', item: archiveUrl(site.url) },
      { position: 3, name: post.title, item: postUrl(slug, site.url) },
    ];
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map(({ position, name, item }) => ({
        '@type': 'ListItem',
        position,
        name,
        item,
      })),
    };
  }

  return { buildPostSeo, buildPostJsonLd, buildBreadcrumbJsonLd };
}
