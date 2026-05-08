import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { fmtDate, estimateReadMin } from '@/lib/format';
import { Label } from './Label';

interface PostGridCardProps {
  post: PostSummary;
}

export const PostGridCard = ({ post }: PostGridCardProps) => {
  const thumb = post.thumbnail ? resolveThumbnailUrl(post) : null;
  const readMin = estimateReadMin(post.excerpt ?? post.title);
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'flex',
        flexDir: 'column',
        bg: 'paper.50',
        borderWidth: '1px',
        borderColor: 'ink.border',
        transition: 'border-color 0.15s',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h3': { color: 'accent.600' },
        },
      })}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={post.title}
          className={css({
            display: 'block',
            w: 'full',
            h: '160px',
            objectFit: 'cover',
            borderBottomWidth: '1px',
            borderColor: 'ink.border',
          })}
        />
      ) : (
        <div
          className={css({
            w: 'full',
            h: '160px',
            bg: 'paper.100',
            borderBottomWidth: '1px',
            borderColor: 'ink.border',
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.025) 8px 9px)',
          })}
        />
      )}
      <div
        className={css({
          p: '5',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
          flex: 1,
        })}
      >
        <h3
          className={css({
            fontFamily: 'serif',
            fontSize: 'lg',
            fontWeight: '600',
            lineHeight: '1.3',
            color: 'ink.950',
            transition: 'color 0.15s',
            lineClamp: 2,
          })}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p
            className={css({
              fontFamily: 'sans',
              fontSize: 'sm',
              color: 'ink.700',
              lineHeight: '1.5',
              lineClamp: 2,
            })}
          >
            {post.excerpt}
          </p>
        )}
        <div className={css({ flex: 1 })} />
        <div
          className={css({
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '2',
            pt: '2',
          })}
        >
          <Label tone="meta">
            {post.date ? `${fmtDate(post.date)} · ${readMin}분` : `${readMin}분`}
          </Label>
          {post.tags && post.tags.length > 0 && (
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: '2xs',
                color: 'ink.500',
                letterSpacing: '0.04em',
              })}
            >
              #{post.tags[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
