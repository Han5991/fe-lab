import 'pretendard/dist/web/static/pretendard.css';
import '@/src/styles/globals.css';
import { Providers } from './providers';
import { Layout } from '@/src/components/Layout';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { jetbrainsMono } from './fonts';

export const metadata: Metadata = {
  metadataBase: new URL('https://blog.sangwook.dev'),
  // RSS alternate link는 RootLayout의 <head>에 직접 추가합니다
  // (Next 16 metadata.alternates.types로는 출력되지 않는 문제 회피)
  title: 'Frontend Lab | 프론트엔드 실험실',
  description:
    'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴, 성능 최적화, 오픈소스 기여 노하우를 다룹니다.',
  openGraph: {
    title: 'Frontend Lab | 프론트엔드 실험실',
    description:
      'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴, 성능 최적화, 오픈소스 기여 노하우를 다룹니다.',
    url: 'https://blog.sangwook.dev',
    siteName: 'Frontend Lab',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Frontend Lab Blog',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Frontend Lab | 프론트엔드 실험실',
    description:
      'React, TypeScript, 번들러 아키텍처부터 오픈소스 기여까지. 프론트엔드 엔지니어 한상욱이 직접 실험하고 기록하는 공간입니다. 설계 패턴, 성능 최적화, 오픈소스 기여 노하우를 다룹니다.',
    images: ['/og-default.png'],
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${jetbrainsMono.variable}`}
    >
      <head>
        {/* 테마 초기화: paint 전에 쿠키 → 없으면 시스템 설정(prefers-color-scheme)
            순으로 반영해 FOUC 방지. 쿠키에 명시 선택이 있으면 그것을 우선한다.
            이 스크립트는 hydration 전에 실행돼야 해서 useTheme를 import할 수 없다.
            아래 theme 쿠키 정규식은 useTheme.ts의 readCookie()와 의도적으로 동일한
            복제본이다 — 한쪽만 바꾸지 말고 반드시 함께 맞춰라(문자열 안이라 `\\s`로 이스케이프). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|;\\s*)theme=(dark|light)/);var t=m?m[1]:((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();",
          }}
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Frontend Lab RSS Feed"
          href="/rss.xml"
        />
      </head>
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
        {process.env.NODE_ENV === 'production' && (
          <>
            <GoogleAnalytics gaId="G-ZS9ENFSSQ0" />
            <GoogleTagManager gtmId="GTM-5SMPQ23P" />
          </>
        )}
      </body>
    </html>
  );
}
