'use client';

import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';
import { useSuspenseQuery } from '@tanstack/react-query';
import { client } from '@/lib/client';
import type { PostSummary } from '@/lib/posts';
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
  const { data } = useSuspenseQuery({
    queryKey: ['popular-rail', limit],
    queryFn: async () => {
      const res = await client
        .from('post_views')
        .select('slug, view_count')
        .order('view_count', { ascending: false })
        .limit(limit);
      return res.data ?? [];
    },
    select: rows => {
      const bySlug = new Map(posts.map(p => [p.slug, p]));
      return rows
        .map(r => {
          const post = bySlug.get(r.slug);
          if (!post) return null;
          return { ...post, viewCount: r.view_count } as RankedPost;
        })
        .filter((p): p is RankedPost => p !== null);
    },
  });

  // 데이터가 비어 있으면 최신 글 fallback (로컬 dev에서 viewCount 없을 때)
  const items: RankedPost[] =
    data.length > 0
      ? data
      : posts.slice(0, limit).map(p => ({ ...p, viewCount: 0 }));

  return (
    <aside
      className={css({
        position: 'sticky',
        top: '20',
      })}
    >
      <Label tone="meta" className={css({ display: 'block', mb: '4' })}>
        POPULAR · 30일
      </Label>
      <ol
        className={css({
          listStyle: 'none',
          p: 0,
          m: 0,
          display: 'flex',
          flexDir: 'column',
        })}
      >
        {items.map((post, i) => (
          <li
            key={post.slug}
            className={css({
              borderTopWidth: i === 0 ? '0' : '1px',
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
                transition: 'all 0.15s',
                '& [data-rank]': {
                  color: 'ink.300',
                  transition: 'color 0.15s',
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
                  fontWeight: '500',
                  minW: '8',
                  flexShrink: 0,
                })}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={css({ flex: 1, minW: 0 })}>
                <h4
                  className={css({
                    fontFamily: 'serif',
                    fontSize: 'sm',
                    fontWeight: '500',
                    lineHeight: '1.4',
                    color: 'ink.950',
                    transition: 'color 0.15s',
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
                      letterSpacing: '0.04em',
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

export const PopularRailFallback = ({ posts, limit = 5 }: PopularRailProps) => (
  <aside className={css({ position: 'sticky', top: '20' })}>
    <Label tone="meta" className={css({ display: 'block', mb: '4' })}>
      POPULAR · 30일
    </Label>
    <ol className={css({ listStyle: 'none', p: 0, m: 0 })}>
      {posts.slice(0, limit).map((post, i) => (
        <li
          key={post.slug}
          className={css({
            borderTopWidth: i === 0 ? '0' : '1px',
            borderColor: 'ink.border',
            py: '4',
            display: 'flex',
            gap: '4',
            alignItems: 'baseline',
          })}
        >
          <span
            className={css({
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontSize: '2xl',
              fontWeight: '500',
              minW: '8',
              color: 'ink.300',
            })}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <h4
            className={css({
              fontFamily: 'serif',
              fontSize: 'sm',
              fontWeight: '500',
              lineHeight: '1.4',
              color: 'ink.950',
            })}
          >
            {post.title}
          </h4>
        </li>
      ))}
    </ol>
  </aside>
);
