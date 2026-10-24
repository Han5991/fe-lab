import { OG_DEFAULT_IMAGE } from '@/content.values.mts';
import { css, cx } from '@blog/styled-system/css';
import type { PostSummary } from '@blog/content/client';
import { postPath, resolveThumbnailSrc } from '@blog/content/client';

import { PostCardShared } from '@/src/components/shared/PostSharedElement';
import { TransitionLink } from '@/src/components/shared/TransitionLink';
import { cardLinkRaw, cardRoot, coverFrameRaw, coverImage } from './cardParts';
import { HiddenPostBadge } from './HiddenPostBadge';
import { PostMeta } from './PostMeta';

/** 썸네일 `<img>`의 width·height — md 이상에서 보이는 크기(160×90, 16:9) 그대로다. */
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

const row = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  minW: '0',
});

// 좁은 화면(md 미만)은 128px — 160이면 375px 화면에서 글자 칸이 159px만 남아 시리즈 접두사가 긴 제목
// (`[누가 시키지도 않았는데 번들러 만들기] 4. …`)이 접두사에서 잘린다.
const thumb = css(coverFrameRaw, {
  w: { base: '32', md: '40' },
  rounded: 'element',
});

const title = css(cardLinkRaw, { textStyle: 'h3', lineClamp: 2 });

interface PostThumbRowProps {
  post: PostSummary;
}

/**
 * 썸네일 행 — 홈 "지난 글"의 한 줄. 160×90 썸네일 | 제목(두 줄에서 자름)·메타. 카드처럼 행 전체가
 * 제목 링크 하나다(`cardParts.ts`). 목록의 `<li>`는 쓰는 쪽이 감싼다.
 */
export const PostThumbRow = ({ post }: PostThumbRowProps) => (
  <div className={cx(cardRoot, row)}>
    <PostCardShared part="cover" slug={post.slug}>
      <div className={thumb}>
        <img
          src={resolveThumbnailSrc(post, OG_DEFAULT_IMAGE)}
          alt=""
          width={THUMB_WIDTH}
          height={THUMB_HEIGHT}
          loading="lazy"
          decoding="async"
          className={coverImage}
        />
      </div>
    </PostCardShared>
    <div
      className={css({
        display: 'flex',
        flexDir: 'column',
        gap: '1',
        minW: '0',
      })}
    >
      <PostCardShared part="title" slug={post.slug}>
        <h3>
          <TransitionLink
            href={postPath(post.slug)}
            // 이 행의 썸네일·제목이 글 상세로 이어지는 이동이라는 표시(PostCardShared).
            opensPost
            className={title}
          >
            {post.title}
          </TransitionLink>
          {/* dev에서만 — draft·예약 글 표시(프로덕션에서는 아무것도 렌더되지 않는다). */}
          <HiddenPostBadge post={post} />
        </h3>
      </PostCardShared>
      <PostMeta post={post} />
    </div>
  </div>
);
