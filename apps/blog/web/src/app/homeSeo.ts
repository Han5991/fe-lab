/**
 * 홈(`/`)의 SEO 매개변수 — `<head>` 메타데이터와 JSON-LD.
 *
 * 사이트 전역 기본값은 `siteSeo.ts`(루트 레이아웃)에 있고, 여기에는 홈이 따로
 * 말하는 값만 둡니다. JSON-LD의 `@graph` 세 노드(WebSite·Organization·Person)는
 * 다른 페이지가 `@id`로 참조하는 정의라 홈에서 한 번만 내보냅니다.
 */
import contentConfig from '@/content.config.mts';
import type { Metadata } from 'next';
import {
  archiveUrl,
  type ArchiveFilters,
  localeLanguage,
} from '@blog/content/client';
import { buildAuthorPersonJsonLd } from './authorPerson';

// 사이트 정체성·저자·SEO 예산은 해석된 설정에서 온다 — 값의 출처는
// `content.values.mts`이고, 여기서 리터럴을 다시 읽지 않는다(서버 전용 모듈).
const { site: SITE, author: AUTHOR } = contentConfig;

// 제목은 meta·og·twitter 세 곳에 나가므로 한 번만 쓴다 — 한 곳만 고쳐지면
// 검색 결과와 공유 카드가 다른 말을 한다.
const PAGE_TITLE = `${SITE.name} | 프론트엔드 실험실`;

/** 검색어 쿼리 키 — 아카이브 필터의 키라 이름이 바뀌면 여기서 타입 에러가 난다. */
const SEARCH_QUERY_KEY: keyof ArchiveFilters = 'q';

export function buildHomeMetadata(): Metadata {
  return {
    title: PAGE_TITLE,
    description: SITE.descriptionExpanded,
    alternates: { canonical: '/' },
    openGraph: {
      title: PAGE_TITLE,
      description: SITE.descriptionExpanded,
      url: SITE.url,
      siteName: SITE.name,
      images: [
        {
          url: `${SITE.url}${SITE.ogDefaultImage}`,
          width: 1200,
          height: 630,
          alt: `${SITE.name} Blog`,
        },
      ],
      locale: SITE.locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: SITE.descriptionExpanded,
      images: [`${SITE.url}${SITE.ogDefaultImage}`],
    },
  };
}

export function buildHomeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: 'Frontend Lab',
        alternateName: '프론트엔드 실험실',
        url: SITE.url,
        description: SITE.descriptionExpanded,
        inLanguage: localeLanguage(SITE.locale),
        publisher: { '@id': `${SITE.url}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            // `{search_term_string}`은 Google이 치환하는 템플릿 플레이스홀더라
            // 인코딩되면 안 된다 — archivePath({ q })를 거치면
            // `%7Bsearch_term_string%7D`가 되어 템플릿으로 인식되지 않는다.
            // 그래서 여기만 아카이브 절대 URL + 수동 쿼리로 조합한다. 키는 아카이브가
            // 읽는 필터 키(ArchiveFilters)에 묶는다.
            urlTemplate: `${archiveUrl(SITE.url)}?${SEARCH_QUERY_KEY}={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        name: 'Frontend Lab',
        url: SITE.url,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE.url}/logo-wordmark.svg`,
          width: 280,
          height: 60,
        },
        description: SITE.descriptionExpanded,
        founder: { '@id': `${SITE.url}/#author` },
        sameAs: [AUTHOR.github, AUTHOR.linkedin],
      },
      buildAuthorPersonJsonLd(),
    ],
  };
}
