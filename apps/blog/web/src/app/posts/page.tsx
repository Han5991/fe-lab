import { Suspense } from 'react';
import { css, cx } from '@blog/styled-system/css';

import { SITE_DESCRIPTION } from '@/content.values.mts';
import { getAllPostSummaries, getAllSeries } from '@/src/content';
import { safeJsonLd } from '@blog/content/client';
import {
  buildBlogJsonLd,
  buildCollectionPageJsonLd,
  buildPostsMetadata,
} from './seo';
// 폴백과 뷰가 같은 레이아웃 모듈을 쓰도록 배럴이 아니라 모듈에서 가져온다.
import {
  PostsArchiveFallback,
  PostsArchiveView,
} from '@/src/components/blog/PostsArchive';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

export const metadata = buildPostsMetadata();

// 글 목록에 기대지 않는 JSON-LD라 한 번만 만든다.
const blogJsonLd = buildBlogJsonLd();

export default function PostsPage() {
  // 로더 호출은 컴포넌트 안에 둔다. dev에서 `readAllPosts()`는 캐시를 건너뛰고
  // 매번 fs를 다시 읽는데(`repository.ts`), 그 설계는 요청마다 호출된다는
  // 전제 위에 있다 — 모듈 최상위로 올리면 dev 서버가 재시작 전까지 첫 요청
  // 시점 목록에 고정된다. draft·scheduled 글을 그대로 노출하는 목록이라
  // 글을 쓰는 동안 특히 크게 어긋난다.
  const posts = getAllPostSummaries();
  // 칩은 id·제목·편수만 쓴다 — 설명문을 RSC 페이로드에 싣지 않는다.
  const series = getAllSeries().map(({ id, title, count }) => ({
    id,
    title,
    count,
  }));
  const collectionPageJsonLd = buildCollectionPageJsonLd(posts);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(blogJsonLd) }}
      />
      <PageBoundary className={railGutter}>
        <div
          className={cx(
            railColumn({ width: 'text' }),
            css({
              display: 'flex',
              flexDir: 'column',
              gap: '10',
              pt: 'pageTop',
            }),
          )}
        >
          <div
            className={css({
              display: 'flex',
              flexDir: 'column',
              gap: '2',
              textAlign: 'center',
            })}
          >
            <h1 className={css({ textStyle: 'display1' })}>모든 노트</h1>
            <p className={css({ textStyle: 'body', color: 'ink.700' })}>
              {SITE_DESCRIPTION}
            </p>
          </div>

          {/* 뷰는 `useSearchParams` 때문에 프리렌더에서 빠져 정적 HTML에는 이 폴백만 남는다 — 링크를
              남기려고 목록을 그리고, 파라미터 없는 뷰와 같은 레이아웃이라 하이드레이션 뒤 바뀌지 않는다. */}
          <Suspense
            fallback={<PostsArchiveFallback posts={posts} series={series} />}
          >
            <PostsArchiveView posts={posts} series={series} />
          </Suspense>
        </div>
      </PageBoundary>
    </>
  );
}
