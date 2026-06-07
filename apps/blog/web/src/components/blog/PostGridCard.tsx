import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { fmtDate } from '@/lib/format';
import { Label } from './Label';

interface PostGridCardProps {
  post: PostSummary;
}

export const PostGridCard = ({ post }: PostGridCardProps) => {
  // resolveThumbnailUrl은 thumbnail이 없으면 OG_DEFAULT_IMAGE를 반환합니다.
  // 항상 호출해 디폴트 이미지로 fallback되게 합니다.
  const thumb = resolveThumbnailUrl(post);
  const readMin = post.readMin;
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'flex',
        flexDir: 'column',
        bg: 'paper.50',
        borderWidth: '[1px]',
        borderColor: 'ink.border',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h3': { color: 'accent.600' },
        },
      })}
    >
      <img
        src={thumb}
        alt={post.title}
        // 실제 썸네일이 있는 글만 hero 모핑 대상으로 지정한다.
        // (기본 og 이미지 fallback에는 키를 붙이지 않아 상세와 짝이 안 맞는 모핑을 막는다.)
        // 목록 쪽은 exit-key. v6 hero는 exit↔enter 키를 양방향으로 매칭하므로
        // 목록→상세(커짐)·상세→목록(작아짐) 모두 모핑된다.
        data-hero-exit-key={post.thumbnail ? `post-${post.slug}` : undefined}
        className={css({
          display: 'block',
          w: 'full',
          h: '[160px]',
          objectFit: 'cover',
          borderBottomWidth: '[1px]',
          borderColor: 'ink.border',
        })}
      />
      <div
        className={css({
          p: '5',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
          flex: '1',
        })}
      >
        <h3
          className={css({
            fontFamily: 'serif',
            fontSize: 'lg',
            fontWeight: 'semibold',
            lineHeight: 'header',
            color: 'ink.950',
            transition: '[color 0.15s]',
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
              lineHeight: 'snug',
              lineClamp: 2,
            })}
          >
            {post.excerpt}
          </p>
        )}
        <div className={css({ flex: '1' })} />
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
            {post.date
              ? `${fmtDate(post.date)} · ${readMin}분`
              : `${readMin}분`}
          </Label>
          {post.tags && post.tags.length > 0 && (
            <span
              className={css({
                fontFamily: 'mono',
                fontSize: '2xs',
                color: 'ink.500',
                letterSpacing: 'mono',
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
