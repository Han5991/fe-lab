import Head from 'next/head';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Frontend Lab Blog</title>
        <meta
          name="description"
          content="프론트엔드 기술 실험과 학습 내용을 공유합니다"
        />
        <meta property="og:title" content="Frontend Lab Blog" />
        <meta
          property="og:description"
          content="프론트엔드 기술 실험과 학습 내용을 공유합니다"
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Frontend Lab Blog" />
        <meta
          name="twitter:description"
          content="프론트엔드 기술 실험과 학습 내용을 공유합니다"
        />
      </Head>

      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem' }}
        >
          Frontend Lab Blog
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
          프론트엔드 기술 실험과 학습 내용을 공유합니다
        </p>

        <div style={{ marginTop: '3rem' }}>
          <Link
            href="/posts"
            style={{
              display: 'inline-block',
              backgroundColor: '#0070f3',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '1.1rem',
              fontWeight: '500',
            }}
          >
            블로그 포스트 보기 →
          </Link>
        </div>
      </div>
    </>
  );
}
