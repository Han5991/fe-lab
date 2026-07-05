'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { css } from '@design-system/ui-lib/css';
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Trophy,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Link from 'next/link';
import { token } from '@design-system/ui-lib/tokens';
import { usePostDetailStats } from '@/src/hooks/usePostDetailStats';
import { encodePostSlug } from '@/domain/post/utils';
import { formatMonthDayISO } from '@/lib/dates';

// 차트 색상 — GitHub accent(파랑)로 통일. 데이터 강조는 accent 하나로.
const CHART_LINE = token('colors.accent.600');
const CHART_ACCENT = token('colors.accent.600');
const CHART_AXIS = token('colors.ink.border');
const CHART_TICK = token('colors.ink.400');
const CHART_GUIDE = token('colors.ink.300');
// rgba 알파 점진 표현용 accent.600 rgb (GitHub blue #58a6ff).
const MARKER_RGB = '88, 166, 255';
import {
  DateRangeControls,
  useDateFilter,
} from '../../components/DateRangeControls';

function LoadingPlaceholder({ height }: { height?: string }) {
  return (
    <div
      style={{ height: height ?? '100%' }}
      className={css({
        w: 'full',
        bg: 'paper.100',
        animation: '[pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite]',
        rounded: 'lg',
      })}
    />
  );
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function PostDetailContent() {
  const params = useParams();
  const slug =
    typeof params.slug === 'string'
      ? params.slug
      : Array.isArray(params.slug)
        ? params.slug.join('/')
        : '';

  const { post, hourly, dow, derived } = usePostDetailStats(slug);

  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
    autoFellBackToAll,
  } = useDateFilter(post.trends);

  const trendData = filteredTrends.map(d => ({
    name: formatMonthDayISO(d.view_date),
    views: d.view_count,
  }));

  // Fill hourly data with 0s for missing hours
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourly.find(h => h.hour === i);
    return { hour: `${i}시`, views: found?.view_count || 0 };
  });

  // Fill dow data with 0s for missing days, reorder Mon-Sun
  const dowOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 to Sun=0
  const dowData = dowOrder.map(d => {
    const found = dow.find(item => item.dow === d);
    return { day: DOW_LABELS[d], views: found?.view_count || 0 };
  });

  const maxHourlyViews = Math.max(...hourlyData.map(d => d.views), 1);
  const maxDowViews = Math.max(...dowData.map(d => d.views), 1);

  return (
    <>
      {/* Header */}
      <div
        className={css({
          bg: 'paper.100',
          p: '[1.5rem 2rem]',
          rounded: '[8px]',
          boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          mb: '6',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '3',
            mb: '4',
          })}
        >
          <h2
            className={css({
              fontSize: 'xl',
              fontWeight: 'bold',
              color: 'ink.950',
              flex: '1',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {post.title}
          </h2>
          <Link
            href={`/posts/${encodePostSlug(post.slug)}/`}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className={css({
              color: 'ink.500',
              _hover: { color: 'accent.600' },
              flexShrink: 0,
            })}
          >
            <ExternalLink size={18} />
          </Link>
        </div>

        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8',
            alignItems: 'center',
          })}
        >
          {post.date && (
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '2',
              })}
            >
              <Calendar size={16} className={css({ color: 'ink.300' })} />
              <span className={css({ fontSize: 'sm', color: 'ink.500' })}>
                {post.date}
              </span>
            </div>
          )}
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '2',
            })}
          >
            <span className={css({ fontSize: 'sm', color: 'ink.500' })}>
              총 조회수
            </span>
            <span
              className={css({
                fontWeight: 'bold',
                color: 'ink.950',
                fontSize: 'xl',
              })}
            >
              {post.totalViews.toLocaleString()}
            </span>
            <span className={css({ fontSize: 'sm', color: 'ink.500' })}>
              회
            </span>
          </div>
          {post.todayViews > 0 && (
            <span
              className={css({
                color: 'accent.600',
                fontWeight: 'bold',
                fontSize: 'sm',
              })}
            >
              오늘 +{post.todayViews}
            </span>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: {
            base: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          },
          gap: '4',
          mb: '6',
        })}
      >
        {/* 7-day growth rate */}
        <div
          className={css({
            bg: 'paper.100',
            p: '5',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '3',
            })}
          >
            {derived.weekGrowthRate !== null && derived.weekGrowthRate >= 0 ? (
              <TrendingUp size={18} className={css({ color: 'moss.600' })} />
            ) : (
              <TrendingDown size={18} className={css({ color: 'spot.600' })} />
            )}
            <span
              className={css({
                fontSize: '[0.8rem]',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              7일 증감률
            </span>
          </div>
          <span
            className={css({
              fontSize: '2xl',
              fontWeight: 'bold',
              color:
                derived.weekGrowthRate !== null
                  ? derived.weekGrowthRate >= 0
                    ? 'moss.600'
                    : 'spot.600'
                  : 'ink.300',
            })}
          >
            {derived.weekGrowthRate !== null
              ? `${derived.weekGrowthRate >= 0 ? '+' : ''}${derived.weekGrowthRate}%`
              : '—'}
          </span>
        </div>

        {/* Peak day */}
        <div
          className={css({
            bg: 'paper.100',
            p: '5',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '3',
            })}
          >
            <BarChart3 size={18} className={css({ color: 'spot.600' })} />
            <span
              className={css({
                fontSize: '[0.8rem]',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              피크일
            </span>
          </div>
          {derived.peakDay ? (
            <div>
              <span
                className={css({
                  fontSize: '2xl',
                  fontWeight: 'bold',
                  color: 'ink.950',
                })}
              >
                {derived.peakDay.count}
              </span>
              <span
                className={css({
                  fontSize: '[0.8rem]',
                  color: 'ink.500',
                  ml: '1',
                })}
              >
                회
              </span>
              <div
                className={css({
                  fontSize: '[0.8rem]',
                  color: 'ink.300',
                  mt: '1',
                })}
              >
                {derived.peakDay.date}
              </div>
            </div>
          ) : (
            <span
              className={css({
                fontSize: '2xl',
                fontWeight: 'bold',
                color: 'ink.300',
              })}
            >
              —
            </span>
          )}
        </div>

        {/* Daily average */}
        <div
          className={css({
            bg: 'paper.100',
            p: '5',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '3',
            })}
          >
            <Calendar size={18} className={css({ color: 'purple.500' })} />
            <span
              className={css({
                fontSize: '[0.8rem]',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              일평균
            </span>
          </div>
          <span
            className={css({
              fontSize: '2xl',
              fontWeight: 'bold',
              color: 'ink.950',
            })}
          >
            {derived.dailyAverage}
          </span>
          <span
            className={css({
              fontSize: '[0.8rem]',
              color: 'ink.500',
              ml: '1',
            })}
          >
            회/일
          </span>
        </div>

        {/* Milestones */}
        <div
          className={css({
            bg: 'paper.100',
            p: '5',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '2',
              mb: '3',
            })}
          >
            <Trophy size={18} className={css({ color: 'spot.600' })} />
            <span
              className={css({
                fontSize: '[0.8rem]',
                color: 'ink.500',
                fontWeight: 'medium',
              })}
            >
              마일스톤
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '1',
            })}
          >
            {derived.milestones.map(m => (
              <div
                key={m.target}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                  fontSize: '[0.8rem]',
                })}
              >
                <span>{m.reached ? '●' : '○'}</span>
                <span
                  className={css({
                    color: m.reached ? 'ink.950' : 'ink.300',
                    fontWeight: m.reached ? 'semibold' : 'normal',
                  })}
                >
                  {m.target.toLocaleString()}회
                </span>
                {m.reached && m.date && (
                  <span
                    className={css({ color: 'ink.300', fontSize: '[0.75rem]' })}
                  >
                    ({m.date})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div
        className={css({
          bg: 'paper.100',
          p: '8',
          rounded: '[8px]',
          boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          mb: '6',
        })}
      >
        <div
          className={css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: '6',
            flexWrap: 'wrap',
            gap: '4',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '3',
              flexWrap: 'wrap',
            })}
          >
            <h3
              className={css({
                fontSize: 'lg',
                fontWeight: 'bold',
                color: 'ink.950',
              })}
            >
              📈 일별 조회수 추이
            </h3>
            {autoFellBackToAll && (
              <span
                className={css({
                  fontSize: '[0.75rem]',
                  color: 'ink.300',
                })}
              >
                최근 30일 데이터가 없어 전체 기간으로 표시 중
              </span>
            )}
          </div>
          <DateRangeControls
            filterType={filterType}
            setFilterType={setFilterType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        </div>
        <div className={css({ h: '[300px]', w: 'full' })}>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: CHART_AXIS }}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{
                    stroke: CHART_GUIDE,
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                  contentStyle={{
                    borderRadius: token('radii.lg'),
                    border: `1px solid ${token('colors.ink.border')}`,
                    background: token('colors.ink.25'),
                    color: token('colors.ink.900'),
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.4)',
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
                  stroke={CHART_LINE}
                  strokeWidth={3}
                  dot={{ r: 4, fill: CHART_ACCENT, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_ACCENT, strokeWidth: 0 }}
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
                color: 'ink.300',
              })}
            >
              <p>해당 기간에 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Distribution Charts */}
      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
          gap: '6',
        })}
      >
        {/* Hourly Distribution */}
        <div
          className={css({
            bg: 'paper.100',
            p: '8',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <h3
            className={css({
              fontSize: 'lg',
              fontWeight: 'bold',
              color: 'ink.950',
              mb: '6',
            })}
          >
            🕐 시간대별 분포
          </h3>
          <div className={css({ h: '[250px]', w: 'full' })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  axisLine={{ stroke: CHART_AXIS }}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 10 }}
                  interval={2}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{
                    fill: token('colors.accent.600'),
                    fillOpacity: 0.12,
                    radius: 4,
                  }}
                  contentStyle={{
                    borderRadius: token('radii.lg'),
                    border: `1px solid ${token('colors.ink.border')}`,
                    background: token('colors.ink.25'),
                    color: token('colors.ink.900'),
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.4)',
                    fontSize: '12px',
                  }}
                  labelStyle={{
                    color: token('colors.ink.600'),
                    marginBottom: '2px',
                  }}
                  itemStyle={{ color: token('colors.ink.800') }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`rgba(${MARKER_RGB}, ${0.3 + (entry.views / maxHourlyViews) * 0.7})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div
          className={css({
            bg: 'paper.100',
            p: '8',
            rounded: '[8px]',
            boxShadow: '[0 1px 2px 0 rgb(0 0 0 / 0.05)]',
          })}
        >
          <h3
            className={css({
              fontSize: 'lg',
              fontWeight: 'bold',
              color: 'ink.950',
              mb: '6',
            })}
          >
            📅 요일별 분포
          </h3>
          <div className={css({ h: '[250px]', w: 'full' })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dowData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={{ stroke: CHART_AXIS }}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_TICK, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{
                    fill: token('colors.accent.600'),
                    fillOpacity: 0.12,
                    radius: 4,
                  }}
                  contentStyle={{
                    borderRadius: token('radii.lg'),
                    border: `1px solid ${token('colors.ink.border')}`,
                    background: token('colors.ink.25'),
                    color: token('colors.ink.900'),
                    boxShadow: '0 4px 12px rgb(0 0 0 / 0.4)',
                    fontSize: '12px',
                  }}
                  labelStyle={{
                    color: token('colors.ink.600'),
                    marginBottom: '2px',
                  }}
                  itemStyle={{ color: token('colors.ink.800') }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {dowData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`rgba(${MARKER_RGB}, ${0.3 + (entry.views / maxDowViews) * 0.7})`}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

export default function PostDetailClient() {
  return (
    <div
      className={css({
        minH: '[calc(100dvh - 128px)]',
        bg: 'paper.50',
        p: { base: '4', md: '8' },
      })}
    >
      <header
        className={css({
          display: 'flex',
          alignItems: 'center',
          mb: '8',
          bg: 'paper.100',
          p: { base: '[0.75rem 1rem]', md: '[1rem 2rem]' },
          rounded: '[8px]',
          boxShadow: '[0 1px 3px 0 rgb(0 0 0 / 0.1)]',
          gap: '4',
        })}
      >
        <Link
          href="/admin/analytics"
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1',
            color: 'ink.500',
            fontSize: 'sm',
            textDecoration: 'none',
            _hover: { color: 'accent.600' },
          })}
        >
          <ArrowLeft size={16} />
          조회수 분석
        </Link>
        <h1
          className={css({
            fontSize: '2xl',
            fontWeight: 'bold',
            color: 'ink.950',
          })}
        >
          포스트 상세 분석
        </h1>
      </header>

      <Suspense
        fallback={
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '6',
            })}
          >
            <LoadingPlaceholder height="120px" />
            <LoadingPlaceholder height="80px" />
            <LoadingPlaceholder height="350px" />
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
                gap: '6',
              })}
            >
              <LoadingPlaceholder height="300px" />
              <LoadingPlaceholder height="300px" />
            </div>
          </div>
        }
      >
        <PostDetailContent />
      </Suspense>
    </div>
  );
}
