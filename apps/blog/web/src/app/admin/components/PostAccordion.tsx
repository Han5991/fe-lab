'use client';

import { TIMEZONE } from '@/content.values.mts';
import { useId, useState } from 'react';
import type { PostStatDetail } from '@/src/hooks/useAdminViews';
import { computeBriefStats } from '@/src/hooks/usePostDetailStats';
import { css } from '@design-system/ui-lib/css';
import { ChevronDown, ExternalLink, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { token } from '@design-system/ui-lib/tokens';
import { motion, AnimatePresence } from 'motion/react';
import { formatMonthDayISO, parseScheduledDateKST } from '@blog/content';
import { DateRangeControls, useDateFilter } from './DateRangeControls';
import { WeekGrowthIcon } from './WeekGrowthIcon';
import { adminAnalyticsPostPath } from '@/src/shared/routes';
// 클라이언트 컴포넌트의 @blog/content 배럴 import — node:fs 모듈(series 등)은
// next.config.ts의 optimizePackageImports + sideEffects:false가 번들에서 걸러 준다.
import { resolvePostState } from '@blog/content';
import { STATUS_BADGE, livePostHref } from './postState';

interface Props {
  post: PostStatDetail;
  /** KST 오늘 — 목록이 한 번 계산해 모든 행에 내려 준다. */
  todayISO: string;
}

export function PostAccordion({ post, todayISO }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const briefStats = computeBriefStats(post, todayISO);

  // frontmatter의 status(발행 의도)가 아니라 **지금 실제로 공개 중인지**로 배지를
  // 그립니다. 판정은 도메인 함수 하나에 위임합니다 — 예전에는 이 자리에서 규칙을
  // 다시 구현하다 `date` 폴백과 KST 파싱을 둘 다 놓쳤습니다.
  const state = resolvePostState(post, TIMEZONE);
  // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드라 보통은 date가 공개 시각입니다.
  const publishAt = post.scheduledDate ?? post.date;

  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
  } = useDateFilter(post.trends, todayISO);

  const formattedData = filteredTrends.map(d => ({
    name: formatMonthDayISO(d.view_date),
    views: d.view_count,
  }));

  // 배지는 상태만 말한다 — 공개 예정일은 옆 날짜 칼럼에, 예약 시각은 툴팁에 있다.
  const badge = STATUS_BADGE[state];
  const liveHref = livePostHref(post.slug, state);

  return (
    <div
      className={css({
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
        _last: { borderBottomWidth: '[0]' },
      })}
    >
      {/* 링크와 펼침 버튼은 형제다 — 버튼 안에는 대화형 요소가 올 수 없다. */}
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '3',
          pl: '5',
          bg: isOpen ? 'ink.50' : 'transparent',
          transition: '[background 0.15s]',
          _hover: { bg: 'ink.50' },
        })}
      >
        <Link
          href={adminAnalyticsPostPath(post.slug)}
          aria-label={`${post.title} 상세 통계`}
          className={css({
            color: 'ink.500',
            _hover: { color: 'spot.600' },
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          })}
        >
          <BarChart3 size={14} aria-hidden />
        </Link>
        {liveHref && (
          <Link
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${post.title} 글을 새 탭에서 열기`}
            className={css({
              color: 'ink.200',
              _hover: { color: 'spot.600' },
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            })}
          >
            <ExternalLink size={12} aria-hidden />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={isOpen ? panelId : undefined}
          className={css({
            flex: '1',
            minW: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pr: '5',
            py: '3',
            cursor: 'pointer',
          })}
        >
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '3',
              flex: '1',
              overflow: 'hidden',
            })}
          >
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'semibold',
                px: '2',
                py: '0.5',
                rounded: 'full',
                flexShrink: 0,
                bg: 'paper.100',
                color: badge.color,
                borderWidth: '[1px]',
                borderColor: 'ink.border',
              })}
              title={
                state === 'scheduled' && publishAt
                  ? // 'YYYY-MM-DD'를 native Date에 넣으면 UTC 자정으로 파싱돼
                    // KST 09:00으로 잘못 표시됩니다.
                    `예약: ${parseScheduledDateKST(TIMEZONE, publishAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                  : undefined
              }
            >
              {badge.label}
            </span>
            <span
              className={css({
                fontWeight: 'semibold',
                color: 'ink.950',
                fontSize: 'sm',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left',
              })}
            >
              {post.title}
            </span>
            <span
              className={css({
                color: 'ink.500',
                fontSize: 'xs',
                flexShrink: 0,
                display: { base: 'none', md: 'inline' },
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {post.date}
            </span>
          </span>

          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '3',
              ml: '4',
              flexShrink: 0,
            })}
          >
            <span
              className={css({
                display: 'flex',
                alignItems: 'baseline',
                gap: '1',
                minW: '[80px]',
                justifyContent: 'flex-end',
              })}
            >
              <span
                className={css({
                  fontWeight: 'bold',
                  color: 'ink.950',
                  fontSize: 'sm',
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                {post.totalViews.toLocaleString()}
              </span>
              {post.todayViews > 0 && (
                <span
                  className={css({
                    color: 'spot.600',
                    fontSize: 'xs',
                    fontWeight: 'medium',
                  })}
                >
                  +{post.todayViews}
                </span>
              )}
            </span>

            <motion.span
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              aria-hidden
              className={css({
                color: 'ink.500',
                display: 'flex',
                alignItems: 'center',
              })}
            >
              <ChevronDown size={16} />
            </motion.span>
          </span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className={css({ overflow: 'hidden' })}
          >
            <div
              className={css({
                p: '5',
                bg: 'ink.50',
                borderTopWidth: '[1px]',
                borderColor: 'ink.border',
              })}
            >
              {/* Brief stats */}
              <div
                className={css({
                  display: 'grid',
                  gridTemplateColumns: { base: '1fr', sm: 'repeat(3, 1fr)' },
                  gap: '3',
                  mb: '4',
                })}
              >
                {/* 7일 증감 */}
                <div
                  className={css({
                    bg: 'ink.25',
                    p: '3',
                    rounded: 'lg',
                    borderWidth: '[1px]',
                    borderColor: 'ink.border',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                  })}
                >
                  <WeekGrowthIcon rate={briefStats.weekGrowthRate} size={13} />
                  <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                    7일 증감
                  </span>
                  <span
                    className={css({
                      fontWeight: 'bold',
                      fontSize: 'sm',
                      ml: 'auto',
                      color:
                        briefStats.weekGrowthRate !== null
                          ? briefStats.weekGrowthRate >= 0
                            ? 'moss.600'
                            : 'spot.600'
                          : 'ink.500',
                    })}
                  >
                    {briefStats.weekGrowthRate !== null
                      ? `${briefStats.weekGrowthRate >= 0 ? '+' : ''}${briefStats.weekGrowthRate}%`
                      : '—'}
                  </span>
                </div>
                {/* 피크 */}
                <div
                  className={css({
                    bg: 'ink.25',
                    p: '3',
                    rounded: 'lg',
                    borderWidth: '[1px]',
                    borderColor: 'ink.border',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                  })}
                >
                  <BarChart3
                    size={13}
                    className={css({ color: 'orange.500' })}
                  />
                  <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                    피크
                  </span>
                  <span
                    className={css({
                      fontWeight: 'bold',
                      fontSize: 'sm',
                      ml: 'auto',
                      color: 'ink.950',
                    })}
                  >
                    {briefStats.peakDay ? `${briefStats.peakDay.count}회` : '—'}
                  </span>
                  {briefStats.peakDay && (
                    <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                      {briefStats.peakDay.date}
                    </span>
                  )}
                </div>
                {/* 일평균 */}
                <div
                  className={css({
                    bg: 'ink.25',
                    p: '3',
                    rounded: 'lg',
                    borderWidth: '[1px]',
                    borderColor: 'ink.border',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2',
                  })}
                >
                  <span className={css({ fontSize: 'xs', color: 'ink.500' })}>
                    일평균
                  </span>
                  <span
                    className={css({
                      fontWeight: 'bold',
                      fontSize: 'sm',
                      ml: 'auto',
                      color: 'ink.950',
                    })}
                  >
                    {briefStats.dailyAverage}회
                  </span>
                </div>
              </div>

              {/* Date filter */}
              <div
                className={css({
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mb: '3',
                })}
              >
                <DateRangeControls
                  filterType={filterType}
                  setFilterType={setFilterType}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                />
              </div>

              <div className={css({ h: '[220px]', w: 'full' })}>
                {formattedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formattedData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="name"
                        axisLine={{ stroke: token('colors.ink.border') }}
                        tickLine={false}
                        tick={{ fill: token('colors.ink.500'), fontSize: 11 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: token('colors.ink.500'), fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{
                          stroke: token('colors.ink.border'),
                          strokeWidth: 1,
                          strokeDasharray: '4 4',
                        }}
                        contentStyle={{
                          borderRadius: token('radii.lg'),
                          border: `1px solid ${token('colors.ink.border')}`,
                          background: token('colors.ink.25'),
                          color: token('colors.ink.900'),
                          fontSize: '12px',
                        }}
                        labelStyle={{
                          color: token('colors.ink.600'),
                          marginBottom: '2px',
                        }}
                        itemStyle={{ color: token('colors.ink.800') }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke={token('colors.accent.600')}
                        strokeWidth={2}
                        dot={{
                          r: 3,
                          fill: token('colors.accent.600'),
                          strokeWidth: 0,
                        }}
                        activeDot={{
                          r: 5,
                          fill: token('colors.accent.600'),
                          strokeWidth: 0,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className={css({
                      display: 'flex',
                      h: 'full',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'ink.500',
                      fontSize: 'sm',
                    })}
                  >
                    해당 기간에 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
