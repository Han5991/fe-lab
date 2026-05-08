import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate, estimateReadMin } from '@/lib/format';
import { Label } from './Label';

interface PostIndexRowProps {
  post: PostSummary;
}

export const PostIndexRow = ({ post }: PostIndexRowProps) => {
  const readMin = estimateReadMin(post.excerpt ?? post.title);
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '110px 1fr 80px' },
        alignItems: 'baseline',
        gap: { base: '1', md: '5' },
        py: '5',
        px: { base: '0', md: '4' },
        mx: { base: '0', md: '-4' },
        borderTopWidth: '1px',
        borderColor: 'ink.border',
        transition: 'background 0.15s',
        _hover: {
          bg: 'paper.100',
          '& h3': { color: 'ink.950', textDecorationLine: 'underline' },
        },
      })}
    >
      {post.date && (
        <Label
          tone="meta"
          className={css({
            color: 'ink.500',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
          })}
        >
          {fmtDate(post.date)}
        </Label>
      )}
      <div className={css({ flex: 1, minW: 0 })}>
        <h3
          className={css({
            fontFamily: 'serif',
            fontSize: { base: 'lg', md: 'xl' },
            fontWeight: '500',
            lineHeight: '1.3',
            color: 'ink.950',
            mb: '1',
            transition: 'color 0.15s',
          })}
        >
          {post.title}
        </h3>
        {post.tags && post.tags.length > 0 && (
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: '2xs',
              color: 'ink.500',
              letterSpacing: '0.04em',
            })}
          >
            {post.tags.slice(0, 4).map(t => `#${t}`).join(' · ')}
          </span>
        )}
      </div>
      <span
        className={css({
          fontFamily: 'mono',
          fontSize: 'xs',
          color: 'ink.500',
          textAlign: { base: 'left', md: 'right' },
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        {readMin}분
      </span>
    </Link>
  );
};
