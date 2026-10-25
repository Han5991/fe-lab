import { OG_DEFAULT_IMAGE } from '@/content.values.mts';
import { css, cx, sva } from '@blog/styled-system/css';
import type { RecipeVariant } from '@blog/styled-system/css';
import type { PostSummary } from '@blog/content/client';
import {
  isWideThumbnail,
  postPath,
  resolveThumbnailSrc,
} from '@blog/content/client';

import { PostCardShared } from '@/src/components/shared/PostSharedElement';
import { TransitionLink } from '@/src/components/shared/TransitionLink';
import { cardLinkRaw, cardRoot, coverFrameRaw, coverImage } from './cardParts';
import { HiddenPostBadge } from './HiddenPostBadge';
import { PostMeta } from './PostMeta';

/** 커버 `<img>`의 width·height — 크기는 CSS(16:9 틀)가 정하고, 이 둘은 비율 힌트다. */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 675;

/**
 * 글 카드 — Astryx BlogCard·BlogFeatureCard의 블로그 판. 커버(16:9) → 제목·발췌 → 메타 순서다.
 * 배치(sva 변형)는 셋이다.
 *
 * - `showcase` — 큰 카드. 제목 24/32(md 이상), 발췌 17/24를 두 줄에서 자른다.
 * - `feature` — showcase와 같은 크기에 발췌를 자르지 않는다(승인 목업의 글 목록 피처는 세 줄).
 * - `default` — 작은 카드. 제목 17/24와 발췌 14/20을 각각 두 줄에서 자른다.
 *
 * 변형 값은 리터럴 객체로 적는다 — Panda가 정적으로 추출하므로 공유 상수를 펼쳐 넣지 않는다.
 */
const postCard = sva({
  slots: ['root', 'cover', 'body', 'link', 'excerpt'],
  base: {
    root: { display: 'flex', flexDir: 'column', minW: '0' },
    cover: css.raw(coverFrameRaw, { rounded: 'container' }),
    body: { display: 'flex', flexDir: 'column', gap: '1' },
    link: cardLinkRaw,
    excerpt: { color: 'ink.700' },
  },
  variants: {
    variant: {
      showcase: {
        root: { gap: '4' },
        // 1024px 아래에서 한 열로 쌓이면 커버가 화면 폭이 된다 — 제목도 md부터 큰 단계로 간다.
        link: { display: 'block', textStyle: { base: 'h3', md: 'h1' } },
        excerpt: { textStyle: { base: 'body', md: 'bodyLarge' }, lineClamp: 2 },
      },
      feature: {
        root: { gap: '4' },
        link: { display: 'block', textStyle: { base: 'h3', md: 'h1' } },
        // 길이는 원고의 excerpt 상한(check-seo `excerpt-length`)이 막는다.
        excerpt: { textStyle: { base: 'body', md: 'bodyLarge' } },
      },
      default: {
        root: { gap: '3' },
        link: { textStyle: 'h3', lineClamp: 2 },
        excerpt: { textStyle: 'body', lineClamp: 2 },
      },
    },
  },
});

type PostCardLayout = NonNullable<RecipeVariant<typeof postCard>['variant']>;

/** 카드 한 종류 — 배치(sva 변형)와 메타 줄의 태그(글자로 이을지 배지로 달지, 앞에서 몇 개). */
interface CardKindSpec {
  layout: PostCardLayout;
  tags: { as: 'text' | 'badge'; count: number } | null;
}

/**
 * 카드 종류마다 배치와 태그 표시를 이 표 한 곳에서 정한다 — 태그 정책을 쓰는 쪽 prop으로 흩지 않는다.
 *
 * - `showcase` — 홈 "최근 글"의 큰 카드. 메타 끝에 앞 태그 셋을 글자로(승인 목업 `vitest · testing · ci`).
 * - `default` — 홈 "최근 글"의 작은 카드. 태그 없음.
 * - `feature` — 글 목록(`/posts`) 맨 위 피처. 앞 태그 둘을 배지로.
 * - `grid` — 글 목록 그리드. 작은 카드 배치에 첫 태그 하나를 배지로.
 */
const CARD_KIND = {
  showcase: { layout: 'showcase', tags: { as: 'text', count: 3 } },
  default: { layout: 'default', tags: null },
  feature: { layout: 'feature', tags: { as: 'badge', count: 2 } },
  grid: { layout: 'default', tags: { as: 'badge', count: 1 } },
} as const satisfies Record<string, CardKindSpec>;

type PostCardKind = keyof typeof CARD_KIND;

interface PostCardProps {
  post: PostSummary;
  variant: PostCardKind;
  /**
   * 첫 화면의 가장 큰 이미지(LCP 후보)만 켠다 — lazy 대신 바로, 높은 우선순위로 받는다. 여러 장에
   * 걸면 화면 밖 이미지까지 한꺼번에 받아 오히려 LCP가 밀린다.
   */
  priority?: boolean;
}

/**
 * 카드 전체가 제목 링크 하나다(`cardParts.ts`). 제목은 h3 — 홈은 h1(이름) → h2(섹션) → h3(카드),
 * 글 목록은 h1(모든 노트) → h2(N편) → h3(피처·카드)라 헤딩 단계를 건너뛰지 않는다.
 */
export const PostCard = ({
  post,
  variant,
  priority = false,
}: PostCardProps) => {
  const { layout, tags: tagSpec } = CARD_KIND[variant];
  const classes = postCard({ variant: layout });
  const tags = tagSpec ? post.tags?.slice(0, tagSpec.count) : undefined;

  return (
    <article className={cx(cardRoot, classes.root)}>
      {/* 커버는 틀(라운드·hairline)째 글 상세 히어로로 이어진다 — 이름을 img에 달면 틀의 라운드가
          스냅샷에서 빠져 첫 프레임에 모서리가 각진다. */}
      <PostCardShared
        part="cover"
        slug={post.slug}
        rescaled={!isWideThumbnail(post)}
      >
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
      </PostCardShared>
      <div className={classes.body}>
        <PostCardShared part="title" slug={post.slug}>
          <h3>
            <TransitionLink
              href={postPath(post.slug)}
              // 이 카드의 커버·제목이 글 상세로 이어지는 이동이라는 표시(PostCardShared).
              opensPost
              className={classes.link}
            >
              {post.title}
            </TransitionLink>
            {/* dev에서만 — draft·예약 글 표시(프로덕션에서는 아무것도 렌더되지 않는다). */}
            <HiddenPostBadge post={post} />
          </h3>
        </PostCardShared>
        {post.excerpt && <p className={classes.excerpt}>{post.excerpt}</p>}
      </div>
      <PostMeta
        post={post}
        tags={tagSpec?.as === 'text' ? tags : undefined}
        badges={tagSpec?.as === 'badge' ? tags : undefined}
      />
    </article>
  );
};
