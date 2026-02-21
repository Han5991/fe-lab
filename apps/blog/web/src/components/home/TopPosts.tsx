'use client';

import { css } from '@design-system/ui-lib/css';
import { client } from '@/lib/client';
import type { PostData } from '@/lib/posts';
import { PostCard } from './PostCard';
import { useSuspenseQuery } from '@tanstack/react-query';

interface TopPostsProps {
  posts: PostData[];
}

export function TopPostsLoading() {
  return (
    <section
      className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto' })}
    >
      <div
        className={css({
          h: '8',
          w: '48',
          bg: 'gray.200',
          rounded: 'md',
          mx: 'auto',
          mb: '10',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        })}
      />
      <div
        className={css({
          h: 64,
          bg: 'gray.100',
          rounded: '2xl',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        })}
      />
    </section>
  );
}

interface RankedPost extends PostData {
  viewCount: number;
}

export function TopPosts({ posts }: TopPostsProps) {
  const { data: topPosts } = useSuspenseQuery({
    queryKey: ['top-posts'],
    queryFn: async () => {
      const { data } = await client
        .from('post_views')
        .select('slug, view_count')
        .order('view_count', { ascending: false })
        .limit(3);
      return data;
    },
    select: data => {
      if (data === null) return [];
      const postsBySlug = new Map(posts.map(p => [p.slug, p]));
      return data
        .map(view => {
          const post = postsBySlug.get(view.slug);
          if (post === undefined) return null;
          return { ...post, viewCount: view.view_count };
        })
        .filter((post): post is RankedPost => post !== null);
    },
  });

  if (topPosts.length === 0) return null;

  return (
    <section
      className={css({ py: '20', px: '6', maxWidth: '7xl', mx: 'auto' })}
    >
      <h2
        className={css({
          fontSize: '3xl',
          fontWeight: 'bold',
          mb: '10',
          textAlign: 'center',
        })}
      >
        🔥 인기 있는 실험 기록
      </h2>
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: '3fr' },
          gap: '8',
        })}
      >
        {topPosts.map((post, index) => (
          <PostCard key={post.slug} post={post} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
