import { getAllPostSlugs, getPostBySlug } from '@/lib/posts';
import { notFound } from 'next/navigation';
import PostClient from './PostClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map(slug => ({
    slug: slug.split('/'),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug.join('/'));
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title} | Frontend Lab Blog`,
    description: post.excerpt || post.content.slice(0, 160) + '...',
    alternates: {
      canonical: `/posts/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.slice(0, 160) + '...',
      url: `/posts/${slug}`,
      siteName: 'Frontend Lab Blog',
      type: 'article',
      publishedTime: post.date || undefined,
    },
    twitter: {
      card: 'summary',
      title: post.title,
      description: post.excerpt || post.content.slice(0, 160) + '...',
    },
  };
}

export default async function PostPage({ params }: Props) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug.join('/'));
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    description: post.excerpt || post.content.slice(0, 160) + '...',
    author: {
      '@type': 'Person',
      name: 'Sangwook Han',
      url: 'https://blog.sangwook.dev',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostClient post={post} />
    </>
  );
}
