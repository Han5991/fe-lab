'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { usePostDetailStats } from '@/lib/hooks/usePostDetailStats';
import {
  DateRangeControls,
  useDateFilter,
} from '../../components/DateRangeControls';

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
  } = useDateFilter(post.trends);

  const trendData = filteredTrends.map(d => {
    const date = new Date(d.view_date);
    return {
      name: `${date.getMonth() + 1}/${date.getDate()}`,
      views: d.view_count,
    };
  });

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
          bg: 'white',
          p: '1.5rem 2rem',
          rounded: '8px',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          mb: '1.5rem',
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
          <h2
            className={css({
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#111827',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {post.title}
          </h2>
          <Link
            href={`/posts/${post.slug}`}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className={css({
              color: '#6b7280',
              _hover: { color: '#3b82f6' },
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
            gap: '2rem',
            alignItems: 'center',
          })}
        >
          {post.date && (
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              })}
            >
              <Calendar size={16} className={css({ color: '#9ca3af' })} />
              <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
                {post.date}
              </span>
            </div>
          )}
          <div
            className={css({
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.5rem',
            })}
          >
            <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
              총 조회수
            </span>
            <span
              className={css({
                fontWeight: 'bold',
                color: '#111827',
                fontSize: '1.25rem',
              })}
            >
              {post.totalViews.toLocaleString()}
            </span>
            <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
              회
            </span>
          </div>
          {post.todayViews > 0 && (
            <span
              className={css({
                color: '#3b82f6',
                fontWeight: 'bold',
                fontSize: '0.875rem',
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
          gap: '1rem',
          mb: '1.5rem',
        })}
      >
        {/* 7-day growth rate */}
        <div
          className={css({
            bg: 'white',
            p: '1.25rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              mb: '0.75rem',
            })}
          >
            {derived.weekGrowthRate !== null && derived.weekGrowthRate >= 0 ? (
              <TrendingUp size={18} className={css({ color: '#22c55e' })} />
            ) : (
              <TrendingDown size={18} className={css({ color: '#ef4444' })} />
            )}
            <span
              className={css({
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              7일 증감률
            </span>
          </div>
          <span
            className={css({
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color:
                derived.weekGrowthRate !== null
                  ? derived.weekGrowthRate >= 0
                    ? '#22c55e'
                    : '#ef4444'
                  : '#9ca3af',
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
            bg: 'white',
            p: '1.25rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              mb: '0.75rem',
            })}
          >
            <BarChart3 size={18} className={css({ color: '#f59e0b' })} />
            <span
              className={css({
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              피크일
            </span>
          </div>
          {derived.peakDay ? (
            <div>
              <span
                className={css({
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#111827',
                })}
              >
                {derived.peakDay.count}
              </span>
              <span
                className={css({
                  fontSize: '0.8rem',
                  color: '#6b7280',
                  ml: '0.25rem',
                })}
              >
                회
              </span>
              <div
                className={css({
                  fontSize: '0.8rem',
                  color: '#9ca3af',
                  mt: '0.25rem',
                })}
              >
                {derived.peakDay.date}
              </div>
            </div>
          ) : (
            <span
              className={css({
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#9ca3af',
              })}
            >
              —
            </span>
          )}
        </div>

        {/* Daily average */}
        <div
          className={css({
            bg: 'white',
            p: '1.25rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              mb: '0.75rem',
            })}
          >
            <Calendar size={18} className={css({ color: '#8b5cf6' })} />
            <span
              className={css({
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              일평균
            </span>
          </div>
          <span
            className={css({
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: '#111827',
            })}
          >
            {derived.dailyAverage}
          </span>
          <span
            className={css({
              fontSize: '0.8rem',
              color: '#6b7280',
              ml: '0.25rem',
            })}
          >
            회/일
          </span>
        </div>

        {/* Milestones */}
        <div
          className={css({
            bg: 'white',
            p: '1.25rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              mb: '0.75rem',
            })}
          >
            <Trophy size={18} className={css({ color: '#f59e0b' })} />
            <span
              className={css({
                fontSize: '0.8rem',
                color: '#6b7280',
                fontWeight: '500',
              })}
            >
              마일스톤
            </span>
          </div>
          <div
            className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            })}
          >
            {derived.milestones.map(m => (
              <div
                key={m.target}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                })}
              >
                <span>{m.reached ? '●' : '○'}</span>
                <span
                  className={css({
                    color: m.reached ? '#111827' : '#9ca3af',
                    fontWeight: m.reached ? '600' : '400',
                  })}
                >
                  {m.target.toLocaleString()}회
                </span>
                {m.reached && m.date && (
                  <span
                    className={css({ color: '#9ca3af', fontSize: '0.75rem' })}
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
          bg: 'white',
          p: '2rem',
          rounded: '8px',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          mb: '1.5rem',
        })}
      >
        <div
          className={css({
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          })}
        >
          <h3
            className={css({
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#111827',
            })}
          >
            📈 일별 조회수 추이
          </h3>
          <DateRangeControls
            filterType={filterType}
            setFilterType={setFilterType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
          />
        </div>
        <div className={css({ h: '300px', w: '100%' })}>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{
                    stroke: '#d1d5db',
                    strokeWidth: 1,
                    strokeDasharray: '4 4',
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#2563eb', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className={css({
                display: 'flex',
                h: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9ca3af',
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
          gap: '1.5rem',
        })}
      >
        {/* Hourly Distribution */}
        <div
          className={css({
            bg: 'white',
            p: '2rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <h3
            className={css({
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#111827',
              mb: '1.5rem',
            })}
          >
            🕐 시간대별 분포
          </h3>
          <div className={css({ h: '250px', w: '100%' })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={hourlyData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="hour"
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  interval={2}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {hourlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`rgba(59, 130, 246, ${0.3 + (entry.views / maxHourlyViews) * 0.7})`}
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
            bg: 'white',
            p: '2rem',
            rounded: '8px',
            boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          })}
        >
          <h3
            className={css({
              fontSize: '1.125rem',
              fontWeight: 'bold',
              color: '#111827',
              mb: '1.5rem',
            })}
          >
            📅 요일별 분포
          </h3>
          <div className={css({ h: '250px', w: '100%' })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dowData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {dowData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`rgba(59, 130, 246, ${0.3 + (entry.views / maxDowViews) * 0.7})`}
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

export default function PostDetailAnalyticsPage() {
  const router = useRouter();

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
          gap: '1rem',
        })}
      >
        <Link
          href="/admin/analytics"
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
          조회수 분석
        </Link>
        <h1
          className={css({
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827',
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
              gap: '1.5rem',
            })}
          >
            <LoadingPlaceholder height="120px" />
            <LoadingPlaceholder height="80px" />
            <LoadingPlaceholder height="350px" />
            <div
              className={css({
                display: 'grid',
                gridTemplateColumns: { base: '1fr', lg: 'repeat(2, 1fr)' },
                gap: '1.5rem',
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
