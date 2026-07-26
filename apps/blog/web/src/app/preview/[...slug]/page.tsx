import { notFound } from 'next/navigation';
import {
  getAllPostsIncludingHidden,
  getPostBySlugIncludingHidden,
} from '@/domain/post';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import PostClient from '@/src/app/posts/[...slug]/PostClient';
import { PreviewBanner } from '@/src/components/preview/PreviewBanner';

interface Props {
  params: Promise<{
    slug: string[];
  }>;
}

export const dynamic = 'force-static';

export async function generateStaticParams() {
  if (process.env.NODE_ENV !== 'development') {
    return [{ slug: ['__disabled__'] }];
  }
  return getAllPostsIncludingHidden().map(post => ({
    slug: post.slug.split('/'),
  }));
}

export const metadata = {
  title: 'Preview',
  robots: { index: false, follow: false },
};

export default async function PreviewPage({ params }: Props) {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug.join('/'));
  const post = getPostBySlugIncludingHidden(slug);

  if (!post) {
    notFound();
  }

  const thumbnailUrl = resolveThumbnailUrl(post);

  return (
    <>
      <PreviewBanner status={post.status} scheduledDate={post.scheduledDate} />
      <PostClient
        post={post}
        thumbnailUrl={post.thumbnail ? thumbnailUrl : undefined}
        previewMode
      />
    </>
  );
}
