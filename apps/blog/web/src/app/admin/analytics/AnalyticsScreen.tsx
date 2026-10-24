'use client';

import {
  Suspense,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, Search } from 'lucide-react';
import { css, cva, cx } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import { localeTag } from '@blog/content/client';
import { SITE_LOCALE } from '@/content.values.mts';
import { Portal } from '@/src/components/Portal';
import { railColumn, railGutter } from '@/src/components/Rail';
import { actionButton } from '@/src/components/actionButton';
import { AdminPageHeader } from '@/src/components/admin/AdminPageHeader';
import { SegmentedControl } from '@/src/components/admin/SegmentedControl';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import { siteHeaderStyle } from '@/src/components/siteHeader';
import { useModalDialog } from '@/src/components/useModalDialog';
import { useAdminPostTags } from '@/src/hooks/useAdminPostTags';
import { useAdminDashboardData } from '@/src/hooks/useAdminViews';
import { usePrefetchPostDetailStats } from '@/src/hooks/usePostDetailStats';
import {
  ADMIN_ANALYTICS_PATH,
  adminAnalyticsPostPath,
  adminAnalyticsSlugFromPath,
} from '@/src/shared/routes';
import {
  NoSelection,
  PanelSkeleton,
  PostNotFound,
  PostStatsPanel,
} from '../components/PostStatsPanel';
import {
  PostTable,
  SORT_OPTIONS,
  sortPosts,
  type SortField,
  type SortOrder,
} from '../components/PostTable';

/**
 * 패널이 목록 옆 칼럼이 되는 폭 — Panda의 lg 브레이크포인트 토큰에서 만든다(CSS 쪽 `lg:`와 같은 값).
 */
const WIDE_QUERY = `(min-width: ${token('breakpoints.lg')})`;

