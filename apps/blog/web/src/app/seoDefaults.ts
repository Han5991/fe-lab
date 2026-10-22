/**
 * 페이지 SEO 모듈들이 함께 쓰는 값 — 사이트 기본 제목과, 기본 공유 이미지를 쓰는 페이지의
 * og·twitter 묶음. 페이지마다 이 묶음을 다시 적으면 이미지 크기·locale·카드 종류가 한 곳만
 * 바뀌고, 절대·상대 이미지 URL이 페이지마다 갈린다(예전에 실제로 갈려 있었다).
 */
import contentConfig from '@/content.config.mts';
import { SITE_ALTERNATE_NAME } from '@/content.values.mts';

// 사이트 정체성·OG 규격은 해석된 설정에서 온다(서버 전용 모듈).
const { site: SITE, og: OG } = contentConfig;

/** 루트 레이아웃의 기본 제목이자 홈의 제목. */
export const SITE_DEFAULT_TITLE = `${SITE.name} | ${SITE_ALTERNATE_NAME}`;

interface ShareCardInput {
  title: string;
  description: string;
  /** og:url — 절대 URL */
  url: string;
  imageAlt: string;
}

/** 사이트 기본 이미지(`SITE.ogDefaultImage`)를 쓰는 og·twitter 공유 카드. */
export function defaultShareCard({
  title,
  description,
  url,
  imageAlt,
}: ShareCardInput) {
  const image = `${SITE.url}${SITE.ogDefaultImage}`;
  return {
    openGraph: {
      title,
      description,
      url,
      siteName: SITE.name,
      images: [
        { url: image, width: OG.width, height: OG.height, alt: imageAlt },
      ],
      locale: SITE.locale,
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image],
    },
  };
}
