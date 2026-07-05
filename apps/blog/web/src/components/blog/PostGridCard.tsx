import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailUrl } from '@/domain/post/thumbnail';
import { fmtDate } from '@/lib/format';
import { Label } from './Label';
import { tagPillStyle } from './tagPillStyle';

interface PostGridCardProps {
  post: PostSummary;
}

export const PostGridCard = ({ post }: PostGridCardProps) => {
  // resolveThumbnailUrl은 thumbnail이 없으면 빌드 시 생성된 글별 OG 카드
  // (/og/{slug}.png)로 fallback합니다.
  const thumb = resolveThumbnailUrl(post);
  const readMin = post.readMin;
  return (
    <Link
      href={`/posts/${encodePostSlug(post.slug)}/`}
      className={css({
        display: 'flex',
        flexDir: 'column',
        bg: 'paper.100',
        borderWidth: '[1px]',
        borderColor: 'ink.border',
        rounded: '[12px]',
        overflow: 'hidden',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h3': { textDecoration: 'underline' },
        },
      })}
    >
      <img
        src={thumb}
        alt={post.title}
        // 실제 썸네일이 있는 글만 hero 모핑 대상(목록=exit-key). 상세 헤더 이미지의
        // data-hero-enter-key와 같은 키로 매칭돼 카드↔헤더 이미지가 모핑한다.
        // 썸네일 없는 글은 키를 안 붙이고 상세 id도 /posts-plain/*이라 fade로 폴백.
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
          p: '[16px]',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
          flex: '1',
        })}
      >
        <h3
          className={css({
            fontFamily: 'sans',
            fontSize: 'md',
            fontWeight: 'semibold',
            lineHeight: 'header',
            color: 'accent.600',
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
              color: 'ink.600',
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
            <span className={css(tagPillStyle, { fontFamily: 'sans' })}>
              #{post.tags[0]}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
