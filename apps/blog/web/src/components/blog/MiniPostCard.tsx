import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate } from '@/lib/format';
import { tagPillStyle } from './tagPillStyle';

interface MiniPostCardProps {
  post: PostSummary;
  withDivider?: boolean;
}

export const MiniPostCard = ({
  post,
  withDivider = true,
}: MiniPostCardProps) => {
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'block',
        py: '[16px]',
        borderTopWidth: withDivider ? '[1px]' : '0',
        borderTopStyle: 'solid',
        borderColor: 'ink.border',
        transition: '[color 0.15s]',
        _hover: {
          '& h4': { textDecoration: 'underline' },
        },
      })}
    >
      <h4
        className={css({
          fontSize: '[16px]',
          fontWeight: 'semibold',
          lineHeight: 'headerSm',
          color: 'accent.600',
          mb: '[8px]',
        })}
      >
        {post.title}
      </h4>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '[8px]',
          flexWrap: 'wrap',
        })}
      >
        {post.date && (
          <span
            className={css({
              fontSize: '[12px]',
              color: 'ink.500',
              lineHeight: 'flat',
            })}
          >
            {fmtDate(post.date)}
          </span>
        )}
        {post.tags && post.tags.length > 0 && (
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '[6px]',
              flexWrap: 'wrap',
            })}
          >
            {post.tags.slice(0, 2).map(t => (
              <span key={t} className={css(tagPillStyle)}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
