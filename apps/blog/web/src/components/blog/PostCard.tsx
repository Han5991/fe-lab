import { OG_DEFAULT_IMAGE } from '@/content.values.mts';
import Link from 'next/link';
import { css, cx, sva } from '@blog/styled-system/css';
import type { RecipeVariant } from '@blog/styled-system/css';
import type { PostSummary } from '@blog/content/client';
import { postPath, resolveThumbnailSrc } from '@blog/content/client';

import { cardLinkRaw, cardRoot, coverFrameRaw, coverImage } from './cardParts';
import { HiddenPostBadge } from './HiddenPostBadge';
import { PostMeta } from './PostMeta';

/** 커버 `<img>`의 width·height — 크기는 CSS(16:9 틀)가 정하고, 이 둘은 비율 힌트다. */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 675;

/** 쇼케이스 메타 줄에 이어 붙이는 태그 수(승인 목업 `vitest · testing · ci`). */
const SHOWCASE_TAG_COUNT = 3;

/**
 * 글 카드 — Astryx BlogCard·BlogFeatureCard의 블로그 판. 커버(16:9) → 제목·발췌 → 메타 순서다.
 *
 * - `showcase` — 홈 "최근 글"의 큰 카드. 제목 24/32(md 이상), 발췌 17/24, 메타 끝에 태그 셋.
 * - `default` — 작은 카드. 제목 17/24와 발췌 14/20을 각각 두 줄에서 자른다.
 */
const postCard = sva({
  slots: ['root', 'cover', 'body', 'link', 'excerpt'],
  base: {
    root: { display: 'flex', flexDir: 'column', minW: '0' },
    cover: css.raw(coverFrameRaw, { rounded: 'container' }),
    body: { display: 'flex', flexDir: 'column', gap: '1' },
    link: cardLinkRaw,
    excerpt: { color: 'ink.700', lineClamp: 2 },
  },
  variants: {
    variant: {
      showcase: {
        root: { gap: '4' },
        // 1024px 아래에서 한 열로 쌓이면 커버가 화면 폭이 된다 — 제목도 md부터 큰 단계로 간다.
        link: { display: 'block', textStyle: { base: 'h3', md: 'h1' } },
        excerpt: { textStyle: { base: 'body', md: 'bodyLarge' } },
      },
      default: {
        root: { gap: '3' },
        link: { textStyle: 'h3', lineClamp: 2 },
        excerpt: { textStyle: 'body' },
      },
    },
  },
});

type PostCardVariant = NonNullable<RecipeVariant<typeof postCard>['variant']>;

interface PostCardProps {
  post: PostSummary;
  variant: PostCardVariant;
  /**
   * 첫 화면의 가장 큰 이미지(LCP 후보)만 켠다 — lazy 대신 바로, 높은 우선순위로 받는다. 여러 장에
   * 걸면 화면 밖 이미지까지 한꺼번에 받아 오히려 LCP가 밀린다.
   */
  priority?: boolean;
}

/**
 * 카드 전체가 제목 링크 하나다(`cardParts.ts`). 제목은 h3 — 홈은 h1(이름) → h2(섹션) → h3(카드)라
 * 헤딩 단계를 건너뛰지 않는다.
 */
export const PostCard = ({
  post,
  variant,
  priority = false,
}: PostCardProps) => {
  const classes = postCard({ variant });
  const tags =
    variant === 'showcase'
      ? post.tags?.slice(0, SHOWCASE_TAG_COUNT)
      : undefined;

  return (
    <article className={cx(cardRoot, classes.root)}>
      <div className={classes.cover}>
        <img
          // posts/ 안의 png·jpg는 빌드가 만든 webp, 썸네일이 없는 글은 생성 OG 카드(/og/{slug}.png).
          src={resolveThumbnailSrc(post, OG_DEFAULT_IMAGE)}
          alt=""
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          className={coverImage}
        />
      </div>
      <div className={classes.body}>
        <h3>
          <Link href={postPath(post.slug)} className={classes.link}>
            {post.title}
          </Link>
          {/* dev에서만 — draft·예약 글 표시(프로덕션에서는 아무것도 렌더되지 않는다). */}
          <HiddenPostBadge post={post} />
        </h3>
        {post.excerpt && <p className={classes.excerpt}>{post.excerpt}</p>}
      </div>
      <PostMeta post={post} tags={tags} />
    </article>
  );
};
