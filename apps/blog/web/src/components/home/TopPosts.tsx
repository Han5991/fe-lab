'use client';

import { css } from '@design-system/ui-lib/css';
import { getTopPosts } from '@/domain/analytics';
import type { PostSummary } from '@/domain/post/types';
import { PostCard } from './PostCard';
import { useSuspenseQuery } from '@tanstack/react-query';

interface TopPostsProps {
  posts: PostSummary[];
}

export function TopPostsLoading() {
  return (
    <section
      className={css({
        py: '10',
        maxW: 'containerW',
        mx: 'auto',
        px: '6',
        borderTopWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
      })}
    >
      <div
        className={css({
          h: '4',
          w: '28',
          bg: 'paper.200',
          rounded: '[6px]',
          mb: '6',
          animation: '[pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite]',
        })}
      />
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          borderTopWidth: '[1px]',
          borderStyle: 'solid',
          borderColor: 'ink.border',
        })}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={css({
              p: '[16px]',
              borderBottomWidth: '[1px]',
              borderRightWidth: { base: '0', md: i < 2 ? '[1px]' : '0' },
              borderStyle: 'solid',
              borderColor: 'ink.border',
              h: '32',
              animation: '[pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite]',
              bg: 'paper.100',
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
    queryFn: () => getTopPosts(3),
    select: data => {
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
        py: '10',
        maxW: 'containerW',
        mx: 'auto',
        px: '6',
        borderTopWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '[8px]',
          mb: '5',
        })}
      >
        <h2
          className={css({
            fontSize: '[16px]',
            fontWeight: 'semibold',
            color: 'ink.950',
          })}
        >
          인기 기록
        </h2>
        <span
          className={css({
            fontSize: '[12px]',
            color: 'ink.500',
          })}
        >
          가장 많이 읽힌 글
        </span>
      </div>
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          borderTopWidth: '[1px]',
          borderStyle: 'solid',
          borderColor: 'ink.border',
        })}
      >
        {topPosts.map((post, index) => (
          <PostCard
            key={post.slug}
            post={post}
            rank={index + 1}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
