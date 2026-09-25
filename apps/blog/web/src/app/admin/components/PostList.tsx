'use client';

import { useState } from 'react';
import { getKSTDateISO } from '@blog/content';
import { TIMEZONE } from '@/content.values.mts';
import { useAdminDashboardData } from '@/src/hooks/useAdminViews';
import { css } from '@design-system/ui-lib/css';
import { PostAccordion } from './PostAccordion';
import { RefreshCw } from 'lucide-react';

export function PostList() {
  // 업데이트 시각은 데이터가 도착한 시각이다 — 실패한 새로고침도 정상 종료하므로
  // "지금"을 적으면 갱신된 것처럼 보인다.
  const { data, dataUpdatedAt, isFetching, isRefetchError, refetch } =
    useAdminDashboardData();
  const [sortField, setSortField] = useState<'date' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 행마다 부르면 Intl.DateTimeFormat이 행 수 × 2만큼 만들어진다.
  const todayISO = getKSTDateISO(TIMEZONE);

  const handleRefresh = () => {
    void refetch();
  };

  const sortedData = [...data].sort((a, b) => {
    let cmp: number;
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
    borderWidth: '[1px]',
    borderColor: 'ink.border',
    rounded: 'md',
    fontSize: 'xs',
    bg: 'ink.25',
    color: 'ink.950',
    cursor: 'pointer',
    _focus: { outline: 'none', borderColor: 'ink.950' },
  });

  return (
    <div
      className={css({
        bg: 'ink.25',
        borderWidth: '[1px]',
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
          borderBottomWidth: '[1px]',
          borderColor: 'ink.border',
          flexWrap: 'wrap',
          gap: '2',
        })}
      >
        <div
          className={css({ display: 'flex', alignItems: 'center', gap: '3' })}
        >
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching}
            className={css({
              display: 'flex',
              alignItems: 'center',
              gap: '1.5',
              bg: 'paper.200',
              color: 'ink.800',
              borderWidth: '[1px]',
              borderStyle: 'solid',
              borderColor: 'ink.border',
              px: '3',
              py: '1.5',
              rounded: '[6px]',
              fontSize: 'xs',
              fontWeight: 'medium',
              cursor: 'pointer',
              transition: '[all 0.15s]',
              _hover: { bg: 'paper.300', borderColor: 'ink.borderStrong' },
              _disabled: { cursor: 'wait', opacity: 0.6 },
            })}
          >
            <RefreshCw size={12} aria-hidden />
            {isFetching ? '새로고침 중…' : '새로고침'}
          </button>
          <span
            className={css({
              fontSize: 'xs',
              color: 'ink.500',
              display: { base: 'none', md: 'inline' },
            })}
          >
            업데이트: {new Date(dataUpdatedAt).toLocaleString('ko-KR')}
          </span>
          {isRefetchError && (
            <span
              role="status"
              className={css({ fontSize: 'xs', color: 'danger.text' })}
            >
              새로고침 실패 — 이전 데이터를 보여 주는 중
            </span>
          )}
        </div>

        <div
          className={css({ display: 'flex', alignItems: 'center', gap: '3' })}
        >
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
          <PostAccordion key={post.slug} post={post} todayISO={todayISO} />
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
