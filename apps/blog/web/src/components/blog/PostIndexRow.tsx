import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate } from '@/lib/format';
import { Label } from './Label';
import { tagPillStyle } from './tagPillStyle';

interface PostIndexRowProps {
  post: PostSummary;
}

export const PostIndexRow = ({ post }: PostIndexRowProps) => {
  const readMin = post.readMin;
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '[110px 1fr 80px]' },
        alignItems: 'baseline',
        gap: { base: '1', md: '4' },
        py: '[16px]',
        px: { base: '0', md: '[16px]' },
        mx: { base: '0', md: '[-16px]' },
        borderTopWidth: '[1px]',
        borderColor: 'ink.border',
        transition: '[background 0.15s]',
        _hover: {
          bg: 'paper.100',
          '& h3': { textDecorationLine: 'underline' },
        },
      })}
    >
      {post.date && (
        <Label
          tone="meta"
          className={css({
            color: 'ink.500',
            fontSize: '[12px]',
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {fmtDate(post.date)}
        </Label>
      )}
      <div className={css({ flex: '1', minW: '0' })}>
        <h3
          className={css({
            fontSize: '[16px]',
            fontWeight: 'semibold',
            lineHeight: 'header',
            color: 'accent.600',
            mb: '[8px]',
          })}
        >
          {post.title}
        </h3>
        {post.tags && post.tags.length > 0 && (
          <span
            className={css({
              display: 'flex',
              flexWrap: 'wrap',
              gap: '[6px]',
            })}
          >
            {post.tags.slice(0, 4).map(t => (
              <span
                key={t}
                className={css(tagPillStyle, { _hover: { bg: 'paper.300' } })}
              >
                #{t}
              </span>
            ))}
          </span>
        )}
      </div>
      <span
        className={css({
          fontFamily: 'mono',
          fontSize: '[12px]',
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
