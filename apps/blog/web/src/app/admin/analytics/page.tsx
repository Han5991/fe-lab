'use client';

import { Suspense } from 'react';
import { client } from '@/lib/client';
import { useRouter } from 'next/navigation';
import { LogOut, ArrowLeft } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { GlobalViewsChart } from '../components/GlobalViewsChart';
import { PostList } from '../components/PostList';
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

function AdminHeaderStats() {
  const { data } = useAdminDashboardData();
  const totalViews = data.reduce((acc, curr) => acc + curr.totalViews, 0);
  const totalTodayViews = data.reduce((acc, curr) => acc + curr.todayViews, 0);
  const totalPosts = data.length;

  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        ml: 'auto',
        mr: '2rem',
      })}
    >
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
        })}
      >
        <span className={css({ color: '#6b7280', fontSize: '0.875rem' })}>
          총 게시글
        </span>
        <span
          className={css({
            fontWeight: 'bold',
            color: '#111827',
            fontSize: '1rem',
          })}
        >
          {totalPosts}개
        </span>
      </div>
      <div className={css({ w: '1px', h: '16px', bg: '#e5e7eb' })} />
      <div
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.5rem',
        })}
      >
        <span className={css({ color: '#6b7280', fontSize: '0.875rem' })}>
          전체 조회수
        </span>
        <span
          className={css({
            fontWeight: 'bold',
            color: '#111827',
            fontSize: '1rem',
          })}
        >
          {totalViews.toLocaleString()}회
        </span>
        {totalTodayViews > 0 && (
          <span
            className={css({
              color: '#3b82f6',
              fontWeight: 'bold',
              fontSize: '0.875rem',
            })}
          >
            ↑ {totalTodayViews}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
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
          mb: '2rem',
          bg: 'white',
          p: { base: '0.75rem 1rem', md: '1rem 2rem' },
          rounded: '8px',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          flexWrap: 'wrap',
          gap: '0.5rem',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          })}
        >
          <Link
            href="/admin"
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              textDecoration: 'none',
              _hover: { color: '#3b82f6' },
            })}
          >
            <ArrowLeft size={16} />
            대시보드
          </Link>
          <h1
            className={css({
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
            })}
          >
            조회수 분석
          </h1>
        </div>

        <Suspense
          fallback={
            <div
              className={css({
                ml: 'auto',
                mr: '2rem',
                w: '250px',
                h: '24px',
                bg: '#f3f4f6',
                rounded: '4px',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              })}
            />
          }
        >
          <AdminHeaderStats />
        </Suspense>

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
      </header>

      <div className={css({ display: 'flex', flexDirection: 'column' })}>
        <Suspense fallback={<LoadingPlaceholder height="400px" />}>
          <GlobalViewsChart />
        </Suspense>

        <Suspense fallback={<LoadingPlaceholder height="600px" />}>
          <PostList />
        </Suspense>
      </div>
    </div>
  );
}