const subscribeWide = (onChange: () => void) => {
  const list = window.matchMedia(WIDE_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
};

/**
 * lg 이상인가 — 패널을 칼럼으로 둘지 시트로 띄울지가 마크업(랜드마크·다이얼로그·포털)부터 달라
 * CSS만으로는 못 가른다. admin 화면은 가드 안이라 서버에서 그려지지 않는다(`AdminShell`은
 * ssr:false) — 서버 스냅샷은 쓰이지 않지만 시그니처상 넓은 쪽을 준다.
 */
function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

/**
 * 고른 글을 바꾼다 — 주소만 바꾸고 화면은 그 주소를 다시 읽는다(`adminAnalyticsSlugFromPath`).
 * Next 라우터로 이동하면 목록 페이지와 글별 페이지(`[...slug]`)가 서로 다른 페이지라 화면이 통째로
 * 다시 마운트된다 — `pushState`는 Next 라우터가 받아 `usePathname`만 맞춘다. 같은 주소면 기록을
 * 늘리지 않는다.
 */
function navigateTo(href: string): void {
  if (window.location.pathname === href) return;
  window.history.pushState(null, '', href);
}

/** 고른 글의 분포 요청을 미리 건다 — 대시보드 데이터를 기다리는 동안 함께 받는다. */
function PrefetchPostStats({ slug }: { slug: string }) {
  usePrefetchPostDetailStats(slug);
  return null;
}

interface PostListViewProps {
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
}

/** 머리(제목·요약·검색·정렬·새로고침)와 글 목록. */
function PostListView({ selectedSlug, onSelect }: PostListViewProps) {
  // 업데이트 시각은 데이터가 도착한 시각이다 — 실패한 새로고침도 정상 종료하므로
  // "지금"을 적으면 갱신된 것처럼 보인다.
  const { data, dataUpdatedAt, isFetching, isRefetchError, refetch } =
    useAdminDashboardData();
  const [query, setQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const totalViews = data.reduce((acc, post) => acc + post.totalViews, 0);
  const needle = query.trim().toLowerCase();
  const visible = sortPosts(
    needle === ''
      ? data
      : data.filter(post => post.title.toLowerCase().includes(needle)),
    sortField,
    sortOrder,
  );

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(order => (order === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="분석"
        description={
          <>
            {data.length}편 · 누적 조회수 {totalViews.toLocaleString()}회 ·{' '}
            <span>
              업데이트:{' '}
              {new Date(dataUpdatedAt).toLocaleString(localeTag(SITE_LOCALE))}
            </span>
            {isRefetchError && (
              <span
                role="status"
                className={css({ display: 'block', color: 'danger.text' })}
              >
                새로고침 실패 — 이전 데이터를 보여 주는 중
              </span>
            )}
          </>
        }
        actions={
          <>
            <label
              className={css({
                pos: 'relative',
                display: 'block',
                w: { base: 'full', sm: '60' },
              })}
            >
              <span className={css({ srOnly: true })}>글 검색</span>
              <Search
                size={16}
                aria-hidden
                className={css({
                  pos: 'absolute',
                  left: '3',
                  top: '2',
                  color: 'ink.700',
                  pointerEvents: 'none',
                })}
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="제목 검색"
                className={css({
                  w: 'full',
                  h: '8',
                  pl: '9',
                  pr: '3',
                  rounded: 'element',
                  borderWidth: 'hairline',
                  borderColor: 'ink.borderStrong',
                  bg: 'surface.raised',
                  color: 'ink.950',
                  textStyle: 'body',
                  _placeholder: { color: 'ink.600' },
                  _focus: { borderColor: 'accent.solid' },
                })}
              />
            </label>
            <SegmentedControl
              label="정렬 기준"
              options={SORT_OPTIONS}
              value={sortField}
              onChange={setSortField}
            />
            <button
              type="button"
              onClick={() => void refetch()}
              disabled={isFetching}
              className={css(
                actionButton.raw({ tone: 'neutral', size: 'md' }),
                {
                  _disabled: { cursor: 'wait', opacity: '0.6' },
                },
              )}
            >
              <RefreshCw size={16} aria-hidden />
              {isFetching ? '새로고침 중…' : '새로고침'}
            </button>
          </>
        }
      />
      <PostTable
        posts={visible}
        selectedSlug={selectedSlug}
        onSelect={onSelect}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage={
          data.length === 0
            ? '게시글 데이터가 없습니다.'
            : `‘${query.trim()}’에 맞는 글이 없습니다.`
        }
      />
    </>
  );
}

const panelColumn = css({
  pos: 'sticky',
  top: '[var(--site-header-height)]',
  // 관리자 바(48) 아래를 화면 끝까지 채우고 안에서 스크롤한다 — 목록이 길어도 패널은 제자리다.
  h: '[calc(100dvh - var(--site-header-height))]',
  overflowY: 'auto',
  bg: 'surface.raised',
  borderLeftWidth: 'hairline',
  borderColor: 'ink.border',
});

/** lg 이상의 패널 칼럼 — 목록 옆 `글 통계` 영역. 높이를 관리자 바 변수에서 계산한다. */
function PanelColumn({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="글 통계"
      style={siteHeaderStyle}
      className={panelColumn}
    >
      {children}
    </section>
  );
}

/**
 * lg 미만의 시트 — 패널을 목록 위에 덮는 오른쪽 드로어. 떠서 아래를 가리고 닫으면 사라지는 면이라
 * 그림자가 붙는 유일한 admin 표면이다(`overlay.high`, AGENTS.md §9 — 다이얼로그·시트는 high).
 * 스크롤 잠금·초점 가두기·Escape는 검색·목차 시트와 같은 `useModalDialog`가 맡는다.
 */
function PostSheet({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useModalDialog({ open: true, onClose, containerRef: sheetRef });
  return (
    <Portal>
      {/* 백드롭 클릭은 포인터 편의다 — 키보드는 Escape·닫기 버튼으로 닫는다. */}
      <div
        role="presentation"
        onClick={onClose}
        className={css({
          pos: 'fixed',
          inset: '0',
          bg: 'scrim.sheet',
          zIndex: '50',
        })}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={css({
          pos: 'fixed',
          top: '0',
          right: '0',
          bottom: '0',
          w: 'full',
          maxW: 'inspector',
          overflowY: 'auto',
          bg: 'surface.raised',
          borderLeftWidth: 'hairline',
          borderColor: 'ink.border',
          boxShadow: 'overlay.high',
          zIndex: '51',
          pb: '[env(safe-area-inset-bottom)]',
        })}
      >
        {children}
      </div>
    </Portal>
  );
}

interface InspectorBodyProps {
  slug: string | null;
  /** 넓은 화면은 칼럼 안의 내용, 좁은 화면은 시트(고른 글이 있을 때만). */
  mode: 'column' | 'sheet';
  onClose: () => void;
}

/**
 * 고른 글의 통계 — 데이터 구독(대시보드 데이터·태그)은 화면이 떠 있는 동안 여기 하나로 유지한다.
 * admin 쿼리는 구독이 새로 붙을 때마다 다시 받으므로(`adminQueryDefaults`) 글을 고르고 닫을 때마다
 * 구독을 붙였다 떼면 그때마다 목록 전체를 다시 받는다 — 그래서 시트를 닫아도 이 컴포넌트는 남고,
 * 시트만 사라진다.
 */
function InspectorBody({ slug, mode, onClose }: InspectorBodyProps) {
  const { data } = useAdminDashboardData();
  const postTags = useAdminPostTags();
  const titleId = useId();

  const post =
    slug === null ? undefined : data.find(item => item.slug === slug);
  const tags = slug === null ? undefined : postTags.get(slug);

  // 대시보드 데이터는 인덱스에서 만든다 — 한쪽에만 있는 글은 없지만, 둘 다 있을 때만 통계를 그린다.
  const content =
    slug === null ? null : post !== undefined && tags !== undefined ? (
      <PostStatsPanel
        key={post.slug}
        post={post}
        tags={tags}
        titleId={titleId}
        onClose={onClose}
      />
    ) : (
      <PostNotFound slug={slug} titleId={titleId} onClose={onClose} />
    );

  if (mode === 'column') return content ?? <NoSelection />;
  if (content === null) return null;
  return (
    <PostSheet titleId={titleId} onClose={onClose}>
      {content}
    </PostSheet>
  );
}

interface InspectorProps {
  slug: string | null;
  isWide: boolean;
  onClose: () => void;
}

/**
 * 고른 글의 통계를 넓은 화면은 목록 옆 칼럼에, 좁은 화면은 시트에 그린다. 칼럼은 데이터를
 * 기다리는 동안에도 자리를 지킨다(목록 옆이 비었다가 생기면 목록 폭이 한 번 바뀐다).
 */
function Inspector({ slug, isWide, onClose }: InspectorProps) {
  if (isWide) {
    return (
      <PanelColumn>
        <Suspense fallback={<PanelSkeleton />}>
          <InspectorBody slug={slug} mode="column" onClose={onClose} />
        </Suspense>
      </PanelColumn>
    );
  }
  return (
    <Suspense fallback={null}>
      <InspectorBody slug={slug} mode="sheet" onClose={onClose} />
    </Suspense>
  );
}

const layout = cva({
  variants: {
    wide: {
      // 목록 | 패널(400). 패널은 sticky라 칸이 자기 높이만 차지해야 한다(align-items start).
      true: {
        display: 'grid',
        gridTemplateColumns: '[minmax(0, 1fr) token(sizes.inspector)]',
        alignItems: 'start',
      },
      false: { display: 'block' },
    },
  },
});

/**
 * admin 분석 — 왼쪽 글 목록, 오른쪽 글 통계 패널(Astryx incident-console·table-inbox의 목록 +
 * 인스펙터). 줄을 누르면 패널이 그 글로 바뀌고 X로 닫는다. lg 미만은 패널이 목록 위를 덮는 시트다.
 *
 * 고른 글은 주소가 들고 있다 — `/admin/analytics/`는 고른 글이 없는 상태, `/admin/analytics/{slug}/`는
 * 그 글을 고른 상태다. 그래서 목록 페이지와 글별 페이지(`[...slug]`, 정적 export의 딥링크)가 같은
 * 이 화면을 그린다.
 */
export function AnalyticsScreen() {
  const selectedSlug = adminAnalyticsSlugFromPath(usePathname());
  const isWide = useIsWide();

  const select = (slug: string) => navigateTo(adminAnalyticsPostPath(slug));
  const close = () => navigateTo(ADMIN_ANALYTICS_PATH);

  return (
    <div className={layout({ wide: isWide })}>
      {selectedSlug !== null && <PrefetchPostStats slug={selectedSlug} />}
      <div className={cx(railGutter, css({ pb: '12', minW: '0' }))}>
        <div
          className={cx(
            railColumn({ width: 'wide' }),
            css({ display: 'flex', flexDir: 'column', gap: '4' }),
          )}
        >
          <Suspense
            fallback={
              <>
                <LoadingPlaceholder height="96px" />
                <LoadingPlaceholder height="480px" />
              </>
            }
          >
            <PostListView selectedSlug={selectedSlug} onSelect={select} />
          </Suspense>
        </div>
      </div>
      <Inspector slug={selectedSlug} isWide={isWide} onClose={close} />
    </div>
  );
}
