'use client';

import { useState } from 'react';
import { useAdminDashboardData } from '@/lib/hooks/useAdminViews';
import { css } from '@design-system/ui-lib/css';
import { PostAccordion } from './PostAccordion';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function PostList() {
  const { data } = useAdminDashboardData();
  const queryClient = useQueryClient();
  const [sortField, setSortField] = useState<'date' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['admin', 'dashboard-data'],
    });
    setLastUpdated(new Date());
  };

  const sortedData = [...data].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'date') {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      cmp = dateA - dateB;
    } else {
      cmp = a.totalViews - b.totalViews;
    }
    return sortOrder === 'desc' ? -cmp : cmp;
  });

  return (
    <div
      className={css({
        bg: 'white',
        rounded: '8px',
        boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        overflow: 'hidden',
      })}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          })}
        >
          <button
            onClick={handleRefresh}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              bg: '#3b82f6',
              color: 'white',
              px: '0.75rem',
              py: '0.375rem',
              rounded: '4px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              _hover: { bg: '#2563eb' },
            })}
          >
            <RefreshCw size={14} /> 새로고침
          </button>
          <span className={css({ fontSize: '0.875rem', color: '#6b7280' })}>
            마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
          </span>
        </div>

        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          })}
        >
          <label
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              color: '#4b5563',
            })}
          >
            <input
              type="checkbox"
              checked={sortOrder === 'asc'}
              onChange={e => setSortOrder(e.target.checked ? 'asc' : 'desc')}
            />
            오름차순
          </label>
          <select
            value={sortField}
            onChange={e => setSortField(e.target.value as 'date' | 'views')}
            className={css({
              p: '0.375rem 0.5rem',
              border: '1px solid #d1d5db',
              rounded: '4px',
              fontSize: '0.875rem',
              bg: 'white',
              color: '#374151',
              cursor: 'pointer',
            })}
          >
            <option value="date">작성일순</option>
            <option value="views">조회수순</option>
          </select>
        </div>
      </div>

      <div className={css({ display: 'flex', flexDirection: 'column' })}>
        {sortedData.map(post => (
          <PostAccordion key={post.slug} post={post} />
        ))}
        {sortedData.length === 0 && (
          <div
            className={css({
              p: '3rem',
              textAlign: 'center',
              color: '#9ca3af',
            })}
          >
            게시글 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
