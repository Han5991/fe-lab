'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { useQuery } from '@tanstack/react-query';
import { client } from '@/lib/client';
import type { PostSummary } from '@/domain/post';
import { encodePostSlug } from '@/domain/post/utils';
import { fmtNum } from '@/lib/format';
import { Label } from './Label';

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
  // 메모이제이션이 의미가 없으므로, raw rows만 캐시하고 매핑은 useMemo로 분리합니다.
  const { data: rows } = useQuery({
    queryKey: ['popular-rail', limit],
    queryFn: async () => {
      const res = await client
        .from('post_views')
        .select('slug, view_count')
        .order('view_count', { ascending: false })
        .limit(limit);
      return res.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const ranked = useMemo<RankedPost[]>(() => {
    if (!rows || rows.length === 0) return [];
    const bySlug = new Map(posts.map(p => [p.slug, p]));
    return rows
      .map(r => {
        const post = bySlug.get(r.slug);
        if (!post) return null;
        return { ...post, viewCount: r.view_count ?? 0 } satisfies RankedPost;
      })
      .filter((p): p is RankedPost => p !== null);
  }, [rows, posts]);

  const items: RankedPost[] =
    ranked.length > 0
      ? ranked
      : posts.slice(0, limit).map(p => ({ ...p, viewCount: 0 }));

  return (
    <aside className={css({ position: 'sticky', top: '20' })}>
      <Label tone="meta" className={css({ display: 'block', mb: '4' })}>
        POPULAR · 30일
      </Label>
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
              borderTopWidth: i === 0 ? '0' : '[1px]',
              borderColor: 'ink.border',
            })}
          >
            <Link
              href={`/posts/${encodePostSlug(post.slug)}/`}
              className={css({
                display: 'flex',
                gap: '4',
                alignItems: 'baseline',
                py: '4',
                transition: '[all 0.15s]',
                '& [data-rank]': {
                  color: 'ink.300',
                  transition: '[color 0.15s]',
                },
                _hover: {
                  '& [data-rank]': { color: 'marker.600' },
                  '& h4': { color: 'ink.700' },
                },
              })}
            >
              <span
                data-rank
                className={css({
                  fontFamily: 'serif',
                  fontStyle: 'italic',
                  fontSize: '2xl',
                  fontWeight: 'medium',
                  minW: '8',
                  flexShrink: 0,
                })}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={css({ flex: '1', minW: '0' })}>
                <h4
                  className={css({
                    fontFamily: 'serif',
                    fontSize: 'sm',
                    fontWeight: 'medium',
                    lineHeight: 'headerSm',
                    color: 'ink.950',
                    transition: '[color 0.15s]',
                  })}
                >
                  {post.title}
                </h4>
                {post.viewCount > 0 && (
                  <span
                    className={css({
                      fontFamily: 'mono',
                      fontSize: '2xs',
                      color: 'ink.500',
                      mt: '1',
                      display: 'inline-block',
                      letterSpacing: 'mono',
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
