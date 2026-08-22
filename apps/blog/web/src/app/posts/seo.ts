/**
 * 아카이브(`/posts/`)의 SEO 매개변수 — `<head>` 메타데이터와 JSON-LD 두 벌.
 *
 * 글 목록에 의존하는 `CollectionPage`는 목록을 인자로 받습니다. 로더를 여기서
 * 다시 부르면 페이지가 그리는 목록과 구조화 데이터가 서로 다른 스냅샷을 말할
 * 수 있어, 페이지가 이미 가진 배열을 그대로 넘기게 둡니다.
 */
import contentConfig from '@/content.config.mts';

// 사이트 정체성·저자·SEO 예산은 해석된 설정에서 온다 — 값의 출처는
// `content.values.mts`이고, 여기서 리터럴을 다시 읽지 않는다(서버 전용 모듈).
const { site: SITE, seo: SEO } = contentConfig;
import type { Metadata } from 'next';
import {
  archiveUrl,
  postUrl,
  POSTS_PATH,
  type PostSummary,
} from '@blog/content';

// `<title>`·description을 세 곳(meta·og·twitter)에 각각 적으면 한 곳만 고쳐졌을 때
// 공유 카드와 검색 결과가 서로 다른 말을 한다. 페이지당 한 번만 쓴다 — /series가
// 쓰는 방식과 같다.
const PAGE_TITLE = `모든 노트${SEO.titleSuffix}`;
const PAGE_DESCRIPTION =
  '프론트엔드 실험실에 쌓인 글 전부를 한 곳에서 봅니다. 태그·시리즈·연도로 좁혀 가며 번들러 만들기, TypeScript 설계, React 컴포넌트 패턴, 배포 파이프라인, 오픈소스 기여 기록 중 지금 필요한 글을 찾아보세요.';

export function buildPostsMetadata(): Metadata {
  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: POSTS_PATH },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: archiveUrl(SITE.url),
      siteName: SITE.name,
      images: [
        {
          url: SITE.ogDefaultImage,
          width: 1200,
          height: 630,
          alt: `${SITE.name} Blog Posts`,
        },
      ],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: [SITE.ogDefaultImage],
    },
  };
}

export function buildCollectionPageJsonLd(posts: PostSummary[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': archiveUrl(SITE.url),
    name: 'Posts | Frontend Lab',
    url: archiveUrl(SITE.url),
    description: '프론트엔드 실험실의 모든 기록들을 확인해보세요.',
    inLanguage: 'ko',
    isPartOf: { '@id': `${SITE.url}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        // 예전 리터럴 조합은 인코딩이 빠져 있었다 — 한글 slug 글이 생기면
        // ItemList만 sitemap·페이지 링크와 다른 URL을 말하게 되는 자리였다.
        item: postUrl(post.slug, SITE.url),
        name: post.title,
      })),
    },
  };
}

export function buildBlogJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${archiveUrl(SITE.url)}#blog`,
    name: 'Frontend Lab — 실험 기록들',
    url: archiveUrl(SITE.url),
    description:
      '프론트엔드 실험실의 모든 기록들. React, TypeScript, 번들러 시리즈 등.',
    inLanguage: 'ko',
    author: { '@id': `${SITE.url}/#author` },
    publisher: { '@id': `${SITE.url}/#organization` },
    isPartOf: { '@id': `${SITE.url}/#website` },
  };
}
