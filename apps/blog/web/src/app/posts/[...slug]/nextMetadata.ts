/**
 * PostSeoData(프레임워크 중립 DTO) → Next `Metadata` 어댑터.
 *
 * SEO 계산(postSeo.ts)은 next를 모른다 — Next 전용 형태로 바꾸는 것은 앱의
 * 일이라 여기서 한다. 필드 대응은 1:1이고 값 가공은 하지 않는다(가공이
 * 필요하면 postSeo 쪽 계산에 넣어 테스트로 잠글 것).
 */
import type { Metadata } from 'next';
import type { PostSeoData } from '@blog/content/seo';

export function toNextMetadata(seo: PostSeoData): Metadata {
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: seo.canonicalPath },
    openGraph: {
      title: seo.openGraph.title,
      description: seo.openGraph.description,
      url: seo.openGraph.url,
      siteName: seo.openGraph.siteName,
      locale: seo.openGraph.locale,
      type: seo.openGraph.type,
      publishedTime: seo.openGraph.publishedTime,
      images: seo.openGraph.images.map(image => ({
        url: image.url,
        width: image.width,
        height: image.height,
        alt: image.alt,
      })),
    },
    twitter: {
      card: seo.twitter.card,
      title: seo.twitter.title,
      description: seo.twitter.description,
      images: seo.twitter.images,
    },
  };
}
