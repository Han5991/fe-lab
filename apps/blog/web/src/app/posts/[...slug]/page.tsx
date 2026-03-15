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

  const postUrl = `${SITE_URL}/posts/${slug}/`;
  const isoDate = (date: string | null) =>
    date ? `${date}T00:00:00+09:00` : undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    datePublished: isoDate(post.date),
    dateModified: isoDate(post.date),
    description: post.excerpt || post.content.slice(0, 160) + '...',
    image: {
      '@type': 'ImageObject',
      url: absoluteThumbnailUrl,
      width: 1200,
      height: 630,
    },
    inLanguage: 'ko',
    ...(post.tags &&
      post.tags.length > 0 && {
        keywords: post.tags.join(', '),
      }),
    ...(post.series && { articleSection: post.series }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    author: { '@id': `${SITE_URL}/#author` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    isPartOf: post.series
      ? {
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/posts/?series=${encodeURIComponent(post.series)}`,
          name: post.series,
          url: `${SITE_URL}/posts/?series=${encodeURIComponent(post.series)}`,
        }
      : { '@id': `${SITE_URL}/#website` },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', 'h2:first-of-type', 'article > p:first-of-type'],
    },
  };

  const breadcrumbItems: Array<{
    position: number;
    name: string;
    item: string;
  }> = [
    { position: 1, name: 'Home', item: `${SITE_URL}/` },
    { position: 2, name: 'Posts', item: `${SITE_URL}/posts/` },
  ];
  if (post.series) {
    breadcrumbItems.push({
      position: 3,
      name: post.series,
      item: `${SITE_URL}/posts/?series=${encodeURIComponent(post.series)}`,
    });
    breadcrumbItems.push({ position: 4, name: post.title, item: postUrl });
  } else {
    breadcrumbItems.push({ position: 3, name: post.title, item: postUrl });
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map(({ position, name, item }) => ({
      '@type': 'ListItem',
      position,
      name,
      item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
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
