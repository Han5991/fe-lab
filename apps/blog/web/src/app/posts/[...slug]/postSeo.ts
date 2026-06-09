/**
 * 포스트 상세 페이지의 SEO 메타데이터 / 구조화 데이터(JSON-LD) 빌더.
 *
 * 이전에는 page.tsx에 인라인되어 단위 테스트가 불가능했습니다. 순수 함수로 분리해
 * 콘텐츠(post) → SEO 출력의 계약을 테스트로 고정합니다. (page.tsx는 이 함수들을
 * 호출만 합니다 — 동작은 동일.)
 */
import type { Metadata } from 'next';
import type { PostData } from '@/domain/post';
import { resolveAbsoluteThumbnailUrl } from '@/domain/post/thumbnail';
import { SITE_URL } from '@/lib/constants';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/** SEO 빌더가 필요로 하는 post 필드만 추린 타입 */
export type SeoPost = Pick<
  PostData,
  | 'title'
  | 'excerpt'
  | 'content'
  | 'date'
  | 'updatedAt'
  | 'thumbnail'
  | 'relativeDir'
  | 'tags'
  | 'series'
>;

/** description: excerpt가 있으면 그대로, 없으면 본문 앞 160자(잘릴 때만 '...'). */
export function buildDescription(
  post: Pick<PostData, 'excerpt' | 'content'>,
): string {
  if (post.excerpt) return post.excerpt;
  return post.content.length > 160
    ? post.content.slice(0, 160) + '...'
    : post.content;
}

/** 'YYYY-MM-DD' → KST ISO(`...T00:00:00+09:00`). null/undefined면 undefined. */
export function toKstIsoDate(
  date: string | null | undefined,
): string | undefined {
  return date ? `${date}T00:00:00+09:00` : undefined;
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
    title: `${post.title} | Frontend Lab`,
    description,
    alternates: { canonical: `/posts/${slug}/` },
    openGraph: {
      title: post.title,
      description,
      url: `/posts/${slug}/`,
      siteName: 'Frontend Lab Blog',
      type: 'article',
      publishedTime: post.date || undefined,
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
    ...(post.series && { articleSection: post.series }),
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
