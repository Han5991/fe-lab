'use client';

import { Suspense } from 'react';
import { LogOut, BarChart3, FileText } from 'lucide-react';
import { css, cx } from '@blog/styled-system/css';
import { railGutter, railColumn } from '@/src/components/Rail';
import { TIMEZONE } from '@/content.values.mts';
import { useAdminDashboardData } from '@/src/hooks/useAdminViews';
import { countLivePosts } from '@/src/domain/analytics/admin';
import { useAdminLogout } from '@/src/hooks/useAdminLogout';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import Link from 'next/link';
import { resolvePostState, type PostStatus } from '@blog/content/client';
import {
  ADMIN_ANALYTICS_PATH,
  adminAnalyticsPostPath,
} from '@/src/shared/routes';
import { STATUS_BADGE, livePostHref } from './components/postState';

/** 목록 한 줄이 여는 곳 — 공개 글은 실제 글(새 탭), 비공개 글은 그 글의 admin 통계. */
function postLink(
  slug: string,
  state: PostStatus,
): { href: string; target?: '_blank'; rel?: string } {
  const live = livePostHref(slug, state);
  return live
    ? { href: live, target: '_blank', rel: 'noopener noreferrer' }
    : { href: adminAnalyticsPostPath(slug) };
}

function HiddenBadge({ state }: { state: PostStatus }) {
  if (state === 'published') return null;
  return (
    <span
      className={css({
        fontSize: 'xs',
        fontWeight: 'semibold',
        color: 'ink.500',
        px: '1.5',
        rounded: 'full',
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        flexShrink: 0,
      })}
    >
      {STATUS_BADGE[state].label}
    </span>
  );
}

