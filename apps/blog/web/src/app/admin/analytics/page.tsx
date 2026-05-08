'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { css } from '@design-system/ui-lib/css';

import { useAdminLogout } from '@/lib/hooks/useAdminLogout';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import { Label } from '@/src/components/blog/Label';

import { AnalyticsContent } from './AnalyticsContent';
import { useAdminTagDistribution } from './useAdminTagDistribution';
import { PostList } from '../components/PostList';

function TagAwareAnalytics() {
  const tags = useAdminTagDistribution();
  return <AnalyticsContent tags={tags} />;
}

export default function AdminAnalyticsPage() {
  const { handleLogout } = useAdminLogout();

  return (
    <div
      className={css({
        minH: 'calc(100dvh - 128px)',
        bg: 'paper.50',
      })}
    >
      {/* Admin top strip */}
      <div
        className={css({
          bg: 'ink.950',
          color: 'paper.50',
          px: { base: '4', md: '8' },
          py: '2.5',
          display: 'flex',
          alignItems: 'center',
          gap: '3',
          flexWrap: 'wrap',
        })}
      >
        <span
          className={css({
            fontFamily: 'serif',
            fontStyle: 'italic',
            fontSize: 'base',
            fontWeight: '600',
          })}
        >
          Frontend Lab
        </span>
        <span
          className={css({
            fontFamily: 'mono',
            fontSize: '2xs',
            px: '1.5',
            py: '0.5',
            bg: 'marker.300',
            color: 'ink.950',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          })}
        >
          ADMIN
        </span>
        <span className={css({ flex: 1 })} />
        <Link
          href="/admin"
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1',
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.300',
            transition: 'color 0.15s',
            _hover: { color: 'paper.50' },
          })}
        >
          <ArrowLeft size={13} />
          대시보드
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1',
            fontFamily: 'mono',
            fontSize: 'xs',
            color: 'ink.300',
            cursor: 'pointer',
            transition: 'color 0.15s',
            _hover: { color: 'marker.300' },
          })}
        >
          <LogOut size={13} />
          로그아웃
        </button>
      </div>

      {/* Page header */}
      <header
        className={css({
          maxW: '1280px',
          mx: 'auto',
          px: { base: '4', md: '8' },
          py: { base: '8', md: '10' },
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
        })}
      >
        <Label tone="meta" className={css({ display: 'block', mb: '2' })}>
          ANALYTICS / OVERVIEW
        </Label>
        <h1
          className={css({
            fontFamily: 'serif',
            fontSize: { base: '3xl', md: '4xl' },
            fontWeight: '500',
            letterSpacing: '-0.015em',
            color: 'ink.950',
          })}
        >
          독자들이 무엇을 읽고 있는가
        </h1>
      </header>

      <main
        className={css({
          maxW: '1280px',
          mx: 'auto',
          px: { base: '4', md: '8' },
          py: { base: '8', md: '10' },
          display: 'flex',
          flexDir: 'column',
          gap: '12',
        })}
      >
        <Suspense fallback={<LoadingPlaceholder height="600px" />}>
          <TagAwareAnalytics />
        </Suspense>

        {/* Detailed post list — 기존 도구 유지 */}
        <section
          className={css({
            pt: '10',
            borderTopWidth: '1px',
            borderColor: 'ink.border',
            display: 'flex',
            flexDir: 'column',
            gap: '4',
          })}
        >
          <Label tone="meta">ALL POSTS · 상세</Label>
          <Suspense fallback={<LoadingPlaceholder height="400px" />}>
            <PostList />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
