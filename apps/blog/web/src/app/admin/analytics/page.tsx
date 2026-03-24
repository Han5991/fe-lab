'use client';

import { Suspense } from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import { css } from '@design-system/ui-lib/css';
import { GlobalViewsChart } from '../components/GlobalViewsChart';
import { PostList } from '../components/PostList';
import { useAdminDashboardData } from '@/lib/hooks/useAdminViews';
import { useAdminLogout } from '@/lib/hooks/useAdminLogout';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import Link from 'next/link';

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
        gap: '5',
        ml: 'auto',
        mr: '4',
      })}
    >
      <div className={css({ display: 'flex', alignItems: 'baseline', gap: '1.5' })}>
        <span className={css({ color: 'ink.500', fontSize: 'xs' })}>총 게시글</span>
        <span className={css({ fontWeight: 'bold', color: 'ink.950', fontSize: 'sm', fontVariantNumeric: 'tabular-nums' })}>
          {totalPosts}개
        </span>
      </div>
      <div className={css({ w: '1px', h: '16px', bg: 'ink.border' })} />
      <div className={css({ display: 'flex', alignItems: 'baseline', gap: '1.5' })}>
        <span className={css({ color: 'ink.500', fontSize: 'xs' })}>전체 조회수</span>
        <span className={css({ fontWeight: 'bold', color: 'ink.950', fontSize: 'sm', fontVariantNumeric: 'tabular-nums' })}>
          {totalViews.toLocaleString()}회
        </span>
        {totalTodayViews > 0 && (
          <span className={css({ color: 'accent.600', fontWeight: 'bold', fontSize: 'xs' })}>
            +{totalTodayViews}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
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
          mb: '6',
          pb: '5',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
          flexWrap: 'wrap',
          gap: '3',
        })}
      >
        <div className={css({ display: 'flex', alignItems: 'center', gap: '4' })}>
          <Link
            href="/admin"
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1',
              color: 'ink.500',
              fontSize: 'sm',
              _hover: { color: 'accent.600' },
              transition: 'color 0.15s',
            })}
          >
            <ArrowLeft size={15} />
            대시보드
          </Link>
          <div className={css({ w: '1px', h: '16px', bg: 'ink.border' })} />
          <h1 className={css({ fontSize: 'base', fontWeight: 'bold', color: 'ink.950' })}>
            조회수 분석
          </h1>
        </div>

        <Suspense
          fallback={
            <div
              className={css({
                ml: 'auto',
                mr: '4',
                w: '200px',
                h: '5',
                bg: 'ink.100',
                rounded: 'sm',
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
      </header>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '4' })}>
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
