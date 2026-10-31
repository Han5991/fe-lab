'use client';

import {
  addTransitionType,
  startTransition,
  useState,
  ViewTransition,
  type MouseEvent,
} from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { css, cva } from '@blog/styled-system/css';
import { resolvePostState } from '@blog/content/client';
import { TIMEZONE } from '@/content.values.mts';
import {
  adminCard,
  adminCell,
  adminTable,
  adminTableBody,
  enterMotion,
  enterOrderStyle,
  truncate,
} from '@/src/components/admin/adminStyles';
import { isModifiedClick } from '@/src/components/events';
import { pressButton, pressText } from '@/src/components/interaction';
import type { PostStatDetail } from '@/src/hooks/useAdminViews';
import {
  ADMIN_TRANSITION_TYPE,
  ADMIN_VIEW_TRANSITION,
} from '@/src/shared/adminViewTransitions';
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

/**
 * 분석 화면 글 목록의 정렬 상태 — 기본은 작성일
 * 내림차순, 세그먼트는 기준만 바꾸고, 정렬 중인 열 머리를 다시 누르면 방향이 바뀐다(예전 오름차순
 * 체크박스의 자리).
 *
 * 바꾸기는 type을 단 transition이다 — 목록의 `<ViewTransition>`이 이 type에서만 이전 순서를 걷고 새
 * 순서를 띄운다(아래 `SORT_SWAP`).
 */
export function usePostSort() {
  const [field, setField] = useState<SortField>('date');
  const [order, setOrder] = useState<SortOrder>('desc');

  const sortTransition = (update: () => void) =>
    startTransition(() => {
      addTransitionType(ADMIN_TRANSITION_TYPE.sort);
      update();
    });

  return {
    field,
    order,
    /** 세그먼트 — 기준만 바꾼다. */
    changeField: (next: SortField) => sortTransition(() => setField(next)),
    /** 열 머리 — 정렬 중인 열이면 방향을, 아니면 기준을 바꾼다. */
    toggle: (next: SortField) =>
      sortTransition(() => {
        if (next === field) {
          setOrder(current => (current === 'desc' ? 'asc' : 'desc'));
        } else {
          setField(next);
        }
      }),
  };
}

export type PostSort = ReturnType<typeof usePostSort>;

// 배경(hover·선택)은 fast로 번진다. 고른 줄에는 왼쪽 끝 2px 잉크 막대가 위아래 가운데서 펴진다
// (transform만, fast·standard) — 틴트만으로는 다크에서 고른 줄이 hover와 한 단계밖에 차이 나지 않는다.
// 그림자로 띄우지 않는다(흐름 안의 행 — AGENTS.md §9).
//
// 막대는 행이 아니라 줄의 첫 칸에 단다 — `<tr>`의 의사 요소는 절대 배치여도 Chrome이 익명 칸으로
// 만들어 칸이 한 칸씩 밀린다(실측). 첫 칸은 sm 이상이 상태 칸, sm 미만이 제목 칸이라(상태 칸을 접는다)
// 두 칸이 막대를 갖고 보이는 쪽 하나만 그린다. 펴짐은 행이 주는 변수(`--row-marker` 0·1)를 칸의 의사
// 요소가 물려받아 transform이 바뀌면서 전환된다.
const row = cva({
  base: { transition: 'colors' },
  variants: {
    selected: {
      // 고른 줄은 잉크 틴트(검색 선택 행과 같은 accent.muted) — 굵기도 함께 바뀐다(아래 제목).
      true: { bg: 'accent.muted', '--row-marker': '1' },
      // hover는 카드 면보다 한 단계 위. 다크 카드(paper.100)와 같은 paper.100은 보이지 않는다.
      false: { _hover: { bg: 'ink.50' }, '--row-marker': '0' },
    },
  },
});

/** 선택 막대를 그리는 칸 — 위 `row`의 변수로 펴진다. */
const markerCell = css.raw({
  pos: 'relative',
  _before: {
    content: '""',
    pos: 'absolute',
    insetBlock: '0',
    insetInlineStart: '0',
    w: '0.5',
    bg: 'accent.solid',
    transform: 'scaleY(var(--row-marker))',
    transition: 'transform',
  },
});

/**
 * 목록의 View Transition 클래스 — 정렬 transition(`ADMIN_TRANSITION_TYPE.sort`)에서만 목록이 교차한다:
 * 이전 순서가 제자리에서 걷히고(out) 새 순서가 떠오른다(rise). 그 밖의 transition(글 고르기의 주소
 * 변경 등)에서는 움직이지 않는다 — 선택 줄의 배경·막대는 위 CSS 전환이 맡는다.
 *
 * 행마다 경계를 두고 새 자리로 미끄러뜨리는 길도 재 봤지만 버렸다: 표의 칸 선(border-collapse)은 표가
 * 그려 행 스냅샷에 실리지 않아 선은 제자리에 남고 글자만 미끄러졌고, 정렬을 뒤집으면 46행이 화면
 * 밖까지 서로를 가로질러 어느 행이 어디로 갔는지 읽히지 않았다.
 */
const SORT_SWAP = {
  [ADMIN_TRANSITION_TYPE.sort]: `${ADMIN_VIEW_TRANSITION.out} ${ADMIN_VIEW_TRANSITION.rise}`,
  default: 'none',
};

