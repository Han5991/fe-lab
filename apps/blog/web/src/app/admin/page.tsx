'use client';

import { Suspense } from 'react';
import { LogOut, BarChart3, FileText } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { useAdminDashboardData } from '@/lib/hooks/useAdminViews';
import { useAdminLogout } from '@/lib/hooks/useAdminLogout';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import Link from 'next/link';
import { encodePostSlug } from '@/domain/post/utils';

function AdminOverviewContent() {
  const { data } = useAdminDashboardData();

  const totalViews = data.reduce((acc, curr) => acc + curr.totalViews, 0);
  const totalTodayViews = data.reduce((acc, curr) => acc + curr.todayViews, 0);
  const totalPosts = data.length;

  const topPosts = [...data]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);

  const recentPosts = [...data]
    .filter(p => p.date)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  return (
    <>
      {/* Stats row */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          gap: '4',
          mb: '8',
        })}
      >
        {/* 전체 조회수 */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: '1px',
            borderColor: 'ink.border',
            rounded: 'lg',
            p: '6',
          })}
        >
          <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
            <BarChart3 size={16} className={css({ color: 'accent.600' })} />
            <span className={css({ fontSize: 'xs', color: 'ink.500', fontWeight: 'medium' })}>
              전체 조회수
            </span>
          </div>
          <div className={css({ display: 'flex', alignItems: 'baseline', gap: '2' })}>
            <span className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950', letterSpacing: 'tight' })}>
              {totalViews.toLocaleString()}
            </span>
            <span className={css({ fontSize: 'xs', color: 'ink.500' })}>회</span>
            {totalTodayViews > 0 && (
              <span className={css({ color: 'accent.600', fontWeight: 'bold', fontSize: 'sm' })}>
                +{totalTodayViews}
              </span>
            )}
          </div>
        </div>

        {/* 총 게시글 */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: '1px',
            borderColor: 'ink.border',
            rounded: 'lg',
            p: '6',
          })}
        >
          <div className={css({ display: 'flex', alignItems: 'center', gap: '2', mb: '4' })}>
            <FileText size={16} className={css({ color: 'accent.600' })} />
            <span className={css({ fontSize: 'xs', color: 'ink.500', fontWeight: 'medium' })}>
              총 게시글 수
            </span>
          </div>
          <div className={css({ display: 'flex', alignItems: 'baseline', gap: '2' })}>
            <span className={css({ fontSize: '2xl', fontWeight: 'bold', color: 'ink.950', letterSpacing: 'tight' })}>
              {totalPosts}
            </span>
            <span className={css({ fontSize: 'xs', color: 'ink.500' })}>개</span>
          </div>
        </div>

        {/* 상세 분석 링크 */}
        <Link
          href="/admin/analytics"
          className={css({
            bg: 'accent.600',
            borderWidth: '1px',
            borderColor: 'accent.600',
            rounded: 'lg',
            p: '6',
            display: 'flex',
            flexDir: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3',
            transition: 'opacity 0.15s',
            _hover: { opacity: '0.85' },
          })}
        >
          <BarChart3 size={24} className={css({ color: 'white' })} />
          <span className={css({ color: 'white', fontWeight: 'semibold', fontSize: 'sm' })}>
            상세 분석 보기 →
          </span>
        </Link>
      </div>

      {/* Content grid */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
          gap: '4',
        })}
      >
        {/* Top Posts */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: '1px',
            borderColor: 'ink.border',
            rounded: 'lg',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              px: '5',
              py: '4',
              borderBottomWidth: '1px',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              gap: '3',
            })}
          >
            <span className={css({ fontSize: 'xs', fontWeight: 'bold', color: 'accent.600', letterSpacing: 'widest', textTransform: 'uppercase' })}>
              Top
            </span>
            <h2 className={css({ fontWeight: 'bold', color: 'ink.950', fontSize: 'sm' })}>
              인기 게시글
            </h2>
          </div>
          <div>
            {topPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/posts/${encodePostSlug(post.slug)}`}
                target="_blank"
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4',
                  px: '5',
                  py: '3',
                  borderBottomWidth: i < topPosts.length - 1 ? '1px' : '0',
                  borderColor: 'ink.border',
                  transition: 'background 0.15s',
                  _hover: { bg: 'ink.50' },
                })}
              >
                <span
                  className={css({
                    fontWeight: 'bold',
                    color: 'accent.600',
                    fontSize: 'sm',
                    w: '5',
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  })}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={css({
                    flex: 1,
                    color: 'ink.950',
                    fontSize: 'sm',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {post.title}
                </span>
                <span
                  className={css({
                    fontWeight: 'semibold',
                    color: 'ink.700',
                    fontSize: 'sm',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  })}
                >
                  {post.totalViews.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Posts */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: '1px',
            borderColor: 'ink.border',
            rounded: 'lg',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              px: '5',
              py: '4',
              borderBottomWidth: '1px',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              gap: '3',
            })}
          >
            <span className={css({ fontSize: 'xs', fontWeight: 'bold', color: 'accent.600', letterSpacing: 'widest', textTransform: 'uppercase' })}>
              Recent
            </span>
            <h2 className={css({ fontWeight: 'bold', color: 'ink.950', fontSize: 'sm' })}>
              최근 게시글
            </h2>
          </div>
          <div>
            {recentPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/posts/${encodePostSlug(post.slug)}`}
                target="_blank"
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4',
                  px: '5',
                  py: '3',
                  borderBottomWidth: i < recentPosts.length - 1 ? '1px' : '0',
                  borderColor: 'ink.border',
                  transition: 'background 0.15s',
                  _hover: { bg: 'ink.50' },
                })}
              >
                <span
                  className={css({
                    flex: 1,
                    color: 'ink.950',
                    fontSize: 'sm',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {post.title}
                </span>
                <span
                  className={css({
                    color: 'ink.500',
                    fontSize: 'xs',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                  })}
                >
                  {post.date}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPage() {
  const { handleLogout } = useAdminLogout();

  return (
    <div
      className={css({
        minH: 'calc(100dvh - 128px)',
        bg: 'ink.50',
        p: { base: '4', md: '8' },
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: '6',
          pb: '5',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
          flexWrap: 'wrap',
          gap: '3',
        })}
      >
        <div>
          <p className={css({ fontSize: 'xs', fontWeight: 'bold', letterSpacing: 'widest', textTransform: 'uppercase', color: 'accent.600', mb: '1' })}>
            Admin
          </p>
          <h1 className={css({ fontSize: 'xl', fontWeight: 'bold', color: 'ink.950' })}>
            대시보드
          </h1>
        </div>

        <div className={css({ display: 'flex', alignItems: 'center', gap: '2' })}>
          <Link
            href="/admin/analytics"
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.5',
              px: '3',
              py: '1.5',
              color: 'accent.600',
              fontWeight: 'medium',
              fontSize: 'sm',
              rounded: 'md',
              transition: 'background 0.15s',
              _hover: { bg: 'accent.50' },
            })}
          >
            <BarChart3 size={16} />
            상세 분석
          </Link>
          <button
            onClick={handleLogout}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.5',
              px: '3',
              py: '1.5',
              color: 'ink.500',
              cursor: 'pointer',
              rounded: 'md',
              fontSize: 'sm',
              transition: 'all 0.15s',
              _hover: { bg: 'red.50', color: 'red.600' },
            })}
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      <Suspense
        fallback={
          <div
            className={css({
              display: 'grid',
              gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
              gap: '4',
            })}
          >
            <LoadingPlaceholder height="140px" />
            <LoadingPlaceholder height="140px" />
            <LoadingPlaceholder height="140px" />
          </div>
        }
      >
        <AdminOverviewContent />
      </Suspense>
    </div>
  );
}
