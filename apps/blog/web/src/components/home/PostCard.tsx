import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
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
        p: '[16px]',
        borderBottomWidth: '[1px]',
        borderRightWidth: { base: '0', md: isEven ? '0' : '[1px]' },
        borderColor: 'ink.border',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& [data-post-title]': { textDecoration: 'underline' },
        },
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '[8px]',
          mb: '[8px]',
        })}
      >
        {rank && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: '[12px]',
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
              fontSize: '[12px]',
              color: 'ink.500',
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
              display: 'inline-flex',
              alignItems: 'center',
              px: '[10px]',
              py: '[2px]',
              rounded: '[2rem]',
              bg: 'paper.200',
              color: 'ink.700',
              fontSize: 'xs',
              fontWeight: 'medium',
              lineHeight: 'flat',
            })}
          >
            {post.tags[0]}
          </span>
        )}
      </div>
      <h3
        data-post-title
        className={css({
          fontSize: '[16px]',
          fontWeight: 'semibold',
          color: 'accent.600',
          mb: '[4px]',
          lineHeight: 'headerSm',
          lineClamp: 2,
        })}
      >
        {post.title}
      </h3>
      {post.excerpt && (
        <p
          className={css({
            color: 'ink.600',
            fontSize: 'sm',
            lineHeight: 'relaxed',
            lineClamp: 2,
          })}
        >
          {post.excerpt}
        </p>
      )}
    </Link>
  );
}
