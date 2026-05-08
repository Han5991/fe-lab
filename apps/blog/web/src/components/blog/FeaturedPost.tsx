import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/lib/posts';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { estimateReadMin, fmtDate } from '@/lib/format';
import { Label } from './Label';

interface FeaturedPostProps {
  post: PostSummary;
}

export const FeaturedPost = ({ post }: FeaturedPostProps) => {
  const href = `/posts/${encodePostSlug(post.slug)}/`;
  const thumb = post.thumbnail ? resolveThumbnailUrl(post) : null;
  const readMin = estimateReadMin(post.excerpt ?? '');

  return (
    <Link
      href={href}
      className={css({
        display: 'block',
        position: 'relative',
        '& h2': { transition: '[color 0.15s]' },
        _hover: { '& h2': { color: 'ink.700' } },
      })}
    >
      <div
        className={css({
          mb: '5',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '2',
        })}
      >
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: '2xs',
            px: '2',
            py: '0.5',
            bg: 'marker.300',
            color: 'ink.950',
            letterSpacing: 'monoXl',
            textTransform: 'uppercase',
          })}
        >
          LATEST
        </span>
        {post.series && <Label tone="marker">{post.series}</Label>}
        {post.date && <Label tone="meta">· {fmtDate(post.date)}</Label>}
      </div>

      {thumb ? (
        <img
          src={thumb}
          alt={post.title}
          className={css({
            display: 'block',
            w: 'full',
            h: '[320px]',
            objectFit: 'cover',
            borderWidth: '[1px]',
            borderColor: 'ink.border',
          })}
        />
      ) : (
        <div
          className={css({
            w: 'full',
            h: '[320px]',
            bg: 'paper.100',
            borderWidth: '[1px]',
            borderColor: 'ink.border',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage:
              '[repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.025) 8px 9px)]',
          })}
        >
          <span
            className={css({
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.500',
              letterSpacing: 'monoXl',
            })}
          >
            FEATURE · {post.series ?? 'NOTE'}
          </span>
        </div>
      )}

      <h2
        className={css({
          mt: '6',
          mb: '3',
          fontFamily: 'serif',
          fontSize: { base: '3xl', md: '4xl' },
          fontWeight: 'medium',
          lineHeight: 'tighter',
          letterSpacing: 'tightX',
          color: 'ink.950',
        })}
      >
        {post.title}
      </h2>
      {post.excerpt && (
        <p
          className={css({
            fontFamily: 'serif',
            fontSize: 'md',
            fontStyle: 'italic',
            color: 'ink.700',
            lineHeight: 'relaxed',
            mb: '4',
            lineClamp: 2,
          })}
        >
          {post.excerpt}
        </p>
      )}

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '3',
          flexWrap: 'wrap',
        })}
      >
        <Label tone="meta">
          {readMin}분 읽기
          {post.tags && post.tags.length > 0 ? ' · ' : ''}
          {post.tags?.slice(0, 3).map(t => `#${t}`).join(' ')}
        </Label>
      </div>
    </Link>
  );
};
