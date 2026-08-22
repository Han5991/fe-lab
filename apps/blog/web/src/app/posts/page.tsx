import { Suspense } from 'react';
import { css, cx } from '@design-system/ui-lib/css';

import {
  getAllPostSummaries,
  getAllSeries,
  getAllTags,
  getAllYears,
} from '@/src/content';
import { safeJsonLd } from '@blog/content';
import {
  buildBlogJsonLd,
  buildCollectionPageJsonLd,
  buildPostsMetadata,
} from './seo';
// 폴백 목록과 하이드레이션 후 목록이 같은 행 컴포넌트를 쓰도록 배럴(index.ts)이
// 아니라 모듈에서 직접 가져온다.
import {
  ArchiveRow,
  PostsArchiveView,
} from '@/src/components/blog/PostsArchive';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

export const metadata = buildPostsMetadata();

const posts = getAllPostSummaries();
const series = getAllSeries();
const tags = getAllTags();
const years = getAllYears();

const collectionPageJsonLd = buildCollectionPageJsonLd(posts);
const blogJsonLd = buildBlogJsonLd();

export default function PostsPage() {
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
      <PageBoundary transitionId="/posts" className={railGutter}>
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({ py: { base: '10', md: '16' } }),
          )}
        >
          {/* 허브 문법에 맞춘 헤더 — 큰 세리프 타이틀 대신 21px 산세리프 +
              모노 수치 한 줄, 구분은 hairline 보더 하나로만. */}
          <header
            className={css({
              mb: '[30px]',
              pb: '[16px]',
              borderBottomWidth: '[1px]',
              borderBottomStyle: 'solid',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '[16px]',
              flexWrap: 'wrap',
            })}
          >
            <h1
              className={css({
                fontSize: '[21px]',
                fontWeight: 'bold',
                color: 'ink.950',
              })}
            >
              모든 노트
            </h1>
            <span
              className={css({
                fontFamily: 'mono',
                fontWeight: 'normal',
                fontSize: '[12px]',
                color: 'ink.500',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {posts.length}편
            </span>
          </header>

          {/*
            PostsArchiveView는 nuqs(useSearchParams)를 쓰므로 output: 'export'의
            빌드 타임 프리렌더 대상에서 빠진다 (BAILOUT_TO_CLIENT_SIDE_RENDERING).
            즉 out/posts/index.html에 구워지는 건 아래 fallback이 전부다.
            스피너를 두면 아카이브 허브의 내부 링크가 0개가 되므로, 글 목록을 여기서
            프리렌더해 링크를 남긴다. (브라우저에서 하이드레이션되면 인터랙티브 뷰로 교체)
            회귀 이력: c206b99에서 도입 → 15ed918(리디자인)에서 유실 → 재도입.
          */}
          <Suspense
            fallback={
              <ol className={css({ listStyleType: 'none', p: '0', m: '0' })}>
                {posts.map(post => (
                  <ArchiveRow key={post.slug} post={post} />
                ))}
              </ol>
            }
          >
            <PostsArchiveView
              posts={posts}
              series={series}
              tags={tags}
              years={years}
            />
          </Suspense>
        </div>
      </PageBoundary>
    </>
  );
}
