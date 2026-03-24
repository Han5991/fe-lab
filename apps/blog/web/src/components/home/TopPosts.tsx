'use client';

import { css } from '@design-system/ui-lib/css';
import { client } from '@/lib/client';
import type { PostSummary } from '@/lib/posts';
import { PostCard } from './PostCard';
import { useSuspenseQuery } from '@tanstack/react-query';

interface TopPostsProps {
  posts: PostSummary[];
}

export function TopPostsLoading() {
  return (
    <section
      className={css({
        py: '12',
        maxW: '1200px',
        mx: 'auto',
        px: '6',
        borderTopWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      <div
        className={css({
          h: '5',
          w: '32',
          bg: 'ink.100',
          rounded: 'sm',
          mb: '8',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        })}
      />
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          borderTopWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={css({
              p: '6',
              borderBottomWidth: '1px',
              borderRightWidth: { base: '0', md: i < 2 ? '1px' : '0' },
              borderColor: 'ink.border',
              h: '36',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              bg: 'ink.50',
            })}
          />
        ))}
      </div>
    </section>
  );
}

interface RankedPost extends PostSummary {
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
      className={css({
        py: { base: '12', md: '20' },
        maxW: '1200px',
        mx: 'auto',
        px: '6',
        borderTopWidth: '1px',
        borderColor: 'ink.border',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '4',
          mb: '10',
        })}
      >
        <span
          className={css({
            fontSize: 'xs',
            fontWeight: 'bold',
            color: 'accent.600',
            letterSpacing: 'widest',
            textTransform: 'uppercase',
            flexShrink: 0,
          })}
        >
          01
        </span>
        <h2
          className={css({
            fontSize: { base: 'xl', md: '2xl' },
            fontWeight: 'bold',
            color: 'ink.950',
            letterSpacing: 'tight',
            flexShrink: 0,
          })}
        >
          인기 기록
        </h2>
        <div className={css({ flex: 1, h: '1px', bg: 'ink.border' })} />
      </div>
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          borderTopWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        {topPosts.map((post, index) => (
          <PostCard key={post.slug} post={post} rank={index + 1} index={index} />
        ))}
      </div>
    </section>
  );
}
