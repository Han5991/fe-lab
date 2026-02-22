import { getAllPostSlugs } from '@/lib/posts';
import PostDetailClient from './PostDetailClient';

export function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map(slug => ({
    slug,
  }));
}

export default function PostDetailAnalyticsPage() {
  return <PostDetailClient />;
}
