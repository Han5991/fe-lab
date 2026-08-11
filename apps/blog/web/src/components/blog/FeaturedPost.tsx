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
        // 카드가 아니다. 홈은 발견 면 네 개를 밴드 머리 줄로 나누므로, 대표 글도
        // 그 면 안의 내용일 뿐이다. 상자를 다시 세우면 밴드 경계와 카드 경계가
        // 겹쳐 "이 글이 왜 특별한가"가 아니라 "여기 상자가 있다"만 읽힌다.
        // 대표 글이라는 신호는 액센트 제목과 썸네일이 이미 대고 있다.
        px: '[2px]',
        py: '[18px]',
        _hover: {
          // 제목이 기본부터 accent.900이라, hover는 링크 톤인 600으로 간다.
          '& [data-featured-title]': { color: 'accent.600' },
        },
      })}
    >
      <div className={css({ minW: '0' })}>
        {seriesLabel && (
          <span
            className={css({
              display: 'inline-block',
              // 안에 `2/5` 같은 숫자가 있어도 sans다. 레퍼런스 `.badge`가
              // font-family를 지정하지 않아 sans로 렌더되고, 글 상세·/series의
              // 같은 배지도 sans다. 숫자가 있다고 mono로 바꾸지 말 것.
              fontFamily: 'sans',
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
        {/* h3다. 홈의 헤딩은 h1(이름) → h2(발견 면 라벨) → h3(면 안의 글 제목)
            순서고, 이 글은 `대표 글` 면 안의 항목이다. 아래 최근 글 목록의
            PostIndexRow도 같은 h3라 헤딩 탐색에서 두 면이 같은 깊이로 읽힌다. */}
        <h3
          data-featured-title
          className={css({
            fontSize: '[16px]',
            fontWeight: 'semibold',
            // 대표글 제목은 액센트. 아래 `최근 글` 목록의 제목은 무채색으로
            // 남겨서, 색이 곧 "이게 대표글"이라는 위계 신호가 되게 한다.
            color: 'accent.900',
            mt: '[10px]',
            mb: '[5px]',
            transition: '[color 0.15s]',
          })}
        >
          {post.title}
        </h3>
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
