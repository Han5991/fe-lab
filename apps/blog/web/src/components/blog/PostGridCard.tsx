import { OG_DEFAULT_IMAGE } from '@/content.values.mts';
import { css } from '@blog/styled-system/css';
import type { PostSummary } from '@blog/content/client';
import { postPath } from '@blog/content/client';
import { resolveThumbnailSrc } from '@blog/content/client';
import { fmtDate, fmtReadMin } from '@blog/content/client';
import { PostCardShared } from '@/src/components/shared/PostSharedElement';
import { TransitionLink } from '@/src/components/shared/TransitionLink';
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
  const thumb = resolveThumbnailSrc(post, OG_DEFAULT_IMAGE);
  const readMin = fmtReadMin(post.readMin);
  return (
    <TransitionLink
      href={postPath(post.slug)}
      // 이 카드의 커버·제목이 글 상세로 이어지는 이동이라는 표시(PostCardShared).
      opensPost
      className={css({
        display: 'flex',
        flexDir: 'column',
        bg: 'paper.100',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        rounded: 'container',
        overflow: 'hidden',
        transition: 'colors',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h3': { textDecoration: 'underline' },
        },
      })}
    >
      <PostCardShared part="cover" slug={post.slug}>
        <img
          src={thumb}
          // 장식 이미지다 — 같은 링크 안의 h3가 이미 제목을 말한다.
          alt=""
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={css({
            display: 'block',
            w: 'full',
            h: '[160px]',
            objectFit: 'cover',
            borderBottomWidth: 'hairline',
            borderColor: 'ink.border',
            // 화면에서는 링크의 라운드·overflow가 위 모서리를 자르지만, 공유 요소로 따로 찍힌
            // 스냅샷에는 조상의 자르기가 없다 — 이미지가 제 모서리를 들고 있어야 전환 첫
            // 프레임에 각지지 않는다.
            roundedTop: 'container',
          })}
        />
      </PostCardShared>
      <div
        className={css({
          p: '[16px]',
          display: 'flex',
          flexDir: 'column',
          gap: '2',
          flex: '1',
        })}
      >
        <PostCardShared part="title" slug={post.slug}>
          <h3
            className={css({
              fontFamily: 'sans',
              fontSize: 'md',
              fontWeight: 'semibold',
              lineHeight: 'header',
              color: 'accent.solid',
              lineClamp: 2,
            })}
          >
            {post.title}
          </h3>
        </PostCardShared>
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
            {post.date ? `${fmtDate(post.date)} · ${readMin}` : readMin}
          </Label>
          {post.tags && post.tags.length > 0 && (
            <span className={css(tagPillStyle, { fontFamily: 'sans' })}>
              #{post.tags[0]}
            </span>
          )}
        </div>
      </div>
    </TransitionLink>
  );
};
