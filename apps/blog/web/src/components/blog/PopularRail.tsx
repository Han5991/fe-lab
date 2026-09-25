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
  // 순위는 이 빌드의 slug 안에서 서버가 고른다 — 받은 뒤 거르면 가짜 slug가 칸을 차지한다.
  // select에 posts를 캡처하면 매 렌더 새 클로저라, raw rows만 캐시하고 매핑은 렌더에서 한다.
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

  // 조회수가 오기 전엔 자리만 잡는다 — 최신 글을 "인기"로 그리지 않는다.
  if (isPending) return <PopularRailSkeleton rows={limit} />;
  // 실패했거나 순위를 매길 조회수가 없으면 섹션째 뺀다.
  if (ranked.length === 0) return null;

  return (
    // 사이드바 <aside> 안에 들어가므로 <section>이다(aside 중첩 금지). 헤딩은 h1 다음 h2.
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
        {/* 순위는 누적 조회수다 — 쿼리에 기간 창이 없다. */}
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
