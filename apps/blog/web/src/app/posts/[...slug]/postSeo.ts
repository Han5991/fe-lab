/**
 * 포스트 상세 페이지의 SEO 메타데이터 / 구조화 데이터(JSON-LD) 빌더.
 *
 * 이전에는 page.tsx에 인라인되어 단위 테스트가 불가능했습니다. 순수 함수로 분리해
 * 콘텐츠(post) → SEO 출력의 계약을 테스트로 고정합니다. (page.tsx는 이 함수들을
 * 호출만 합니다 — 동작은 동일.)
 */
import type { Metadata } from 'next';
import { resolveExcerpt, type PostData } from '@/domain/post';
import { resolveAbsoluteThumbnailUrl } from '@/domain/post/thumbnail';
import { SITE_NAME, SITE_URL, TITLE_SUFFIX } from '@/lib/constants';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

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
): string {
  return resolveExcerpt(post.content, post.excerpt);
}

/**
 * 'YYYY-MM-DD' → KST ISO(`...T00:00:00+09:00`). null/undefined면 undefined.
 * validate-posts가 권장하는 offset 포함 full-ISO(`2026-05-24T09:00:00+09:00`)는
 * 이미 완전한 형식이므로 그대로 반환한다 (suffix를 덧붙이면 invalid ISO가 됨).
 */
export function toKstIsoDate(
  date: string | null | undefined,
): string | undefined {
  if (!date) return undefined;
  return date.includes('T') ? date : `${date}T00:00:00+09:00`;
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

/** Next.js generateMetadata가 반환할 Metadata(OG/Twitter/canonical). */
export function buildPostMetadata(post: SeoPost, slug: string): Metadata {
  const description = buildDescription(post);
  const absoluteThumbnailUrl = resolveAbsoluteThumbnailUrl({ ...post, slug });
  return {
    title: `${resolveSeoTitle(post)}${TITLE_SUFFIX}`,
    description,
    alternates: { canonical: `/posts/${slug}/` },
    openGraph: {
      // og:title에는 짧은 seoTitle이 아니라 **원래 제목**이 나간다. 잘림이
      // 문제인 건 SERP의 `<title>`이고, 공유 카드는 폭이 넉넉하다.
      title: post.title,
      description,
      url: `/posts/${slug}/`,
      // 사이트 이름은 상수 하나에서만 온다. 예전엔 여기만 'Frontend Lab Blog'라
      // 홈·목록·about('Frontend Lab')과 어긋나서 og:site_name이 두 종류였다.
      siteName: SITE_NAME,
      // 홈·목록에만 있고 글에는 없어서 44/46 페이지에 og:locale이 빠져 있었다.
      locale: 'ko_KR',
      type: 'article',
      // JSON-LD(datePublished)와 동일하게 KST 기준 완전한 ISO 8601로 통일
      publishedTime: toKstIsoDate(post.date),
      images: [
        {
          url: absoluteThumbnailUrl,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
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
export function buildPostJsonLd(
  post: SeoPost,
  slug: string,
): Record<string, unknown> {
  const postUrl = `${SITE_URL}/posts/${slug}/`;
  const absoluteThumbnailUrl = resolveAbsoluteThumbnailUrl({ ...post, slug });
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: toKstIsoDate(post.date),
    // updatedAt이 있으면 그것을, 없으면 date를 dateModified로.
    dateModified: post.updatedAt
      ? toKstIsoDate(post.updatedAt)
      : toKstIsoDate(post.date),
    description: buildDescription(post),
    image: {
      '@type': 'ImageObject',
      url: absoluteThumbnailUrl,
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
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
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    url: postUrl,
    author: {
      '@type': 'Person',
      '@id': `${SITE_URL}/#author`,
      name: 'Sangwook Han',
      alternateName: '한상욱',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Frontend Lab',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo-wordmark.svg`,
        width: 280,
        height: 60,
      },
    },
    isPartOf: { '@id': `${SITE_URL}/#website` },
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
export function buildBreadcrumbJsonLd(
  post: Pick<PostData, 'title'>,
  slug: string,
): Record<string, unknown> {
  const postUrl = `${SITE_URL}/posts/${slug}/`;
  const items = [
    { position: 1, name: 'Home', item: `${SITE_URL}/` },
    { position: 2, name: 'Posts', item: `${SITE_URL}/posts/` },
    { position: 3, name: post.title, item: postUrl },
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
