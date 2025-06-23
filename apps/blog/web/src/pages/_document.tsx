import { Html, Head, Main, NextScript } from 'next/document';
import { GoogleAnalytics } from '@next/third-parties/google';

export default function Document() {
  return (
    <Html lang="ko">
      <Head />
      <body>
        {process.env.NODE_ENV === 'production' && (
          <GoogleAnalytics gaId="G-ZS9ENFSSQ0" />
        )}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
