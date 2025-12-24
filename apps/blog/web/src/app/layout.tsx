import '@/src/styles/globals.css';
import { Providers } from './providers';
import { Layout } from '@/src/components/Layout';
import { GoogleAnalytics } from '@next/third-parties/google';
import type { Metadata } from 'next';

const PREFIX = process.env.NODE_ENV === 'production' ? '/fe-lab' : '';

export const metadata: Metadata = {
  title: 'Frontend Lab | 프론트엔드 실험실',
  description:
    '프론트엔드 기술 실험과 깊이 있는 학습 내용을 공유하는 공간입니다.',
  icons: {
    icon: `${PREFIX}/favicon.ico`,
    shortcut: `${PREFIX}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
