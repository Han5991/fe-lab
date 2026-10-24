'use client';

import type { MouseEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { css, cva } from '@blog/styled-system/css';
import { resolvePostState } from '@blog/content/client';
import { TIMEZONE } from '@/content.values.mts';
import {
  adminCard,
  adminCell,
  adminTable,
  adminTableBody,
  truncate,
} from '@/src/components/admin/adminStyles';
import { isModifiedClick } from '@/src/components/events';
import type { PostStatDetail } from '@/src/hooks/useAdminViews';
import { adminAnalyticsPostPath } from '@/src/shared/routes';
import { StatusBadge } from './StatusBadge';

/**
 * 정렬 기준 — 값과 세그먼트 라벨의 단일 출처. 타입·선택지가 여기서 나온다.
 */
export const SORT_OPTIONS = [
  { value: 'date', label: '작성일순' },
  { value: 'views', label: '조회수순' },
] as const;
export type SortField = (typeof SORT_OPTIONS)[number]['value'];
export type SortOrder = 'desc' | 'asc';

/** 정렬할 수 있는 열의 머리 글자 — 세그먼트 라벨(`…순`)과 다른 자리라 따로 둔다. */
const SORT_COLUMN = {
  date: '작성일',
  views: '조회수',
} as const satisfies Record<SortField, string>;

/** 정렬 — 작성일은 날짜 없는 글을 가장 오래된 쪽(0)으로, 조회수는 누적. */
export function sortPosts(
  posts: readonly PostStatDetail[],
  field: SortField,
  order: SortOrder,
): PostStatDetail[] {
  return [...posts].sort((a, b) => {
    const cmp =
      field === 'date'
        ? (a.date ? new Date(a.date).getTime() : 0) -
          (b.date ? new Date(b.date).getTime() : 0)
        : a.totalViews - b.totalViews;
    return order === 'desc' ? -cmp : cmp;
  });
}

const row = cva({
  base: { transition: 'colors' },
  variants: {
    selected: {
      // 고른 줄은 잉크 틴트(검색 선택 행과 같은 accent.muted) — 굵기도 함께 바뀐다(아래 제목).
      true: { bg: 'accent.muted' },
      // hover는 카드 면보다 한 단계 위. 다크 카드(paper.100)와 같은 paper.100은 보이지 않는다.
      false: { _hover: { bg: 'ink.50' } },
    },
  },
});

const titleLink = cva({
  base: {
    ...truncate,
    px: '3',
    py: '3',
    color: 'ink.950',
    textDecorationLine: 'none',
    _hover: { textDecorationLine: 'underline' },
  },
  variants: {
    selected: {
      true: { fontWeight: 'semibold' },
      false: {},
    },
  },
});

const sortButton = css.raw({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  _hover: { color: 'ink.950' },
});

interface SortHeaderProps {
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

/**
 * 정렬 열 머리 — Astryx 정렬 헤더(라벨 + 아이콘 12). 정렬 중인 열은 방향 화살표와 `aria-sort`,
 * 아닌 열은 흐린 위아래 화살표다. 정렬 중인 열을 다시 누르면 방향이 바뀌고(예전 오름차순 체크박스
 * 자리), 다른 열을 누르면 그 열로 정렬한다.
 */
function SortHeader({ field, sortField, sortOrder, onSort }: SortHeaderProps) {
  const active = field === sortField;
  return (
    <th
      scope="col"
      aria-sort={
        active ? (sortOrder === 'desc' ? 'descending' : 'ascending') : undefined
      }
      className={css(
        adminCell.raw({
          kind: 'head',
          align: field === 'views' ? 'end' : 'start',
        }),
        field === 'views'
          ? { w: '24' }
          : { w: '28', display: { base: 'none', md: 'table-cell' } },
      )}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={css(sortButton, active ? { color: 'ink.950' } : undefined)}
      >
        {SORT_COLUMN[field]}
        {!active ? (
          <ArrowUpDown
            size={12}
            aria-hidden
            className={css({ opacity: '0.35' })}
          />
        ) : sortOrder === 'desc' ? (
          <ArrowDown size={12} aria-hidden />
        ) : (
          <ArrowUp size={12} aria-hidden />
        )}
      </button>
    </th>
  );
}

interface PostTableProps {
  posts: readonly PostStatDetail[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  /** 표 아래(행 대신) 보일 안내 — 데이터가 없거나 검색이 비었을 때. */
  emptyMessage: string;
}

/**
 * 분석 화면의 글 목록 — 상태 · 제목 · 작성일 · 조회수(승인 목업, Astryx table-inbox의 목록 칸).
 *
 * 제목은 그 글의 통계 주소로 가는 **링크**다. 누르면 주소만 바꾸고(`onSelect` → `history.pushState`)
 * 오른쪽 패널이 그 글을 연다 — 새 탭·주소 복사는 링크 그대로 되고, 정적 export가 글마다 만든
 * 같은 주소의 페이지가 같은 화면을 연다. 고른 줄은 `aria-current="page"`(주소가 곧 그 글이다).
 */
export function PostTable({
  posts,
  selectedSlug,
  onSelect,
  sortField,
  sortOrder,
  onSort,
  emptyMessage,
}: PostTableProps) {
  const handleClick = (slug: string) => (e: MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    onSelect(slug);
  };

  return (
    <div className={css(adminCard, { p: '0', overflow: 'hidden' })}>
      <table className={adminTable}>
        <caption className={css({ srOnly: true })}>글 목록</caption>
        <thead>
          <tr>
            {/* sm 미만은 상태 열을 접는다 — 제목 칸이 100px 남짓으로 줄어 제목이 읽히지 않는다.
                그때 공개 중이 아닌 글은 제목 앞에 배지를 단다(아래 제목 칸). */}
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head' }), {
                w: '20',
                display: { base: 'none', sm: 'table-cell' },
              })}
            >
              상태
            </th>
            <th scope="col" className={adminCell({ kind: 'head' })}>
              제목
            </th>
            <SortHeader
              field="date"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortHeader
              field="views"
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody className={adminTableBody}>
          {posts.map(post => {
            const selected = post.slug === selectedSlug;
            const href = adminAnalyticsPostPath(post.slug);
            const state = resolvePostState(post, TIMEZONE);
            return (
              <tr key={post.slug} className={row({ selected })}>
                <td
                  className={css(adminCell.raw(), {
                    display: { base: 'none', sm: 'table-cell' },
                  })}
                >
                  <StatusBadge state={state} post={post} />
                </td>
                {/* 칸 전체가 링크다 — 행 높이 44(목업)를 링크의 안쪽 여백이 낸다. */}
                <td className={css(adminCell.raw(), { px: '0', py: '0' })}>
                  <a
                    href={href}
                    aria-current={selected ? 'page' : undefined}
                    onClick={handleClick(post.slug)}
                    className={titleLink({ selected })}
                  >
                    {state !== 'published' && (
                      <span
                        className={css({
                          display: { base: 'inline-flex', sm: 'none' },
                          mr: '2',
                        })}
                      >
                        <StatusBadge state={state} post={post} />
                      </span>
                    )}
                    {post.title}
                  </a>
                </td>
                <td
                  className={css(adminCell.raw(), {
                    display: { base: 'none', md: 'table-cell' },
                    color: 'ink.700',
                    fontVariantNumeric: 'tabular-nums',
                  })}
                >
                  {post.date}
                </td>
                <td
                  className={css(adminCell.raw({ align: 'end' }), {
                    fontWeight: 'medium',
                    whiteSpace: 'nowrap',
                  })}
                >
                  {post.totalViews.toLocaleString()}
                  {post.todayViews > 0 && (
                    <span
                      className={css({
                        ml: '1',
                        textStyle: 'supporting',
                        fontWeight: 'medium',
                        color: 'spot.600',
                      })}
                    >
                      +{post.todayViews}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {posts.length === 0 && (
        <p
          className={css({
            p: '12',
            textAlign: 'center',
            textStyle: 'body',
            color: 'ink.700',
          })}
        >
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
