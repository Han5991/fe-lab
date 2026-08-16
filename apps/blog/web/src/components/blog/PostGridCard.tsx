import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@blog/content';
import { postPath } from '@blog/content';
import { resolveThumbnailSrc } from '@blog/content';
import { fmtDate } from '@blog/content';
import { Label } from './Label';
import { tagPillStyle } from './tagPillStyle';

/** CSS가 실제 크기를 정하므로 이 값들은 종횡비 힌트로만 쓰입니다(표시 346×160). */
const THUMB_WIDTH = 692;
const THUMB_HEIGHT = 320;

interface PostGridCardProps {
  post: PostSummary;
  /**
   * 첫 화면에 들어오는 카드. LCP 후보이므로 lazy 대신 우선 로드합니다.
   * 목록 전체에 걸면 화면 밖 이미지까지 한꺼번에 받아 오히려 LCP가 밀립니다.
   */
  priority?: boolean;
}

export const PostGridCard = ({ post, priority = false }: PostGridCardProps) => {
  // resolveThumbnailSrc는 posts/ 안의 png/jpg면 빌드 시 만든 WebP 최적화본을,
  // 아니면 원본(생성 OG 카드 /og/{slug}.png 포함)을 돌려줍니다.
  const thumb = resolveThumbnailSrc(post);
  const readMin = post.readMin;
  return (
    <Link
      href={postPath(post.slug)}
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
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
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
