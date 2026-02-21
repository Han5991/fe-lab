import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostData } from '@/lib/posts';

interface PostCardProps {
  post: PostData;
  rank?: number;
}

export function PostCard({ post, rank }: PostCardProps) {
  const rankStyleProps =
    rank === 1
      ? { bg: 'yellow.100', color: 'yellow.700' }
      : rank === 2
        ? { bg: 'gray.100', color: 'gray.700' }
        : { bg: 'orange.100', color: 'orange.700' };

  return (
    <Link
      href={`/posts/${post.slug}`}
      className={css({
        display: 'flex',
        flexDir: 'column',
        p: '6',
        bg: 'white',
        rounded: '2xl',
        borderWidth: '1px',
        borderColor: 'gray.100',
        transition: 'all 0.2s',
        _hover: {
          borderColor: 'blue.200',
          transform: 'translateY(-4px)',
          shadow: 'lg',
        },
      })}
    >
      <div
        className={css({
          mb: '4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        {rank && (
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              w: '8',
              h: '8',
              rounded: 'full',
              fontWeight: 'bold',
              fontSize: 'sm',
              ...rankStyleProps,
            })}
          >
            {rank}
          </span>
        )}
        {post.date && (
          <time className={css({ fontSize: 'sm', color: 'gray.400' })}>
            {new Date(post.date).toLocaleDateString('ko-KR')}
          </time>
        )}
      </div>
      <h3
        className={css({
          fontSize: 'xl',
          fontWeight: 'bold',
          color: 'gray.900',
          mb: '2',
          lineClamp: 2,
        })}
      >
        {post.title}
      </h3>
      <p
        className={css({
          color: 'gray.600',
          fontSize: 'sm',
          lineHeight: 'relaxed',
          lineClamp: 3,
          mb: '4',
          flex: 1,
        })}
      >
        {post.excerpt}
      </p>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          color: 'blue.600',
          fontSize: 'sm',
          fontWeight: 'semibold',
        })}
      >
        Read more <span className={css({ ml: '1' })}>→</span>
      </div>
    </Link>
  );
}