function AdminOverviewContent() {
  const { data } = useAdminDashboardData();

  const totalViews = data.reduce((acc, curr) => acc + curr.totalViews, 0);
  const totalTodayViews = data.reduce((acc, curr) => acc + curr.todayViews, 0);
  // /admin/analytics의 POSTS PUBLISHED와 같은 규칙(지금 공개 중인 글)으로 센다.
  const livePosts = countLivePosts(data, { timezone: TIMEZONE });
  const hiddenPosts = data.length - livePosts;

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
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'container',
            p: '6',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '4',
            })}
          >
            <BarChart3 size={16} className={css({ color: 'spot.600' })} />
            <span
              className={css({
                fontSize: 'xs',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              전체 조회수
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '2',
            })}
          >
            <span
              className={css({
                fontSize: '2xl',
                fontWeight: 'bold',
                color: 'ink.950',
                letterSpacing: 'tight',
              })}
            >
              {totalViews.toLocaleString()}
            </span>
            <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
              회
            </span>
            {totalTodayViews > 0 && (
              <span
                className={css({
                  color: 'spot.600',
                  fontWeight: 'bold',
                  fontSize: 'sm',
                })}
              >
                +{totalTodayViews}
              </span>
            )}
          </div>
        </div>

        {/* 총 게시글 */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'container',
            p: '6',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '4',
            })}
          >
            <FileText size={16} className={css({ color: 'spot.600' })} />
            <span
              className={css({
                fontSize: 'xs',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              공개 게시글 수
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '2',
            })}
          >
            <span
              className={css({
                fontSize: '2xl',
                fontWeight: 'bold',
                color: 'ink.950',
                letterSpacing: 'tight',
              })}
            >
              {livePosts}
            </span>
            <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
              개
            </span>
            {hiddenPosts > 0 && (
              <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                · 비공개·예약 {hiddenPosts}개
              </span>
            )}
          </div>
        </div>

        {/* 상세 분석 링크 */}
        <Link
          href={ADMIN_ANALYTICS_PATH}
          className={css({
            bg: 'paper.200',
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'container',
            p: '6',
            display: 'flex',
            flexDir: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3',
            transition: 'opacity',
            _hover: { opacity: '0.85' },
          })}
        >
          <BarChart3 size={24} className={css({ color: 'ink.950' })} />
          <span
            className={css({
              color: 'ink.950',
              fontWeight: 'semibold',
              fontSize: 'sm',
            })}
          >
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
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'container',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              px: '5',
              py: '4',
              borderBottomWidth: 'hairline',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              gap: '3',
            })}
          >
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                color: 'spot.600',
                letterSpacing: 'widest',
                textTransform: 'uppercase',
              })}
            >
              Top
            </span>
            <h2
              className={css({
                fontWeight: 'bold',
                color: 'ink.950',
                fontSize: 'sm',
              })}
            >
              인기 게시글
            </h2>
          </div>
          <div>
            {topPosts.map((post, i) => {
              const state = resolvePostState(post, TIMEZONE);
              return (
                <Link
                  key={post.slug}
                  {...postLink(post.slug, state)}
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4',
                    px: '5',
                    py: '3',
                    borderBottomWidth:
                      i < topPosts.length - 1 ? 'hairline' : 'none',
                    borderColor: 'ink.border',
                    transition: 'colors',
                    _hover: { bg: 'ink.50' },
                  })}
                >
                  <span
                    className={css({
                      fontWeight: 'bold',
                      color: 'spot.600',
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
                      flex: '1',
                      color: 'ink.950',
                      fontSize: 'sm',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    {post.title}
                  </span>
                  <HiddenBadge state={state} />
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
              );
            })}
          </div>
        </div>

        {/* Recent Posts */}
        <div
          className={css({
            bg: 'ink.25',
            borderWidth: 'hairline',
            borderColor: 'ink.border',
            rounded: 'container',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              px: '5',
              py: '4',
              borderBottomWidth: 'hairline',
              borderColor: 'ink.border',
              display: 'flex',
              alignItems: 'baseline',
              gap: '3',
            })}
          >
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                color: 'spot.600',
                letterSpacing: 'widest',
                textTransform: 'uppercase',
              })}
            >
              Recent
            </span>
            <h2
              className={css({
                fontWeight: 'bold',
                color: 'ink.950',
                fontSize: 'sm',
              })}
            >
              최근 게시글
            </h2>
          </div>
          <div>
            {recentPosts.map((post, i) => {
              const state = resolvePostState(post, TIMEZONE);
              return (
                <Link
                  key={post.slug}
                  {...postLink(post.slug, state)}
                  className={css({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4',
                    px: '5',
                    py: '3',
                    borderBottomWidth:
                      i < recentPosts.length - 1 ? 'hairline' : 'none',
                    borderColor: 'ink.border',
                    transition: 'colors',
                    _hover: { bg: 'ink.50' },
                  })}
                >
                  <span
                    className={css({
                      flex: '1',
                      color: 'ink.950',
                      fontSize: 'sm',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    })}
                  >
                    {post.title}
                  </span>
                  <HiddenBadge state={state} />
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
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminPage() {
  const { handleLogout } = useAdminLogout();

  return (
    // 배경은 화면 끝까지, 내용은 /admin/analytics와 같은 wide 레일.
    // 세로 여백은 레일과 무관하므로 바깥에 남긴다. 높이는 채우지 않는다 — 푸터를 바닥에 붙이는
    // 일은 Layout(flex 열, main flex 1)이 한다. 예전의 최소 높이 calc(100dvh - 128px)는 헤더·푸터
    // 높이를 손으로 뺀 값이라 셸이 바뀌면 어긋났다. 그래서 내용이 화면보다 짧으면(로딩 중, 큰 화면)
    // 회색 면이 내용에서 끝나고 그 아래로 지면색이 보인다.
    <div
      className={cx(
        css({
          bg: 'ink.50',
          py: { base: '4', md: '8' },
        }),
        railGutter,
      )}
    >
      <div className={railColumn({ width: 'wide' })}>
        <header
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: '6',
            pb: '5',
            borderBottomWidth: 'hairline',
            borderColor: 'ink.border',
            flexWrap: 'wrap',
            gap: '3',
          })}
        >
          <div>
            <p
              className={css({
                fontSize: 'xs',
                fontWeight: 'bold',
                letterSpacing: 'widest',
                textTransform: 'uppercase',
                color: 'spot.600',
                mb: '1',
              })}
            >
              Admin
            </p>
            <h1
              className={css({
                fontSize: 'xl',
                fontWeight: 'bold',
                color: 'ink.950',
              })}
            >
              대시보드
            </h1>
          </div>

          <div
            className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
          >
            <Link
              href={ADMIN_ANALYTICS_PATH}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1.5',
                px: '3',
                py: '1.5',
                color: 'spot.600',
                fontWeight: 'medium',
                fontSize: 'sm',
                rounded: 'full',
                transition: 'colors',
                _hover: { bg: 'paper.100' },
              })}
            >
              <BarChart3 size={16} />
              상세 분석
            </Link>
            <button
              onClick={() => void handleLogout()}
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '1.5',
                px: '3',
                py: '1.5',
                color: 'ink.500',
                cursor: 'pointer',
                rounded: 'full',
                fontSize: 'sm',
                transition: 'colors',
                _hover: { bg: 'paper.200', color: 'ink.900' },
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
    </div>
  );
}
