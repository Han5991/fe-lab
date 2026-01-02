import 'pretendard/dist/web/static/pretendard.css';
import '@/src/styles/globals.css';
import { Providers } from './providers';
import { Layout } from '@/src/components/Layout';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Frontend Lab | 프론트엔드 실험실',
  description:
    '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.',
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
    <html lang="ko">
      <body>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
        {process.env.NODE_ENV === 'production' && (
          <GoogleAnalytics gaId="G-ZS9ENFSSQ0" />
        )}
      </body>
    </html>
  );
}
