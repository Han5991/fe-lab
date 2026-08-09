'use client';

import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { useQuery } from '@tanstack/react-query';
import { getTopPosts } from '@/domain/analytics';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtNum } from '@/lib/format';

interface PopularRailProps {
  posts: PostSummary[];
  limit?: number;
}

interface RankedPost extends PostSummary {
  viewCount: number;
}

export const PopularRail = ({ posts, limit = 5 }: PopularRailProps) => {
  // useSuspenseQuery에서 useQuery로 전환. fetch가 실패하면 ErrorBoundary로
  // 떠넘기지 않고 정적 fallback(최신글 limit개)으로 graceful degrade합니다.
  // select에 posts를 캡처하면 매 렌더마다 다른 클로저가 만들어져 React Query의
  // 메모이제이션이 의미가 없으므로, raw rows만 캐시하고 매핑은 렌더에서 합칩니다.
  const { data: rows } = useQuery({
    queryKey: ['popular-rail', limit],
    queryFn: () => getTopPosts(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const bySlug = new Map(posts.map(p => [p.slug, p]));
  const ranked: RankedPost[] = (rows ?? [])
    .map(r => {
      const post = bySlug.get(r.slug);
      if (!post) return null;
      // getTopPosts(TopPostRow)의 view_count는 이미 non-null number로 정규화됨.
      return { ...post, viewCount: r.view_count } satisfies RankedPost;
    })
    .filter((p): p is RankedPost => p !== null);

  const items: RankedPost[] =
    ranked.length > 0
      ? ranked
      : posts.slice(0, limit).map(p => ({ ...p, viewCount: 0 }));

  return (
    <aside className={css({ position: 'sticky', top: '20' })}>
      {/* 섹션 라벨은 h3. 아래 포스트 제목이 h4라 span으로 두면 헤딩 레벨이
          건너뛰어져 axe heading-order가 깨진다(홈 기준 h2 → h3 → h4). */}
      <h3
        className={css({
          display: 'block',
          mb: '3',
          fontFamily: 'sans',
          fontSize: '[12px]',
          fontWeight: 'semibold',
          color: 'ink.500',
        })}
      >
        Popular · 30일
      </h3>
      <ol
        className={css({
          listStyleType: 'none',
          p: '0',
          m: '0',
          display: 'flex',
          flexDir: 'column',
        })}
      >
        {items.map((post, i) => (
          <li
            key={post.slug}
            className={css({
              borderTopWidth: i === 0 ? '[0]' : '[1px]',
              borderStyle: 'solid',
              borderColor: 'ink.border',
            })}
          >
            <Link
              href={`/posts/${encodePostSlug(post.slug)}/`}
              className={css({
                display: 'flex',
                gap: '[10px]',
                alignItems: 'baseline',
                py: '[10px]',
                transition: '[all 0.15s]',
                _hover: {
                  '& h4': { color: 'accent.700', textDecoration: 'underline' },
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
                <h4
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
                </h4>
                {post.viewCount > 0 && (
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
                )}
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
};
