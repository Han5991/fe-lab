/**
 * About 페이지의 SEO 매개변수 — `<head>` 메타데이터와 JSON-LD.
 *
 * 화면을 고치러 page.tsx를 열었을 때 70줄짜리 문자열 덩어리를 먼저 지나지
 * 않도록 값을 이쪽에 모읍니다. 페이지는 두 함수를 부르기만 합니다.
 *
 * Next `Metadata`에 매인 코드라 프레임워크 중립인 `@blog/content`가 아니라 앱에
 * 둡니다 — 글 상세의 `posts/[...slug]/nextMetadata.ts`와 같은 자리입니다.
 */
import contentConfig from '@/content.config.mts';
import { ABOUT_PAGE_MODIFIED, ABOUT_PATH } from '@/content.values.mts';
import type { Metadata } from 'next';

// 사이트 정체성·저자·SEO 예산은 해석된 설정에서 온다 — 값의 출처는
// `content.values.mts`이고, 여기서 리터럴을 다시 읽지 않는다(서버 전용 모듈).
const { site: SITE, author: AUTHOR, seo: SEO } = contentConfig;

// 절대 URL은 상대 경로에서 한 번만 파생한다(`@blog/content`의 postPath→postUrl과
// 같은 관례). og url·JSON-LD `@id`·url이 이 하나를 공유한다.
const ABOUT_URL = `${SITE.url}${ABOUT_PATH}`;

const PAGE_TITLE = `소개${SEO.titleSuffix}`;
const SEARCH_DESCRIPTION =
  '프론트엔드 엔지니어 한상욱(Sangwook Han)의 소개 페이지입니다. Mantine·Node.js·Next.js·gemini-cli 오픈소스 기여자이자 FEConf 2025·TeoConf 발표자. 번들러 내부와 TypeScript 설계를 파고듭니다.';
// 공유 카드(og·twitter)용 짧은 소개. 검색 결과용 description과 일부러 다르다 —
// 카드는 한 줄로 읽히는 게 낫고, SERP는 길이 예산(120~160자)을 채워야 한다.
const SHARE_DESCRIPTION =
  '프론트엔드 엔지니어 한상욱(Sangwook Han). Mantine 27 PRs, Node.js 코어 기여, gemini-cli 74% 성능 개선. FEConf 2025 발표자.';

export function buildAboutMetadata(): Metadata {
  return {
    title: PAGE_TITLE,
    description: SEARCH_DESCRIPTION,
    alternates: { canonical: ABOUT_PATH },
    openGraph: {
      title: PAGE_TITLE,
      description: SHARE_DESCRIPTION,
      url: ABOUT_URL,
      siteName: SITE.name,
      // 사람 소개 페이지라 website가 아니라 profile이다. 지정하지 않으면
      // og:type 자체가 빠져서 크롤러가 문서 종류를 추정하게 된다.
      type: 'profile',
      firstName: 'Sangwook',
      lastName: 'Han',
      username: 'Han5991',
      locale: 'ko_KR',
      images: [
        {
          url: `${SITE.url}${SITE.ogDefaultImage}`,
          width: 1200,
          height: 630,
          alt: `${SITE.name} Blog`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: PAGE_TITLE,
      description: SHARE_DESCRIPTION,
      images: [`${SITE.url}${SITE.ogDefaultImage}`],
    },
  };
}

export function buildAboutJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': ABOUT_URL,
    url: ABOUT_URL,
    name: '한상욱 (Sangwook Han) — About',
    dateCreated: '2024-12-01',
    // 빌드 시각을 넣으면 매일 cron 빌드마다 "수정됨"으로 보고되어 신호가 무의미해진다.
    // 이 페이지 내용을 실제로 고칠 때 상수를 갱신할 것. sitemap의 `<lastmod>`도
    // 같은 상수를 읽으므로(`SITEMAP_STATIC_PAGES`) 두 값이 어긋날 수 없다.
    // 해석된 설정이 아니라 값 모듈에서 직접 읽는 이유: about 페이지의 존재 자체가
    // 이 사이트의 사정이라 패키지 `SiteConfig`에 이 축이 없다.
    dateModified: ABOUT_PAGE_MODIFIED,
    mainEntity: {
      '@type': 'Person',
      '@id': `${SITE.url}/#author`,
      name: 'Sangwook Han',
      alternateName: '한상욱',
      url: SITE.url,
      image: {
        '@type': 'ImageObject',
        url: 'https://github.com/Han5991.png?size=400',
        width: 400,
        height: 400,
      },
      jobTitle: 'Frontend Engineer',
      description:
        '번들러 내부 구조, TypeScript 설계 패턴, 오픈소스 기여를 탐구하는 프론트엔드 엔지니어. Mantine, Node.js, gemini-cli, Next.js 오픈소스 기여자.',
      knowsAbout: [
        'React',
        'TypeScript',
        'JavaScript',
        'Module Bundlers',
        'Frontend Architecture',
        'Open Source',
      ],
      sameAs: [AUTHOR.github, AUTHOR.linkedin],
    },
  };
}
