import { GetStaticProps } from 'next';
import Link from 'next/link';
import { getAllPosts, PostData } from '../../../lib/posts';

interface PostsPageProps {
  posts: PostData[];
}

export default function PostsPage({ posts }: PostsPageProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>블로그 포스트</h1>
      <div style={{ marginTop: '2rem' }}>
        {posts.map(post => (
          <article
            key={post.slug}
            style={{
              marginBottom: '2rem',
              padding: '1rem',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
            }}
          >
            <h2>
              <Link
                href={`/posts/${post.slug}`}
                style={{ textDecoration: 'none', color: '#333' }}
              >
                {post.title}
              </Link>
            </h2>
            {post.date && (
              <p
                style={{
                  color: '#666',
                  fontSize: '0.9rem',
                  margin: '0.5rem 0',
                }}
              >
                {new Date(post.date).toLocaleDateString('ko-KR')}
              </p>
            )}
            <p style={{ color: '#666', lineHeight: '1.6' }}>{post.excerpt}</p>
            <Link
              href={`/posts/${post.slug}`}
              style={{ color: '#0070f3', textDecoration: 'none' }}
            >
              더 읽기 →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const posts = getAllPosts();

  return {
    props: {
      posts,
    },
  };
};
