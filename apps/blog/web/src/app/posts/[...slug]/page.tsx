import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
} from '@/lib/posts';
import { notFound } from 'next/navigation';
import PostClient from './PostClient';
import { PostNavigation } from '@/src/components/post/PostNavigation';
import type { Metadata } from 'next';
import { css } from '@design-system/ui-lib/css';

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
      images: [
        {
          url: post.thumbnail
            ? post.thumbnail.startsWith('http') ||
              post.thumbnail.startsWith('/')
              ? post.thumbnail
              : `/posts/${post.relativeDir ? post.relativeDir + '/' : ''}${post.thumbnail}`
            : '/og-default.png',
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || post.content.slice(0, 160) + '...',
      images: [
        post.thumbnail
          ? post.thumbnail.startsWith('http') || post.thumbnail.startsWith('/')
            ? post.thumbnail
            : `/posts/${post.relativeDir ? post.relativeDir + '/' : ''}${post.thumbnail}`
          : '/og-default.png',
      ],
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

  const { prev, next } = getAdjacentPosts(slug);
  const seriesAdj = getSeriesAdjacentPosts(slug);
  const seriesNav = seriesAdj.seriesName
    ? {
        prev: seriesAdj.prev,
        next: seriesAdj.next,
        seriesName: seriesAdj.seriesName,
      }
    : null;

  const thumbnailUrl = post.thumbnail
    ? post.thumbnail.startsWith('http') || post.thumbnail.startsWith('/')
      ? post.thumbnail
      : `/posts/${post.relativeDir ? post.relativeDir + '/' : ''}${post.thumbnail}`
    : '/og-default.png';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    description: post.excerpt || post.content.slice(0, 160) + '...',
    image: `https://blog.sangwook.dev${thumbnailUrl}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://blog.sangwook.dev/posts/${slug}`,
    },
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
      <PostClient post={post} thumbnailUrl={post.thumbnail} />
      <div className={css({ maxW: '800px', m: '0 auto', p: '0 24px' })}>
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </div>
    </>
  );
}
