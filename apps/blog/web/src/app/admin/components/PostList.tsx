'use client';

import { useState } from 'react';
import { getKSTDateISO, localeTag } from '@blog/content/client';
import { SITE_LOCALE, TIMEZONE } from '@/content.values.mts';
import { useAdminDashboardData } from '@/src/hooks/useAdminViews';
import { css } from '@blog/styled-system/css';
import { PostAccordion } from './PostAccordion';
import { RefreshCw } from 'lucide-react';

/** 정렬 기준 — 값과 라벨의 단일 출처. 타입·가드·`<option>`이 여기서 나온다. */
const SORT_FIELD_LABEL = {
  date: '작성일순',
  views: '조회수순',
} as const satisfies Record<string, string>;
type SortField = keyof typeof SORT_FIELD_LABEL;
const isSortField = (value: string): value is SortField =>
  Object.hasOwn(SORT_FIELD_LABEL, value);

export function PostList() {
  // 업데이트 시각은 데이터가 도착한 시각이다 — 실패한 새로고침도 정상 종료하므로
  // "지금"을 적으면 갱신된 것처럼 보인다.
  const { data, dataUpdatedAt, isFetching, isRefetchError, refetch } =
    useAdminDashboardData();
  const [sortField, setSortField] = useState<SortField>('date');
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
    borderWidth: 'hairline',
    borderColor: 'ink.border',
    rounded: 'element',
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
        borderWidth: 'hairline',
        borderColor: 'ink.border',
        rounded: 'container',
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
          borderBottomWidth: 'hairline',
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
              borderWidth: 'hairline',
              borderStyle: 'solid',
              borderColor: 'ink.border',
              px: '3',
              py: '1.5',
              rounded: 'full',
              fontSize: 'xs',
              fontWeight: 'medium',
              cursor: 'pointer',
              transition: 'common',
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
            업데이트:{' '}
            {new Date(dataUpdatedAt).toLocaleString(localeTag(SITE_LOCALE))}
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
            aria-label="정렬 기준"
            value={sortField}
            onChange={e => {
              const { value } = e.target;
              if (isSortField(value)) setSortField(value);
            }}
            className={inputClass}
          >
            {Object.entries(SORT_FIELD_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
