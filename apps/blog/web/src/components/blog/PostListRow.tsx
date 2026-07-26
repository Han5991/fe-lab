import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate } from '@/lib/format';
import { tagPillStyle } from './tagPillStyle';
import { HiddenPostBadge } from './HiddenPostBadge';

interface PostListRowProps {
  post: PostSummary;
  views?: number;
}

export const PostListRow = ({ post, views }: PostListRowProps) => {
  const readMin = post.readMin;
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'block',
        p: '[16px]',
        mx: { base: '0', md: '-4' },
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
        transition: '[background 0.15s]',
        _hover: {
          bg: 'paper.100',
          '& h3': { textDecorationLine: 'underline' },
        },
      })}
    >
      <h3
        className={css({
          fontSize: '[16px]',
          fontWeight: 'semibold',
          lineHeight: 'tight',
          color: 'accent.600',
          mb: '1',
        })}
      >
        {post.title}
        <HiddenPostBadge post={post} />
      </h3>

      {post.excerpt && (
        <p
          className={css({
            fontSize: 'sm',
            color: 'ink.600',
            lineHeight: 'snug',
            lineClamp: 1,
            mb: '2',
          })}
        >
          {post.excerpt}
        </p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div
          className={css({
            display: 'flex',
            gap: '2',
            flexWrap: 'wrap',
            mb: '2',
          })}
        >
          {post.tags.slice(0, 5).map(t => (
            <span key={t} className={css(tagPillStyle)}>
              #{t}
            </span>
          ))}
        </div>
      )}

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '3',
          fontFamily: 'mono',
          fontSize: '[12px]',
          color: 'ink.500',
          fontVariantNumeric: 'tabular-nums',
        })}
      >
        {post.date && <span>{fmtDate(post.date)}</span>}
        <span>{readMin}분</span>
        {views !== undefined && <span>{views.toLocaleString()} views</span>}
      </div>
    </Link>
  );
};
