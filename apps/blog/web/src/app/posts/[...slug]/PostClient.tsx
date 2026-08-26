'use client';

import { css, cx } from '@design-system/ui-lib/css';

import type { PostData } from '@blog/content';
import GiscusComments from '@/src/components/GiscusComments';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';
import { useViewCount } from '@/src/hooks/useViewCount';
import { useRecordRecentView } from '@/src/hooks/useRecentViews';
import { BackToTop } from '@/src/components/mobile/BackToTop';
import { MobileTOC } from '@/src/components/mobile/MobileTOC';
import { ShareButton } from '@/src/components/mobile/ShareButton';

import { TOC } from '@/src/components/post/TOC';
import { ReadingProgress } from '@/src/components/post/ReadingProgress';
import { PostHeader } from '@/src/components/post/PostHeader';
import { PostHero } from '@/src/components/post/PostHero';
import { PostBody } from './PostBody';

interface PostClientProps {
  post: PostData;
  thumbnailUrl?: string | undefined;
  seriesIndex?:
    { current: number; total: number; displayName: string } | undefined;
}

export default function PostClient({
  post,
  thumbnailUrl,
  seriesIndex,
}: PostClientProps) {
  useViewCount(post.slug);
  useRecordRecentView(post.slug, post.title);

  return (
    <>
      <ReadingProgress />
      <BackToTop />

      <div className={css({ display: 'block', lg: { display: 'none' } })}>
        <MobileTOC />
      </div>

      <PageBoundary
        // 썸네일 있으면 /posts/*(hero 모핑 대상), 없으면 /posts-plain/*(fade 폴백)으로
        // 분기해 전환 매칭을 라우팅한다. (URL은 그대로 /posts/{slug})
        transitionId={
          thumbnailUrl ? `/posts/${post.slug}` : `/posts-plain/${post.slug}`
        }
        className={cx(
          railGutter,
          css({ py: { base: '10', md: '14' }, bg: 'paper.50' }),
        )}
      >
        {/* 셸은 wide 레일이라 헤더·/posts와 좌우 끝이 같고, 그 안에서 본문이
            text 레일(680)을 차지하고 TOC가 오른쪽 끝에 붙는다. */}
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({
              display: 'grid',
              // 차례 칼럼 268px은 레퍼런스(fumadocs)와 같은 폭이다. 240px에서는
              // 한국어 헤딩이 대부분 두 줄로 접혀 목록이 두 배로 길어졌다.
              // wide 레일(1200) − 차례(268) − 간격(64) = 868px이라 본문
              // 칼럼(railText 680)에는 영향이 없다.
              gridTemplateColumns: { base: '1fr', lg: '[1fr 268px]' },
              gap: { base: '0', lg: '16' },
              alignItems: 'start',
            }),
          )}
        >
          <article
            className={css({
              maxW: 'railText',
              minW: '0',
              mx: { base: 'auto', lg: '0' },
              w: 'full',
            })}
          >
            <PostHeader post={post} seriesIndex={seriesIndex} />

            {/* hero는 frontmatter 값 그대로다 — thumbnailUrl과 달리 경로 해석이
                없어서 page.tsx를 거칠 이유가 없다. */}
            <PostHero
              slug={post.slug}
              title={post.title}
              hero={post.hero}
              thumbnailUrl={thumbnailUrl}
            />

            <PostBody content={post.content} relativeDir={post.relativeDir} />

            <div
              className={css({
                mt: '14',
                pt: '6',
                borderTopWidth: 'hairline',
                borderColor: 'ink.border',
                display: 'flex',
                justifyContent: 'flex-end',
              })}
            >
              <ShareButton title={post.title} />
            </div>

            <div className={css({ mt: '10' })}>
              <GiscusComments />
            </div>
          </article>

          <TOC />
        </div>
      </PageBoundary>
    </>
  );
}
