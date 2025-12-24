import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <link rel="icon" href={`${process.env.NODE_ENV === 'production' ? '/fe-lab' : ''}/favicon.ico`} />
        <link rel="shortcut icon" href={`${process.env.NODE_ENV === 'production' ? '/fe-lab' : ''}/favicon.ico`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
