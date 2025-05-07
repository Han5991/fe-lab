import { notFound } from 'next/navigation';
import type { Post } from '../page';
import Page1 from './Page1';
import Page2 from './Page2';
import { ErrorBoundary } from '@/components';

type PostProps = {
  params: Promise<{ id: string }>;
};

const Post = async ({ params }: PostProps) => {
  const { id } = await params;
  const res = await fetch(`https://api.vercel.app/blog/${id}`);
  if (res.status === 404) {
    notFound();
  }

  const data = (await res.json()) as Post;

  return (
    <>
      <div>{data.title}</div>
      <ErrorBoundary>
        <Page1 />
      </ErrorBoundary>
      <ErrorBoundary>
        <Page2 />
      </ErrorBoundary>
    </>
  );
};

export default Post;
