/**
 * 시리즈 목록(`/series/`)의 SEO 매개변수 — `<head>` 메타데이터와 JSON-LD.
 *
 * `PAGE_DESCRIPTION`은 화면 헤더에도 그대로 나가므로 페이지가 가져다 씁니다.
 * meta description과 눈에 보이는 소개 문구가 갈라지지 않게 하나만 둡니다.
 */
import contentConfig from '@/content.config.mts';
import type { Metadata } from 'next';

// 사이트 정체성·저자·SEO 예산은 해석된 설정에서 온다 — 값의 출처는
// `content.values.mts`이고, 여기서 리터럴을 다시 읽지 않는다(서버 전용 모듈).
const { site: SITE } = contentConfig;

const PAGE_TITLE = `시리즈 | ${SITE.name}`;
export const PAGE_DESCRIPTION =
  '여러 편으로 이어지는 글을 시리즈로 묶었습니다. 번들러 직접 만들기, TypeScript로 설계하는 프로젝트, 우아한 에러 핸들링, ECS 배포 파이프라인까지 — 시리즈마다 1편부터 순서대로, 중간에 길을 잃지 않고 읽을 수 있습니다.';

export function buildSeriesMetadata(): Metadata {
  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: '/series/' },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: `${SITE.url}/series/`,
      siteName: SITE.name,
      images: [
        {
          url: `${SITE.url}${SITE.ogDefaultImage}`,
          width: 1200,
          height: 630,
          alt: `${SITE.name} Series`,
        },
      ],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: [`${SITE.url}${SITE.ogDefaultImage}`],
    },
  };
}

export function buildSeriesJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE.url}/series/`,
    name: `시리즈 | ${SITE.name}`,
    url: `${SITE.url}/series/`,
    description: PAGE_DESCRIPTION,
    inLanguage: 'ko',
    isPartOf: { '@id': `${SITE.url}/#website` },
  };
}