const titleLink = cva({
  base: {
    ...pressText,
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

// 글자와 아이콘뿐인 버튼이라 면은 없어도 누름은 `pressButton`이다.
const sortButton = css.raw({
  ...pressButton,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  _hover: { color: 'ink.950' },
});

/**
 * 정렬 열 머리 칸 — 열마다 정적 클래스다. 열에 따라 변형을 고르는 `adminCell.raw({ align: … })`는
 * Panda가 추출하지 못해(다른 파일의 레시피에 런타임 값) 같은 원자 클래스가 다른 곳에 우연히 있을 때만
 * 모양이 난다.
 */
const SORT_HEAD_CELL = {
  date: css(adminCell.raw({ kind: 'head' }), {
    w: '28',
    display: { base: 'none', md: 'table-cell' },
  }),
  views: css(adminCell.raw({ kind: 'head', align: 'end' }), { w: '24' }),
} as const satisfies Record<SortField, string>;

interface SortHeaderProps {
  field: SortField;
  sort: PostSort;
}

/**
 * 정렬 열 머리 — Astryx 정렬 헤더(라벨 + 아이콘 12). 정렬 중인 열은 방향 화살표와 `aria-sort`,
 * 아닌 열은 흐린 위아래 화살표다. 정렬 중인 열을 다시 누르면 방향이 바뀌고, 다른 열을 누르면 그
 * 열로 정렬한다(`usePostSort`).
 */
function SortHeader({ field, sort }: SortHeaderProps) {
  const active = field === sort.field;
  return (
    <th
      scope="col"
      aria-sort={
        active
          ? sort.order === 'desc'
            ? 'descending'
            : 'ascending'
          : undefined
      }
      className={SORT_HEAD_CELL[field]}
    >
      <button
        type="button"
        onClick={() => sort.toggle(field)}
        className={css(sortButton, active ? { color: 'ink.950' } : undefined)}
      >
        {SORT_COLUMN[field]}
        {!active ? (
          <ArrowUpDown
            size={12}
            aria-hidden
            className={css({ opacity: '0.35' })}
          />
        ) : sort.order === 'desc' ? (
          <ArrowDown size={12} aria-hidden />
        ) : (
          <ArrowUp size={12} aria-hidden />
        )}
      </button>
    </th>
  );
}

/** 분석 화면의 고르기 — 주소가 든 글과, 줄을 눌러 주소를 바꾸는 함수. */
interface PostSelection {
  slug: string | null;
  onSelect: (slug: string) => void;
}

/** 표를 감싸는 면 — 표 자체가 카드이고, 머리 다음(진입 순서 1)으로 떠오른다. */
const frame = css(adminCard, enterMotion, { p: '0', overflow: 'hidden' });

interface PostTableProps {
  /** 거른 글 — 정렬은 표가 `sort`로 한다. */
  posts: readonly PostStatDetail[];
  sort: PostSort;
  /** 표 아래(행 대신) 보일 안내 — 데이터가 없거나 검색이 비었을 때. */
  emptyMessage: string;
  /** 분석 화면의 고르기 — 제목을 누르면 주소만 바꾸고(`onSelect`) 고른 줄을 세운다. */
  selection: PostSelection;
}

/**
 * admin 분석 화면의 글 목록 — 상태 · 제목 · 작성일 · 조회수(승인 목업, Astryx table-inbox의 목록 칸).
 *
 * 제목은 그 글의 통계 주소로 가는 **링크**다. 분석 화면에서는 누르면 주소만 바꾸고(`onSelect` →
 * `history.pushState`) 오른쪽 패널이 그 글을 연다 — 새 탭·주소 복사는 링크 그대로 되고, 정적 export가
 * 글마다 만든 같은 주소의 페이지가 같은 화면을 연다. 고른 줄은 `aria-current="page"`(주소가 곧 그
 * 글이다).
 */
export function PostTable({
  posts,
  sort,
  emptyMessage,
  selection,
}: PostTableProps) {
  const sorted = sortPosts(posts, sort.field, sort.order);
  const handleClick =
    (onSelect: PostSelection['onSelect'], slug: string) => (e: MouseEvent) => {
      if (isModifiedClick(e)) return;
      e.preventDefault();
      onSelect(slug);
    };

  return (
    <ViewTransition update={SORT_SWAP} default="none">
      {/* 머리(진입 순서 0) 다음으로 떠오른다. */}
      <div style={enterOrderStyle(1)} className={frame}>
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
              <SortHeader field="date" sort={sort} />
              <SortHeader field="views" sort={sort} />
            </tr>
          </thead>
          <tbody className={adminTableBody}>
            {sorted.map(post => {
              const selected = post.slug === selection.slug;
              const href = adminAnalyticsPostPath(post.slug);
              const state = resolvePostState(post, TIMEZONE);
              const title = (
                <>
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
                </>
              );
              return (
                <tr key={post.slug} className={row({ selected })}>
                  <td
                    className={css(adminCell.raw(), markerCell, {
                      display: { base: 'none', sm: 'table-cell' },
                    })}
                  >
                    <StatusBadge state={state} post={post} />
                  </td>
                  {/* 칸 전체가 링크다 — 행 높이 44(목업)를 링크의 안쪽 여백이 낸다. */}
                  <td
                    className={css(adminCell.raw(), markerCell, {
                      px: '0',
                      py: '0',
                      // sm 이상은 상태 칸이 첫 칸이라 그쪽이 막대를 그린다.
                      _before: { display: { sm: 'none' } },
                    })}
                  >
                    <a
                      href={href}
                      aria-current={selected ? 'page' : undefined}
                      onClick={handleClick(selection.onSelect, post.slug)}
                      className={titleLink({ selected })}
                    >
                      {title}
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
    </ViewTransition>
  );
}
