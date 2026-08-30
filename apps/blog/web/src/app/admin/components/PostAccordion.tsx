'use client';

import { TIMEZONE } from '@/content.values.mts';
import { getKSTDateISO } from '@blog/content';
import { useState } from 'react';
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
import { formatMonthDayISO, parseScheduledDateKST } from '@blog/content';
import { DateRangeControls, useDateFilter } from './DateRangeControls';
import { adminAnalyticsPostPath } from '@/src/shared/routes';
// 클라이언트 컴포넌트의 @blog/content 배럴 import — node:fs 모듈(series 등)은
// next.config.ts의 optimizePackageImports + sideEffects:false가 번들에서 걸러 준다.
import { postPath } from '@blog/content';
import { resolvePostState, type PostStatus } from '@blog/content';

/**
 * 상태 배지의 색과 라벨. 배지는 **상태만** 말합니다 — 공개 예정일은 옆 날짜
 * 칼럼에 이미 있고, 예약 글의 정확한 시각은 title 툴팁이 답합니다.
 *
 * 삼항 체인이 아니라 레코드인 건 망라 때문입니다. 체인의 마지막 가지는 남은
 * 상태를 전부 받아서, `PostStatus`가 늘면 새 상태가 조용히 '예약'으로 그려집니다.
 * `satisfies`가 그 자리를 컴파일 에러로 만듭니다.
 *
 * 배경·테두리는 세 상태가 같은 값이라 여기 두지 않습니다 — 상태에 따라 달라지는
 * 축만 남겨야 배지가 무엇으로 갈리는지가 읽힙니다.
 */
const STATUS_BADGE = {
  published: { color: 'moss.600', label: '공개' },
  draft: { color: 'ink.500', label: '비공개' },
  scheduled: { color: 'spot.600', label: '예약' },
} as const satisfies Record<PostStatus, { color: string; label: string }>;

interface Props {
  post: PostStatDetail;
}

export function PostAccordion({ post }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const briefStats = computeBriefStats(post, getKSTDateISO(TIMEZONE));

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
  } = useDateFilter(post.trends);

  const formattedData = filteredTrends.map(d => ({
    name: formatMonthDayISO(d.view_date),
    views: d.view_count,
  }));

  const badge = STATUS_BADGE[state];

  return (
    <div
      className={css({
        borderBottomWidth: '[1px]',
        borderColor: 'ink.border',
        _last: { borderBottomWidth: '[0]' },
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
            href={adminAnalyticsPostPath(post.slug)}
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
            href={postPath(post.slug)}
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
