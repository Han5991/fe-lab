import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { resolveThumbnailSrc } from '@/domain/post/thumbnail';
import { fmtDate } from '@/lib/format';
import { ParallelThumb } from '@/src/components/diagram';

/** 레퍼런스 미니 썸네일 칸(150×92)과 같은 비율로 고정합니다. */
const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 92;

interface FeaturedPostProps {
  post: PostSummary;
  /** `시리즈 · 번들러 만들기 2/5` 형태. 시리즈에 속하지 않으면 생략. */
  seriesLabel?: string;
}

export const FeaturedPost = ({ post, seriesLabel }: FeaturedPostProps) => {
  const href = `/posts/${encodePostSlug(post.slug)}/`;
  // 자동 생성 OG 카드는 1200×630 소셜 카드라 150px 칸에서 글자가 뭉갠다.
  // thumbnail이 비었거나 `/og/*`를 가리키면(= 빌드가 OG 카드를 만들어 주는
  // 경우) 이미지 대신 다이어그램 썸네일을 세운다 — 리뉴얼의 시각 아이덴티티다.
  const hasOwnThumbnail =
    Boolean(post.thumbnail) && !post.thumbnail?.startsWith('/og/');

  return (
    <Link
      href={href}
      className={css({
        display: 'grid',
        gridTemplateColumns: { base: '1fr', md: '[minmax(0,1fr) 150px]' },
        gap: '[18px]',
        alignItems: 'center',
        borderWidth: 'hairline',
        borderStyle: 'solid',
        borderColor: 'ink.border',
        rounded: 'card',
        px: '[20px]',
        py: '[18px]',
        mb: '[26px]',
        transition: '[border-color 0.15s]',
        _hover: {
          borderColor: 'ink.borderStrong',
          '& h2': { color: 'accent.600' },
        },
      })}
    >
      <div className={css({ minW: '0' })}>
        {seriesLabel && (
          <span
            className={css({
              display: 'inline-block',
              fontSize: '[12px]',
              color: 'accent.600',
              bg: 'accent.50',
              rounded: '[6px]',
              px: '[9px]',
              py: '[2px]',
            })}
          >
            {seriesLabel}
          </span>
        )}
        <h2
          className={css({
            fontSize: '[16px]',
            fontWeight: 'semibold',
            color: 'ink.950',
            mt: '[10px]',
            mb: '[5px]',
            transition: '[color 0.15s]',
          })}
        >
          {post.title}
        </h2>
        {post.excerpt && (
          <p
            className={css({
              fontSize: '[13px]',
              color: 'ink.600',
              lineClamp: 2,
            })}
          >
            {post.excerpt}
          </p>
        )}
        <p
          className={css({
            fontFamily: 'mono',
            fontWeight: 'normal',
            fontSize: '[12px]',
            color: 'ink.500',
            mt: '[10px]',
          })}
        >
          {post.date ? `${fmtDate(post.date)} · ` : ''}
          {post.readMin} min
        </p>
      </div>

      <div className={css({ w: '[150px]', maxW: 'full' })}>
        {hasOwnThumbnail ? (
          <img
            src={resolveThumbnailSrc(post)}
            alt=""
            width={THUMB_WIDTH}
            height={THUMB_HEIGHT}
            // 예전 홈에서는 이 이미지가 320px 히어로라 LCP 후보였지만, 지금은
            // 150px 미니 썸네일이라 우선순위를 올리지 않는다(LCP는 히어로 텍스트).
            loading="lazy"
            decoding="async"
            className={css({
              display: 'block',
              w: 'full',
              h: '[92px]',
              objectFit: 'cover',
              rounded: 'control',
              borderWidth: 'hairline',
              borderStyle: 'solid',
              borderColor: 'ink.border',
            })}
          />
        ) : (
          <ParallelThumb />
        )}
      </div>
    </Link>
  );
};
