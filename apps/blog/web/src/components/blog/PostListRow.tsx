import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate, estimateReadMin } from '@/lib/format';
import { Label } from './Label';

interface PostListRowProps {
  post: PostSummary;
  views?: number;
}

export const PostListRow = ({ post, views }: PostListRowProps) => {
  const readMin = estimateReadMin(post.excerpt ?? post.title);
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '[110px 1fr 80px]' },
        alignItems: 'baseline',
        gap: { base: '1', md: '5' },
        py: '6',
        px: { base: '0', md: '4' },
        mx: { base: '0', md: '-4' },
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
        transition: '[background 0.15s]',
        _hover: {
          bg: 'paper.100',
          '& h3': { color: 'ink.950', textDecorationLine: 'underline' },
        },
      })}
    >
      <div
        className={css({
          display: 'flex',
          flexDir: 'column',
          gap: '0.5',
        })}
      >
        {post.date && (
          <Label
            tone="meta"
            className={css({
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 'mono',
            })}
          >
            {fmtDate(post.date)}
          </Label>
        )}
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: '2xs',
            color: 'ink.500',
            letterSpacing: 'mono',
          })}
        >
          {readMin}분
        </span>
      </div>

      <div className={css({ flex: '1', minW: '0' })}>
        <h3
          className={css({
            fontFamily: 'serif',
            fontSize: { base: 'lg', md: 'xl' },
            fontWeight: 'medium',
            lineHeight: 'tight',
            color: 'ink.950',
            mb: '2',
            transition: '[color 0.15s]',
          })}
        >
          {post.title}
        </h3>
        {post.tags && post.tags.length > 0 && (
          <div
            className={css({
              display: 'flex',
              gap: '2',
              flexWrap: 'wrap',
              mb: '1.5',
            })}
          >
            {post.tags.slice(0, 5).map(t => (
              <span
                key={t}
                className={css({
                  fontFamily: 'mono',
                  fontSize: '2xs',
                  color: 'ink.600',
                  letterSpacing: 'mono',
                })}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
        {post.excerpt && (
          <p
            className={css({
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: 'sm',
              color: 'ink.700',
              lineHeight: 'snug',
              lineClamp: 1,
            })}
          >
            {post.excerpt}
          </p>
        )}
      </div>

      <div
        className={css({
          textAlign: { base: 'left', md: 'right' },
          fontFamily: 'mono',
          fontSize: '2xs',
          color: 'ink.500',
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        {views !== undefined ? `${views.toLocaleString()} views` : ''}
      </div>
    </Link>
  );
};
