import {
  getAllPostSlugs,
  getPostBySlug,
  getAdjacentPosts,
  getSeriesAdjacentPosts,
} from '@/lib/posts';
import {
  resolveThumbnailUrl,
  resolveAbsoluteThumbnailUrl,
} from '@/domain/post/thumbnail';
import { SITE_URL } from '@/lib/constants';
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

  const thumbnailUrl = resolveThumbnailUrl(post);
  const absoluteThumbnailUrl = resolveAbsoluteThumbnailUrl(post);
  const description = post.excerpt || post.content.slice(0, 160) + '...';

  return {
    title: `${post.title} | Frontend Lab Blog`,
    description,
    alternates: {
      canonical: `/posts/${slug}`,
    },
    openGraph: {
      title: post.title,
      description,
      url: `/posts/${slug}`,
      siteName: 'Frontend Lab Blog',
      type: 'article',
      publishedTime: post.date || undefined,
      images: [
        {
          url: absoluteThumbnailUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: [absoluteThumbnailUrl],
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

  const thumbnailUrl = resolveThumbnailUrl(post);
  const absoluteThumbnailUrl = resolveAbsoluteThumbnailUrl(post);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    description: post.excerpt || post.content.slice(0, 160) + '...',
    image: absoluteThumbnailUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/posts/${slug}`,
    },
    author: {
      '@type': 'Person',
      name: 'Sangwook Han',
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostClient
        post={post}
        thumbnailUrl={post.thumbnail ? thumbnailUrl : undefined}
      />
      <div className={css({ maxW: '1200px', m: '0 auto', p: '0 24px' })}>
        <PostNavigation prev={prev} next={next} seriesNav={seriesNav} />
      </div>
    </>
  );
}
