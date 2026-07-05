'use client';

import { useMemo, useState } from 'react';
import type { PostStatDetail } from '@/src/hooks/useAdminViews';
import { computeBriefStats } from '@/src/hooks/usePostDetailStats';
import { css } from '@design-system/ui-lib/css';
import {
  ChevronDown,
  ExternalLink,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
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
import { formatMonthDayISO } from '@/lib/dates';
import { DateRangeControls, useDateFilter } from './DateRangeControls';
import { encodePostSlug } from '@/domain/post/utils';

interface Props {
  post: PostStatDetail;
}

export function PostAccordion({ post }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const briefStats = useMemo(() => computeBriefStats(post), [post]);

  const computedStatus = useMemo(() => {
    if (
      post.status === 'scheduled' &&
      post.scheduledDate &&
      new Date(post.scheduledDate) <= new Date()
    ) {
      return 'published';
    }
    return post.status;
  }, [post.status, post.scheduledDate]);

  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
  } = useDateFilter(post.trends);

  const formattedData = filteredTrends.map(d => ({
    name: formatMonthDayISO(d.view_date),
    views: d.view_count,
  }));

  const statusStyle =
    computedStatus === 'published'
      ? {
          bg: 'paper.100' as const,
          color: 'moss.600' as const,
          borderColor: 'ink.border' as const,
          label: '공개',
        }
      : computedStatus === 'draft'
        ? {
            bg: 'paper.100' as const,
            color: 'ink.500' as const,
            borderColor: 'ink.border' as const,
            label: '비공개',
          }
        : {
            bg: 'paper.100' as const,
            color: 'spot.600' as const,
            borderColor: 'ink.border' as const,
            label: post.scheduledDate
              ? new Date(post.scheduledDate).toLocaleDateString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                })
              : '예약',
          };

  return (
    <div
      className={css({
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
        _last: { borderBottomWidth: '0' },
      })}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={css({
          w: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: '5',
          py: '3',
          bg: isOpen ? 'ink.50' : 'transparent',
          transition: '[background 0.15s]',
          _hover: { bg: 'ink.50' },
          cursor: 'pointer',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '3',
            flex: '1',
            overflow: 'hidden',
          })}
        >
          <Link
            href={`/admin/analytics/${post.slug}`}
            onClick={e => e.stopPropagation()}
            className={css({
              color: 'ink.500',
              _hover: { color: 'spot.600' },
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            })}
          >
            <BarChart3 size={14} />
          </Link>
          <Link
            href={`/posts/${encodePostSlug(post.slug)}/`}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className={css({
              color: 'ink.200',
              _hover: { color: 'spot.600' },
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            })}
          >
            <ExternalLink size={12} />
          </Link>
          {computedStatus && (
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'semibold',
                px: '2',
                py: '0.5',
                rounded: 'full',
                flexShrink: 0,
                bg: statusStyle.bg,
                color: statusStyle.color,
                borderWidth: '[1px]',
                borderColor: statusStyle.borderColor,
              })}
              title={
                computedStatus === 'scheduled' && post.scheduledDate
                  ? `예약: ${new Date(post.scheduledDate).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                  : undefined
              }
            >
              {statusStyle.label}
            </span>
          )}
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
        </div>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '3',
            ml: '4',
            flexShrink: 0,
          })}
        >
          <div
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
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={css({
              color: 'ink.500',
              display: 'flex',
              alignItems: 'center',
            })}
          >
            <ChevronDown size={16} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
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
                  {briefStats.weekGrowthRate !== null &&
                  briefStats.weekGrowthRate >= 0 ? (
                    <TrendingUp
                      size={13}
                      className={css({ color: 'moss.600' })}
                    />
                  ) : (
                    <TrendingDown
                      size={13}
                      className={css({ color: 'spot.600' })}
                    />
                  )}
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
