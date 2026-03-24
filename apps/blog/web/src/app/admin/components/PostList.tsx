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
    await queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard-data'] });
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

  const inputClass = css({
    py: '1.5',
    px: '2',
    borderWidth: '1px',
    borderColor: 'ink.border',
    rounded: 'md',
    fontSize: 'xs',
    bg: 'ink.25',
    color: 'ink.950',
    cursor: 'pointer',
    _focus: { outline: 'none', borderColor: 'accent.600' },
  });

  return (
    <div
      className={css({
        bg: 'ink.25',
        borderWidth: '1px',
        borderColor: 'ink.border',
        rounded: 'lg',
        overflow: 'hidden',
      })}
    >
      <div
        className={css({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: '5',
          py: '3',
          borderBottomWidth: '1px',
          borderColor: 'ink.border',
          flexWrap: 'wrap',
          gap: '2',
        })}
      >
        <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
          <button
            onClick={handleRefresh}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.5',
              bg: 'accent.600',
              color: 'white',
              px: '3',
              py: '1.5',
              rounded: 'md',
              fontSize: 'xs',
              fontWeight: 'medium',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
              _hover: { opacity: '0.85' },
            })}
          >
            <RefreshCw size={12} />
            새로고침
          </button>
          <span
            className={css({
              fontSize: 'xs',
              color: 'ink.500',
              display: { base: 'none', md: 'inline' },
            })}
          >
            업데이트: {lastUpdated.toLocaleString('ko-KR')}
          </span>
        </div>

        <div className={css({ display: 'flex', alignItems: 'center', gap: '3' })}>
          <label
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.5',
              fontSize: 'xs',
              cursor: 'pointer',
              color: 'ink.700',
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
            className={inputClass}
          >
            <option value="date">작성일순</option>
            <option value="views">조회수순</option>
          </select>
        </div>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column' })}>
        {sortedData.map(post => (
          <PostAccordion key={post.slug} post={post} />
        ))}
        {sortedData.length === 0 && (
          <div
            className={css({
              p: '12',
              textAlign: 'center',
              color: 'ink.500',
              fontSize: 'sm',
            })}
          >
            게시글 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
