'use client';

import { Suspense } from 'react';
import { LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { css, cx } from '@design-system/ui-lib/css';

import { railGutter, railColumn } from '@/src/components/Rail';
import { useAdminLogout } from '@/src/hooks/useAdminLogout';
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
        minH: '[calc(100dvh - 128px)]',
        bg: 'paper.50',
      })}
    >
      {/* Admin top strip — 배경 띠는 화면 끝까지, 내용은 아래 헤더·본문과
          같은 wide 레일. 레일을 씌우지 않으면 로그아웃 버튼만 화면 맨 오른쪽에
          붙어 바로 아래 헤더의 우측 정렬선과 어긋난다. */}
      <div
        className={cx(
          railGutter,
          css({
            bg: 'paper.100',
            borderBottomWidth: '[1px]',
            borderBottomStyle: 'solid',
            borderColor: 'ink.border',
          }),
        )}
      >
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({
              py: '2.5',
              display: 'flex',
              alignItems: 'center',
              gap: '3',
              flexWrap: 'wrap',
            }),
          )}
        >
          <span
            className={css({
              fontSize: 'md',
              fontWeight: 'semibold',
              color: 'ink.950',
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
              rounded: '[2rem]',
              bg: 'accent.50',
              color: 'accent.600',
              letterSpacing: 'mono',
              textTransform: 'uppercase',
            })}
          >
            ADMIN
          </span>
          <span className={css({ flex: '1' })} />
          <Link
            href="/admin/"
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1',
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.600',
              transition: '[color 0.15s]',
              _hover: { color: 'ink.950' },
            })}
          >
            <ArrowLeft size={13} />
            대시보드
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '1',
              fontFamily: 'mono',
              fontSize: 'xs',
              color: 'ink.600',
              cursor: 'pointer',
              transition: '[color 0.15s]',
              _hover: { color: 'ink.950' },
            })}
          >
            <LogOut size={13} />
            로그아웃
          </button>
        </div>
      </div>

      {/* Page header */}
      <div className={railGutter}>
        <header
          className={cx(
            railColumn({ width: 'wide' }),
            css({
              py: { base: '8', md: '10' },
              borderBottomWidth: '[1px]',
              borderColor: 'ink.border',
            }),
          )}
        >
          <Label tone="meta" className={css({ display: 'block', mb: '2' })}>
            ANALYTICS / OVERVIEW
          </Label>
          <h1
            className={css({
              fontFamily: 'serif',
              fontSize: { base: '3xl', md: '4xl' },
              fontWeight: 'medium',
              letterSpacing: 'tightSm',
              color: 'ink.950',
            })}
          >
            독자들이 무엇을 읽고 있는가
          </h1>
        </header>
      </div>

      <div className={railGutter}>
        <main
          className={cx(
            railColumn({ width: 'wide' }),
            css({
              py: { base: '8', md: '10' },
              display: 'flex',
              flexDir: 'column',
              gap: '12',
            }),
          )}
        >
          <Suspense fallback={<LoadingPlaceholder height="600px" />}>
            <TagAwareAnalytics />
          </Suspense>

          {/* Detailed post list — 기존 도구 유지 */}
          <section
            className={css({
              pt: '10',
              borderTopWidth: '[1px]',
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
    </div>
  );
}
