import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtDate } from '@/lib/format';
import { Label } from './Label';

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
        py: '4',
        borderTopWidth: withDivider ? '[1px]' : '0',
        borderColor: 'ink.border',
        transition: '[background 0.15s]',
        _hover: {
          '& h4': { color: 'accent.600' },
        },
      })}
    >
      <h4
        className={css({
          fontFamily: 'serif',
          fontSize: 'md',
          fontWeight: 'medium',
          lineHeight: 'headerSm',
          color: 'ink.950',
          mb: '2',
          transition: '[color 0.15s]',
        })}
      >
        {post.title}
      </h4>
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '2',
          flexWrap: 'wrap',
        })}
      >
        {post.date && <Label tone="meta">{fmtDate(post.date)}</Label>}
        {post.tags && post.tags.length > 0 && (
          <Label tone="meta" className={css({ letterSpacing: 'mono' })}>
            {post.tags
              .slice(0, 2)
              .map(t => `#${t}`)
              .join(' · ')}
          </Label>
        )}
      </div>
    </Link>
  );
};
