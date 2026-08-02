// 가변(variable) 동적 서브셋. 예전엔 static 동적 서브셋을 썼는데, 그건 9개
// 웨이트 × 92개 유니코드 서브셋 × (woff2 + woff) = @font-face 828개짜리
// 542KB 스타일시트라 렌더 블로킹 CSS 청크가 gzip 137KB까지 부풀었다(Lighthouse
// unused-css-rules에서 100% 미사용으로 잡힌 파일이 이것). 가변 폰트 한 벌이면
// 같은 서브셋 92개를 @font-face 92개로 덮고, 웨이트는 45~920 축에서 뽑는다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@/src/styles/globals.css';
import { Providers } from './providers';
import { Layout } from '@/src/components/Layout';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { jetbrainsMono } from './fonts';
import { THEME_COOKIE_MATCH } from '@/src/hooks/theme-cookie';

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
            이 스크립트는 hydration 전에 실행돼야 해서 useTheme를 import할 수 없지만,
            쿠키 정규식은 theme-cookie.ts의 THEME_COOKIE_MATCH 단일 소스를 빌드 시
            주입한다(readCookie()도 같은 소스 → 두 곳이 어긋날 수 없음).

            dev 콘솔에 "Encountered a script tag while rendering React component"
            경고가 뜨는데, **개발 빌드 전용**이다(이 문자열은 react-dom의
            *.development.js 에만 있고 프로덕션 번들에는 없다). React가 클라이언트
            렌더 경로에서 script 엘리먼트를 만들 때 내는 경고인데, 정작 이 스크립트는
            SSR된 HTML에서 이미 실행돼 제 일을 끝낸 뒤다.

            next/script(strategy="beforeInteractive")로 바꿔봐도 경고는 그대로 나고
            (React 트리를 거치는 건 같다), 스크립트 위치만 <head> 2번째에서 30번째로
            밀려 오히려 늦게 실행된다. react-dom 소스의 isScriptDataBlock()을 보면
            경고를 면제받는 건 실행되지 않는 data block(application/json 류)뿐이라,
            실행돼야 하는 이 스크립트로는 피할 방법이 없다. 외부 파일(src=)로 빼면
            사라지지만 첫 페인트 전에 요청이 한 번 더 붙는다 — dev 경고를 없애자고
            실사용자 FCP를 깎는 건 남는 장사가 아니라서 그대로 둔다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(new RegExp(${JSON.stringify(
              THEME_COOKIE_MATCH,
            )}));var t=m?m[1]:((window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light');document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
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
