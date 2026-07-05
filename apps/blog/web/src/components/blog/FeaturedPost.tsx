import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { tagPillStyle } from './tagPillStyle';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { fmtDate } from '@/lib/format';

interface FeaturedPostProps {
  post: PostSummary;
}

export const FeaturedPost = ({ post }: FeaturedPostProps) => {
  const href = `/posts/${encodePostSlug(post.slug)}/`;
  // thumbnail 없으면 빌드 시 생성된 글별 OG 카드로 fallback (resolveThumbnailUrl).
  const thumb = resolveThumbnailUrl(post);
  const readMin = post.readMin;

  return (
    <Link
      href={href}
      className={css({
        display: 'block',
        position: 'relative',
        bg: 'paper.100',
        borderWidth: '[1px]',
        borderStyle: 'solid',
        borderColor: 'ink.border',
        rounded: '[12px]',
        overflow: 'hidden',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h2': { color: 'accent.600', textDecoration: 'underline' },
        },
      })}
    >
      <img
        src={thumb}
        alt={post.title}
        className={css({
          display: 'block',
          w: 'full',
          h: '[320px]',
          objectFit: 'cover',
          borderBottomWidth: '[1px]',
          borderBottomStyle: 'solid',
          borderColor: 'ink.border',
        })}
      />

      <div className={css({ p: '[16px]' })}>
        <div
          className={css({
            mb: '[12px]',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '[8px]',
          })}
        >
          <span
            className={css(tagPillStyle, {
              bg: 'moss.100',
              color: 'moss.600',
              fontWeight: 'semibold',
            })}
          >
            LATEST
          </span>
          {post.series && (
            <span
              className={css({
                fontSize: '[12px]',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              {post.series}
            </span>
          )}
          {post.date && (
            <span
              className={css({
                fontSize: '[12px]',
                color: 'ink.500',
              })}
            >
              · {fmtDate(post.date)}
            </span>
          )}
        </div>

        <h2
          className={css({
            mb: '[8px]',
            fontSize: { base: '2xl', md: '3xl' },
            fontWeight: 'bold',
            lineHeight: 'tight',
            color: 'ink.950',
            transition: '[color 0.15s]',
          })}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p
            className={css({
              fontSize: 'md',
              color: 'ink.700',
              lineHeight: 'relaxed',
              mb: '[16px]',
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
            gap: '[8px]',
            flexWrap: 'wrap',
          })}
        >
          <span
            className={css({
              fontSize: '[12px]',
              color: 'ink.500',
            })}
          >
            {readMin}분 읽기
          </span>
          {post.tags?.slice(0, 3).map(t => (
            <span
              key={t}
              className={css(tagPillStyle, {
                _hover: { bg: 'paper.300' },
              })}
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};
