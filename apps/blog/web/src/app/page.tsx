import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';

import {
  POSTS_PATH,
  sortPostsBySeriesOrder,
  type PostSummary,
} from '@blog/content';
import { getAllPostSummaries, getSeriesMeta } from '@/src/content';
import { safeJsonLd } from '@blog/content';
import { HOME_TRANSITION_ID } from '@/src/shared/transitions';
import { buildHomeJsonLd, buildHomeMetadata } from './homeSeo';

import { Hero, FeaturedPost, PostIndexRow } from '@/src/components/blog';
import { OssStrip } from '@/src/components/home/OssStrip';
import { seriesBadgeLabel } from '@/src/components/home/seriesBadge';
import { PageBoundary } from '@/src/components/PageBoundary';
import { railGutter, railColumn } from '@/src/components/Rail';

export const metadata = buildHomeMetadata();

const jsonLd = buildHomeJsonLd();

/** 허브에 노출할 최근 글 수. 대표 글 1개는 제외한 나머지에서 센다. */
const RECENT_COUNT = 12;

/**
 * 대표 글의 시리즈 배지 문구. 시리즈 안 순서는 `_series.yml`의 `order`를 따르고
 * (없으면 날짜 오름차순) 글 상세의 시리즈 네비게이션과 같은 규칙을 씁니다.
 */
function buildSeriesLabel(
  post: PostSummary,
  allPosts: PostSummary[],
): string | undefined {
  // `series`는 `_series.yml`로 선언된 폴더에만 붙는다(`repository.ts`).
  // 주제별로 모아 둔 폴더의 글은 여기서 그대로 빠진다.
  if (!post.series) return undefined;
  const siblings = allPosts.filter(p => p.series === post.series);
  const meta = getSeriesMeta(post.series);
  const ordered = sortPostsBySeriesOrder(siblings, meta?.order);
  return seriesBadgeLabel(
    meta?.title ?? post.series,
    ordered.map(p => p.slug),
    post.slug,
  );
}

export default function HomePage() {
  // 로더 호출은 컴포넌트 안에 둔다. dev에서 `readAllPosts()`는 캐시를 건너뛰고
  // 매번 fs를 다시 읽는데(`repository.ts`), 그 설계는 요청마다 호출된다는
  // 전제 위에 있다 — 모듈 최상위로 올리면 dev 서버가 재시작 전까지 첫 요청
  // 시점 목록에 고정돼 글을 추가·수정해도 화면에 반영되지 않는다.
  const allPosts = getAllPostSummaries();
  const featured = allPosts[0];
  const recent = allPosts.slice(1, 1 + RECENT_COUNT);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <PageBoundary transitionId={HOME_TRANSITION_ID}>
        <div className={cx(css({ bg: 'paper.50' }), railGutter)}>
          <div
            className={cx(
              railColumn({ width: 'text' }),
              css({ pt: '[36px]', pb: '[48px]' }),
            )}
          >
            <Hero />

            {featured && (
              <FeaturedPost
                post={featured}
                seriesLabel={buildSeriesLabel(featured, allPosts)}
              />
            )}

            {/* 장식 없는 텍스트 리스트. 행이 스스로 "마지막"인지 알 수 없어
                목록을 닫는 아래 보더는 여기서 :last-child로 붙인다. */}
            <ol
              aria-label="최근 글"
              className={css({
                listStyleType: 'none',
                p: '0',
                m: '0',
                '& > li:last-child > a': {
                  borderBottomWidth: 'hairline',
                  borderBottomStyle: 'solid',
                  borderBottomColor: 'ink.border',
                },
              })}
            >
              {recent.map(post => (
                <li key={post.slug}>
                  <PostIndexRow post={post} />
                </li>
              ))}
            </ol>

            <Link
              href={POSTS_PATH}
              className={css({
                display: 'inline-block',
                mt: '[14px]',
                fontSize: '[13px]',
                color: 'accent.600',
                _hover: { textDecoration: 'underline' },
              })}
            >
              모든 글 →
            </Link>

            <OssStrip />
          </div>
        </div>
      </PageBoundary>
    </>
  );
}
