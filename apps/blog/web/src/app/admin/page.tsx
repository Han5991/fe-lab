'use client';

import { Suspense } from 'react';
import { client } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { LogOut, BarChart3, FileText, Clock } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { useAdminDashboardData } from '@/lib/hooks/useAdminViews';
import Link from 'next/link';

function LoadingPlaceholder({ height }: { height?: string }) {
  return (
    <div
      className={css({
        w: '100%',
        h: height || '100%',
        bg: '#f3f4f6',
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        rounded: '8px',
      })}
    />
  );
}

function AdminOverviewContent() {
  const { data } = useAdminDashboardData();

  const totalViews = data.reduce((acc, curr) => acc + curr.totalViews, 0);
  const totalTodayViews = data.reduce((acc, curr) => acc + curr.todayViews, 0);
  const totalPosts = data.length;

  // Top 5 posts by views
  const topPosts = [...data]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);

  // Recent 5 posts by date
  const recentPosts = [...data]
    .filter(p => p.date)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 5);

  return (
    <>
      {/* Stats Cards */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', md: 'repeat(3, 1fr)' },
          gap: '1.5rem',
          mb: '2rem',
        })}
      >
        <div
          className={css({
            bg: 'white',
            p: '2rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              mb: '1rem',
            })}
          >
            <div
              className={css({ p: '0.625rem', bg: '#eff6ff', rounded: '8px' })}
            >
              <BarChart3 size={20} className={css({ color: '#3b82f6' })} />
            </div>
            <span
              className={css({
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              전체 조회수
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
            })}
          >
            <span
              className={css({
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#111827',
              })}
            >
              {totalViews.toLocaleString()}
            </span>
            <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
              회
            </span>
            {totalTodayViews > 0 && (
              <span
                className={css({
                  color: '#3b82f6',
                  fontWeight: 'bold',
                  fontSize: '0.875rem',
                  ml: '0.25rem',
                })}
              >
                ↑ {totalTodayViews}
              </span>
            )}
          </div>
        </div>

        <div
          className={css({
            bg: 'white',
            p: '2rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              mb: '1rem',
            })}
          >
            <div
              className={css({ p: '0.625rem', bg: '#eff6ff', rounded: '8px' })}
            >
              <FileText size={20} className={css({ color: '#3b82f6' })} />
            </div>
            <span
              className={css({
                fontSize: '0.875rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              총 게시글 수
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
            })}
          >
            <span
              className={css({
                fontSize: '2rem',
                fontWeight: 'bold',
                color: '#111827',
              })}
            >
              {totalPosts}
            </span>
            <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
              개
            </span>
          </div>
        </div>

        <Link
          href="/admin/analytics"
          className={css({
            bg: '#3b82f6',
            p: '2rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            transition: 'background-color 0.2s',
            _hover: { bg: '#2563eb' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            textDecoration: 'none',
          })}
        >
          <BarChart3 size={28} className={css({ color: 'white' })} />
          <span
            className={css({
              color: 'white',
              fontWeight: '600',
              fontSize: '1rem',
            })}
          >
            상세 분석 보기 →
          </span>
        </Link>
      </div>

      {/* Content Grid */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
          gap: '1.5rem',
        })}
      >
        {/* Top Posts */}
        <div
          className={css({
            bg: 'white',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({ p: '1.5rem', borderBottom: '1px solid #e5e7eb' })}
          >
            <h2
              className={css({
                fontWeight: 'bold',
                color: '#111827',
                fontSize: '1.125rem',
              })}
            >
              🏆 인기 게시글 TOP 5
            </h2>
          </div>
          <div>
            {topPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                target="_blank"
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  p: '1rem 1.5rem',
                  borderBottom:
                    i < topPosts.length - 1 ? '1px solid #f3f4f6' : 'none',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s',
                  _hover: { bg: '#f9fafb' },
                })}
              >
                <span
                  className={css({
                    fontWeight: 'bold',
                    color: '#3b82f6',
                    fontSize: '1.25rem',
                    w: '2rem',
                    textAlign: 'center',
                  })}
                >
                  {i + 1}
                </span>
                <span
                  className={css({
                    flex: 1,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {post.title}
                </span>
                <span
                  className={css({
                    fontWeight: 'bold',
                    color: '#374151',
                    flexShrink: 0,
                  })}
                >
                  {post.totalViews.toLocaleString()}회
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Posts */}
        <div
          className={css({
            bg: 'white',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({ p: '1.5rem', borderBottom: '1px solid #e5e7eb' })}
          >
            <h2
              className={css({
                fontWeight: 'bold',
                color: '#111827',
                fontSize: '1.125rem',
              })}
            >
              📝 최근 게시글
            </h2>
          </div>
          <div>
            {recentPosts.map((post, i) => (
              <Link
                key={post.slug}
                href={`/posts/${post.slug}`}
                target="_blank"
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  p: '1rem 1.5rem',
                  borderBottom:
                    i < recentPosts.length - 1 ? '1px solid #f3f4f6' : 'none',
                  textDecoration: 'none',
                  transition: 'background-color 0.15s',
                  _hover: { bg: '#f9fafb' },
                })}
              >
                <Clock
                  size={16}
                  className={css({ color: '#9ca3af', flexShrink: 0 })}
                />
                <span
                  className={css({
                    flex: 1,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {post.title}
                </span>
                <span
                  className={css({
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                    flexShrink: 0,
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
  const router = useRouter();

  const handleLogout = async () => {
    await client.auth.signOut({ scope: 'local' });
    router.push('/admin/login');
  };

  return (
    <div
      className={css({
        minH: 'calc(100dvh-128px)',
        bg: '#f9fafb',
        p: { base: '1rem', md: '2rem' },
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: '2rem',
          bg: 'white',
          p: { base: '0.75rem 1rem', md: '1rem 2rem' },
          rounded: '8px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        })}
      >
        <h1
          className={css({
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
          })}
        >
          관리자 대시보드
        </h1>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          })}
        >
          <Link
            href="/admin/analytics"
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              p: '0.5rem 1rem',
              color: '#3b82f6',
              fontWeight: '500',
              fontSize: '0.875rem',
              rounded: '4px',
              textDecoration: 'none',
              transition: 'background-color 0.2s',
              _hover: { bg: '#eff6ff' },
            })}
          >
            <BarChart3 size={18} />
            상세 분석
          </Link>
          <button
            onClick={handleLogout}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              p: '0.5rem 1rem',
              color: '#4b5563',
              cursor: 'pointer',
              rounded: '4px',
              transition: 'background-color 0.2s',
              _hover: { bg: '#f3f4f6', color: '#ef4444' },
            })}
          >
            <LogOut size={18} />
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
              gap: '1.5rem',
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
