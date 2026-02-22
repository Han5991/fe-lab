'use client';

import { useState } from 'react';
import { PostStatDetail } from '@/lib/hooks/useAdminViews';
import { css } from '@design-system/ui-lib/css';
import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { DateRangeControls, useDateFilter } from './DateRangeControls';

interface Props {
  post: PostStatDetail;
}

export function PostAccordion({ post }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredTrends,
  } = useDateFilter(post.trends);

  const formattedData = filteredTrends.map(d => {
    const date = new Date(d.view_date);
    return {
      name: `${date.getMonth() + 1}/${date.getDate()}`,
      views: d.view_count,
    };
  });

  return (
    <div className={css({ borderBottom: '1px solid #e5e7eb' })}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={css({
          w: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: '1rem 1.5rem',
          bg: isOpen ? '#f3f4f6' : 'transparent',
          transition: 'background-color 0.2s',
          _hover: { bg: '#f9fafb' },
          cursor: 'pointer',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flex: 1,
            overflow: 'hidden',
          })}
        >
          <Link
            href={`/post/${post.slug}`}
            target="_blank"
            onClick={e => e.stopPropagation()}
            className={css({ color: '#6b7280', _hover: { color: '#3b82f6' } })}
          >
            <ExternalLink size={16} />
          </Link>
          <span
            className={css({
              fontWeight: '600',
              color: '#111827',
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
              color: '#9ca3af',
              fontSize: '0.875rem',
              flexShrink: 0,
            })}
          >
            {post.date}
          </span>
        </div>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            ml: '1rem',
            flexShrink: 0,
          })}
        >
          <div
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              w: '120px',
              justifyContent: 'flex-end',
            })}
          >
            <span className={css({ fontWeight: 'bold', color: '#111827' })}>
              {post.totalViews.toLocaleString()}
            </span>
            <span
              className={css({
                color: '#3b82f6',
                fontSize: '0.875rem',
                fontWeight: '500',
                ml: '0.25rem',
              })}
            >
              {post.todayViews > 0 ? `↑ ${post.todayViews}` : ''}
            </span>
          </div>

          {/* Date filter – stop propagation so clicking it doesn't toggle the accordion */}
          <div onClick={e => e.stopPropagation()}>
            <DateRangeControls
              filterType={filterType}
              setFilterType={setFilterType}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
            />
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={css({
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
            })}
          >
            <ChevronDown size={20} />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={css({ overflow: 'hidden' })}
          >
            <div className={css({ p: '1.5rem', bg: '#f9fafb' })}>
              <div className={css({ h: '250px', w: '100%' })}>
                {formattedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={formattedData}
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
                        labelStyle={{
                          color: '#6b7280',
                          marginBottom: '0.25rem',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#3b82f6"
                        strokeWidth={2}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
