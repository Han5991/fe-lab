/**
 * 사이트 전역 `<head>` 메타데이터 — 루트 레이아웃(`layout.tsx`)이 씁니다.
 *
 * 페이지가 자기 `metadata`로 덮지 않은 필드의 기본값이자, `metadataBase`·
 * 파비콘·웹매니페스트·검색엔진 인증처럼 문서 전체에 한 번만 나가는 값들이
 * 모이는 곳입니다. 레이아웃은 이 함수를 부르기만 합니다.
 */
import type { Metadata } from 'next';
import {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION_EXPANDED,
  OG_DEFAULT_IMAGE,
} from '@blog/content';

// 제목은 meta·og·twitter 세 곳에 나간다. 한 번만 쓴다.
const DEFAULT_TITLE = `${SITE_NAME} | 프론트엔드 실험실`;

export function buildSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    // RSS alternate link는 RootLayout의 <head>에 직접 추가합니다
    // (Next 16 metadata.alternates.types로는 출력되지 않는 문제 회피)
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION_EXPANDED,
    openGraph: {
      title: DEFAULT_TITLE,
      description: SITE_DESCRIPTION_EXPANDED,
      url: SITE_URL,
      siteName: SITE_NAME,
      images: [
        {
          url: OG_DEFAULT_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} Blog`,
        },
      ],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: DEFAULT_TITLE,
      description: SITE_DESCRIPTION_EXPANDED,
      images: [OG_DEFAULT_IMAGE],
    },
    verification: {
      other: {
        'naver-site-verification': '8f6135bb66d952d10dd08c6460797fd98fa26823',
      },
    },
    icons: {
      icon: [
        { url: `/favicon.ico`, sizes: 'any' },
        { url: `/favicon-16x16.png`, type: 'image/png', sizes: '16x16' },
        { url: `/favicon-32x32.png`, type: 'image/png', sizes: '32x32' },
      ],
      shortcut: `/favicon.ico`,
      apple: [
        {
          url: `/apple-touch-icon.png`,
          sizes: '180x180',
          type: 'image/png',
        },
      ],
      other: [
        {
          rel: 'icon',
          url: `/android-chrome-192x192.png`,
          sizes: '192x192',
          type: 'image/png',
        },
        {
          rel: 'icon',
          url: `/android-chrome-512x512.png`,
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    manifest: `/site.webmanifest`,
  };
}
