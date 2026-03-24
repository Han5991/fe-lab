import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';

interface PostCardProps {
  post: PostSummary;
  rank?: number;
  index?: number;
}

export function PostCard({ post, rank, index }: PostCardProps) {
  const isEven = (index ?? 0) % 2 === 1;

  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'block',
        p: '6',
        borderBottomWidth: '1px',
        borderRightWidth: { base: '0', md: isEven ? '0' : '1px' },
        borderColor: 'ink.border',
        transition: 'background 0.15s',
        _hover: { bg: 'ink.50' },
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '3',
          mb: '3',
        })}
      >
        {rank && (
          <span
            className={css({
              fontSize: 'xs',
              fontWeight: 'bold',
              color: 'accent.600',
              minW: '5',
              fontVariantNumeric: 'tabular-nums',
            })}
          >
            {String(rank).padStart(2, '0')}
          </span>
        )}
        {post.date && (
          <time
            className={css({
              fontSize: 'xs',
              color: 'ink.500',
              letterSpacing: 'wide',
            })}
          >
            {new Date(post.date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              timeZone: 'Asia/Seoul',
            })}
          </time>
        )}
        {post.tags?.[0] && (
          <span
            className={css({
              fontSize: 'xs',
              color: 'accent.600',
              bg: 'accent.50',
              px: '2',
              py: '0.5',
              rounded: 'sm',
              fontWeight: 'medium',
            })}
          >
            {post.tags[0]}
          </span>
        )}
      </div>
      <h3
        className={css({
          fontSize: { base: 'base', md: 'lg' },
          fontWeight: 'bold',
          color: 'ink.950',
          mb: '2',
          lineHeight: '1.4',
          lineClamp: 2,
        })}
      >
        {post.title}
      </h3>
      {post.excerpt && (
        <p
          className={css({
            color: 'ink.700',
            fontSize: 'sm',
            lineHeight: '1.6',
            lineClamp: 2,
          })}
        >
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}
