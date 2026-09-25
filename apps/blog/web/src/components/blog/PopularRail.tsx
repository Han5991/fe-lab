'use client';

import { useId } from 'react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { useQuery } from '@tanstack/react-query';
import { getTopPosts } from '@/src/domain/analytics';
import type { PostSummary } from '@blog/content';
import { postPath } from '@blog/content';
import { fmtNum } from '@blog/content';

interface PopularRailProps {
  posts: PostSummary[];
  limit?: number;
}

interface RankedPost extends PostSummary {
  viewCount: number;
}

export const PopularRail = ({ posts, limit = 5 }: PopularRailProps) => {
  // 데스크톱·모바일에 한 번씩 두 벌이 마운트되므로 헤딩 id는 인스턴스마다 만든다.
  const headingId = useId();
  // 순위는 이 빌드에 실린 글의 slug 안에서만 서버가 고른다(getTopPosts 주석).
  // post_views는 anon RPC로 아무 slug나 부풀릴 수 있어서, 상위 N개를 먼저 받고
  // 여기서 모르는 slug를 거르면 가짜 slug가 N칸을 전부 차지해 레일이 빈다.
  //
  // select에 posts를 캡처하면 매 렌더마다 다른 클로저가 만들어져 React Query의
  // 메모이제이션이 의미가 없으므로, raw rows만 캐시하고 매핑은 렌더에서 합칩니다.
  const slugs = posts.map(p => p.slug);
  const { data: rows, isPending } = useQuery({
    queryKey: ['popular-rail', limit, slugs],
    queryFn: () => getTopPosts(limit, slugs),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // 사이드바 장식이라 오래 붙잡지 않는다(기본 3회 재시도면 스켈레톤이 ~7초).
    retry: 1,
  });

  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const ranked: RankedPost[] = (rows ?? [])
    .map(r => {
      const post = bySlug.get(r.slug);
      // 서버가 이미 걸렀지만, 조회수 0인 행이나 목록 밖 행이 오면 순위에 넣지 않는다.
      if (!post || r.view_count <= 0) return null;
      // getTopPosts(TopPostRow)의 view_count는 이미 non-null number로 정규화됨.
      return { ...post, viewCount: r.view_count } satisfies RankedPost;
    })
    .filter((p): p is RankedPost => p !== null);

  // 조회수가 오기 전엔 자리만 잡아 둔다. 예전엔 여기서 최신 글을 "인기" 제목 아래
  // 그렸다가 데이터가 오면 순서를 갈아 끼웠고, 조회 실패·데이터 없음일 때는 그
  // 최신 글 목록이 그대로 "인기 글"로 남았다.
  if (isPending) return <PopularRailSkeleton rows={limit} />;
  // 실패했거나 순위를 매길 조회수가 없으면 섹션째 뺀다 — 다른 목록으로 채워
  // 인기 글이라고 부르지 않는다.
  if (ranked.length === 0) return null;

  return (
    // <aside>가 아니라 이름 붙은 <section>이다. 이 레일은 글 목록(PostsArchive)의
    // 사이드바 <aside> 안에 들어가 aside가 중첩됐다(axe
    // landmark-complementary-is-top-level). 헤딩은 h2 → 글 제목 h3 — 페이지 h1
    // 바로 다음이라 h3으로 시작하면 한 단계를 건너뛴다(axe heading-order). 예전의
    // sticky는 같은 크기의 래퍼 안이라 아무 효과가 없었다.
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className={css({
          display: 'block',
          mb: '3',
          fontFamily: 'sans',
          fontSize: '[12px]',
          fontWeight: 'semibold',
          color: 'ink.500',
        })}
      >
        {/* 순위는 post_views의 누적 조회수다(getTopPosts) — 기간 창이 없다.
            예전 라벨 "30일"은 이 쿼리가 한 번도 한 적 없는 약속이었다. */}
        Popular · 누적
      </h2>
      <ol
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          display: 'flex',
          flexDir: 'column',
        })}
      >
        {ranked.map((post, i) => (
          <li
            key={post.slug}
            className={css({
              borderTopWidth: i === 0 ? '[0]' : '[1px]',
              borderStyle: 'solid',
              borderColor: 'ink.border',
            })}
          >
            <Link
              href={postPath(post.slug)}
              className={css({
                display: 'flex',
                gap: '[10px]',
                alignItems: 'baseline',
                py: '[10px]',
                transition: '[all 0.15s]',
                _hover: {
                  '& h3': { color: 'accent.700', textDecoration: 'underline' },
                },
              })}
            >
              <span
                data-rank
                className={css({
                  fontFamily: 'mono',
                  fontSize: 'sm',
                  fontWeight: 'medium',
                  color: 'ink.500',
                  minW: '6',
                  flexShrink: 0,
                })}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={css({ flex: '1', minW: '0' })}>
                <h3
                  className={css({
                    fontFamily: 'sans',
                    fontSize: 'sm',
                    fontWeight: 'semibold',
                    lineHeight: 'headerSm',
                    color: 'accent.600',
                    transition: '[color 0.15s]',
                  })}
                >
                  {post.title}
                </h3>
                <span
                  className={css({
                    fontFamily: 'sans',
                    fontSize: '[12px]',
                    color: 'ink.500',
                    mt: '1',
                    display: 'inline-block',
                  })}
                >
                  {fmtNum(post.viewCount)} reads
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
};

/** 조회수를 받는 동안의 자리 — 줄 수만큼 빈 막대를 그려 레일 높이를 미리 잡는다. */
const PopularRailSkeleton = ({ rows }: { rows: number }) => (
  // 글자가 없는 장식이라 보조기기에는 숨긴다.
  <div aria-hidden="true">
    <div
      className={css({
        h: '[14px]',
        w: '[88px]',
        mb: '3',
        rounded: 'sm',
        bg: 'paper.100',
      })}
    />
    {Array.from({ length: rows }, (_, i) => (
      <div
        key={i}
        className={css({
          h: '[18px]',
          my: '[10px]',
          rounded: 'sm',
          bg: 'paper.100',
        })}
      />
    ))}
  </div>
);
