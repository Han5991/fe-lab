'use client';

import {
  Suspense,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  ViewTransition,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { css, cva, cx } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import { localeTag } from '@blog/content/client';
import { SITE_LOCALE } from '@/content.values.mts';
import { Portal } from '@/src/components/Portal';
import { railColumn, railGutter } from '@/src/components/Rail';
import { AdminPageHeader } from '@/src/components/admin/AdminPageHeader';
import {
  RefreshButton,
  RefreshFailedNote,
} from '@/src/components/admin/RefreshButton';
import { SegmentedControl } from '@/src/components/admin/SegmentedControl';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import { siteHeaderStyle } from '@/src/components/siteHeader';
import { useModalDialog } from '@/src/components/useModalDialog';
import { useHeldUntilExit, type HeldValue } from '@/src/components/usePresence';
import { useAdminPostsWithTags } from '@/src/hooks/useAdminPostTags';
import { useAdminDashboardData } from '@/src/hooks/useAdminViews';
import { usePrefetchPostDetailStats } from '@/src/hooks/usePostDetailStats';
import {
  ADMIN_ANALYTICS_PATH,
  adminAnalyticsPostPath,
  adminAnalyticsSlugFromPath,
} from '@/src/shared/routes';
import { ADMIN_VIEW_TRANSITION } from '@/src/shared/adminViewTransitions';
import {
  PanelSkeleton,
  PostNotFound,
  PostStatsPanel,
  type PanelPlacement,
} from '../components/PostStatsPanel';
import { PostTable, SORT_OPTIONS, usePostSort } from '../components/PostTable';

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
 *
 * Next는 그 맞춤을 `startTransition`으로 넘긴다 — 그래서 고르기·닫기는 React transition이고, 패널
 * 내용(다른 글로 바꿀 때)·시트의 `<ViewTransition>`이 그 커밋에서 들어오고 나간다(Next 16 `restore`).
 * 넓은 화면 칼럼의 열고 닫음은 View Transition이 아니다(`layout`).
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
  const sort = usePostSort();

  const totalViews = data.reduce((acc, post) => acc + post.totalViews, 0);
  const needle = query.trim().toLowerCase();
  // 검색 입력은 transition이 아니라 행이 즉시 걸러진다(정렬만 목록이 교차한다 — `usePostSort`).
  const visible =
    needle === ''
      ? data
      : data.filter(post => post.title.toLowerCase().includes(needle));

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
            {isRefetchError && <RefreshFailedNote />}
          </>
        }
        // 검색·정렬·새로고침이 제목과 한 줄에 들도록(목업 — lg에서 목록 칸 816) 새로고침은 아이콘만 둔다.
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
                })}
              />
            </label>
            <SegmentedControl
              label="정렬 기준"
              options={SORT_OPTIONS}
              value={sort.field}
              onChange={sort.changeField}
            />
            <RefreshButton
              iconOnly
              isFetching={isFetching}
              onRefresh={() => void refetch()}
            />
          </>
        }
      />
      <PostTable
        posts={visible}
        sort={sort}
        selection={{ slug: selectedSlug, onSelect }}
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
  // 폭은 트랙이 아니라 칼럼 자신의 것이다 — 열고 닫는 동안 트랙이 0 ↔ 400으로 바뀌어도 내용은 400 그대로 트랙
  // 왼쪽 끝(= 목록의 오른쪽 끝)에 붙어 함께 밀려 오고 나간다. 트랙 밖으로 넘친 쪽은 `layout`이 자른다.
  w: 'inspector',
  // 관리자 바(48) 아래를 화면 끝까지 채우고 안에서 스크롤한다 — 목록이 길어도 패널은 제자리다.
  h: '[calc(100dvh - var(--site-header-height))]',
  overflowY: 'auto',
  bg: 'surface.raised',
  borderLeftWidth: 'hairline',
  borderColor: 'ink.border',
});

/**
 * lg 이상의 패널 칼럼 — 목록 옆 `글 통계` 영역. 높이를 관리자 바 변수에서 계산한다. 닫히며 빠져나가는
 * 동안(`leaving`)은 inert다 — 곧 사라질 칼럼에 초점·포인터가 들어가지 않게.
 */
function PanelColumn({
  leaving,
  children,
}: {
  leaving: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="글 통계"
      inert={leaving}
      style={siteHeaderStyle}
      className={panelColumn}
    >
      {children}
    </section>
  );
}

/**
 * lg 미만의 시트 — 패널을 목록 위에 덮는 면. sm 이상은 화면 오른쪽 끝에 붙은 400 드로어, sm 미만은
 * 화면 폭 전체다. 떠서 아래를 가리고 닫으면 사라지는 면이라 그림자가 붙는 유일한 admin 표면이다
 * (`overlay.high`, AGENTS.md §9 — 다이얼로그·시트는 high). 스크롤 잠금·초점 가두기·Escape는 검색·목차
 * 시트와 같은 `useModalDialog`가 맡는다.
 *
 * 움직임은 `<ViewTransition>`의 enter·exit다 — 열림·닫힘이 주소 변경(transition)이라 React가 이전
 * 화면의 스냅샷으로 닫히는 시트를 그려 주고, 시트는 닫히는 즉시 DOM에서 빠진다(퇴장 동안 마운트를
 * 붙들 상태가 없다). sm 미만은 아래에서 올라오고 그 위는 오른쪽에서 들어온다(globalCss의 admin
 * 블록). 뒤로 가기로 닫힐 때는 React가 그 커밋을 동기로 처리해 움직임 없이 사라진다.
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
      <ViewTransition
        enter={ADMIN_VIEW_TRANSITION.scrim}
        exit={ADMIN_VIEW_TRANSITION.scrim}
        default="none"
      >
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
      </ViewTransition>
      <ViewTransition
        enter={ADMIN_VIEW_TRANSITION.sheet}
        exit={ADMIN_VIEW_TRANSITION.sheet}
        default="none"
      >
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
            maxW: { sm: 'inspector' },
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
      </ViewTransition>
    </Portal>
  );
}

/**
 * 패널이 놓이는 자리. 넓은 화면의 칼럼은 열고 닫는 움직임을 그리드 트랙이 맡아(`layout`) 그 상태를 함께
 * 받는다 — 좁은 화면의 시트는 들고 남을 `<ViewTransition>`이 맡는다(`PostSheet`).
 */
type InspectorPlacement =
  | { mode: Extract<PanelPlacement, 'sheet'> }
  | ({ mode: Extract<PanelPlacement, 'column'> } & Pick<
      HeldValue<string>,
      'appeared' | 'leaving'
    >);

interface InspectorBodyProps {
  /** 넓은 화면은 칼럼이 그리는 글(닫히는 동안은 직전 글), 좁은 화면은 고른 글(있을 때만 시트). */
  slug: string | null;
  placement: InspectorPlacement;
  onClose: () => void;
  /** 칼럼을 사용자가 목록에서 골라 열었는가 — 그때만 제목으로 초점을 옮긴다(`PostStatsPanel`). */
  focusTitle: boolean;
}

/**
 * 고른 글의 통계 — 데이터 구독(대시보드 데이터·태그, 한 번에 기다린다)은 화면이 떠 있는 동안 여기 하나로
 * 유지한다.
 * 글을 고르고 닫을 때마다 구독을 붙였다 떼면 두 가지가 일어난다. 구독이 새로 붙는 마운트는 받은 지
 * 30초가 넘은 목록 전체를 뒤에서 다시 받고(`adminQueryDefaults` — 30초 안에는 받지 않는다), 이 구독만 여는
 * 태그 쿼리는 처음 열 때 비어 있어 패널이 한 번 더 suspend한다(`useAdminPostsWithTags`; 구독이 떨어진 뒤에도
 * 캐시는 gcTime 동안 남아 다시 열 때는 suspend하지 않는다). 그래서 고른 글이
 * 없어도(칼럼의 '고른 글 없음', 닫힌 시트) 이 컴포넌트는 남아 아무것도 그리지 않는다.
 */
function InspectorBody({
  slug,
  placement,
  onClose,
  focusTitle,
}: InspectorBodyProps) {
  const { posts, tagsBySlug } = useAdminPostsWithTags();
  const titleId = useId();

  if (slug === null) return null;

  const post = posts.find(item => item.slug === slug);
  const tags = tagsBySlug.get(slug);

  // 대시보드 데이터는 인덱스에서 만든다 — 한쪽에만 있는 글은 없지만, 둘 다 있을 때만 통계를 그린다.
  const content =
    post !== undefined && tags !== undefined ? (
      <PostStatsPanel
        key={post.slug}
        placement={placement.mode}
        post={post}
        tags={tags}
        titleId={titleId}
        onClose={onClose}
        focusTitle={placement.mode === 'column' && focusTitle}
      />
    ) : (
      <PostNotFound slug={slug} titleId={titleId} onClose={onClose} />
    );

  if (placement.mode === 'column') {
    // 칼럼은 그릴 글이 있을 때만 있다. 열고 닫는 움직임은 칼럼째 그리드 트랙이 맡는다(`layout`) — 닫히는 동안은
    // 직전 글을 붙들고 있다(`useHeldUntilExit`). 칼럼이 열린 채 다른 글로 바꾸면 내용 단위로 들고 난다 — slug가
    // key라 이전 내용은 오른쪽으로 밀려 나가고(fast·exit) 새 내용은 그 뒤 오른쪽 16px에서 밀려 온다
    // (fastMax·standard). 바꾸기가 주소 변경 transition이라 React가 이 경계를 움직인다(`navigateTo`).
    // 칼럼과 함께 생긴 내용(`appeared` — 열림)은 들어오지 않는다: 칼럼째 밀려 오는 중이고, 여기서 전환을 열면
    // React가 화면을 스냅샷으로 바꿔 줄어드는 목록 위에 옛 폭의 목록이 겹친다. 같은 글 안의 갱신(기간 선택, 분포
    // 도착)은 움직이지 않는다(`default="none"`).
    return (
      <PanelColumn leaving={placement.leaving}>
        <ViewTransition
          key={slug}
          enter={placement.appeared ? 'none' : ADMIN_VIEW_TRANSITION.slideIn}
          exit={ADMIN_VIEW_TRANSITION.slideOut}
          default="none"
        >
          {content}
        </ViewTransition>
      </PanelColumn>
    );
  }
  return (
    <PostSheet titleId={titleId} onClose={onClose}>
      {content}
    </PostSheet>
  );
}

interface InspectorProps {
  /** 고른 글 — 좁은 화면의 시트가 그린다. */
  slug: string | null;
  /** 넓은 화면의 칼럼이 그리는 글 — 닫히는 동안은 직전 글을 붙든다(`AnalyticsScreen`). */
  column: HeldValue<string>;
  isWide: boolean;
  onClose: () => void;
  focusTitle: boolean;
}

/**
 * 고른 글의 통계를 넓은 화면은 목록 옆 칼럼에, 좁은 화면은 시트에 그린다. 고른 글이 없으면 칼럼도
 * 없다(닫히며 빠져나간 뒤) — 목록이 화면 폭을 다 쓴다. 칼럼은 고른 글의 데이터를 기다리는 동안에도 자리를
 * 지킨다(스켈레톤). 데이터 구독(`InspectorBody`)은 고른 글이 없어도 아무것도 그리지 않고 남는다(그 주석).
 */
function Inspector({
  slug,
  column,
  isWide,
  onClose,
  focusTitle,
}: InspectorProps) {
  if (isWide) {
    return (
      <Suspense
        fallback={
          column.value === null ? null : (
            <PanelColumn leaving={column.leaving}>
              <ViewTransition exit={ADMIN_VIEW_TRANSITION.out} default="none">
                <PanelSkeleton />
              </ViewTransition>
            </PanelColumn>
          )
        }
      >
        <InspectorBody
          slug={column.value}
          placement={{
            mode: 'column',
            appeared: column.appeared,
            leaving: column.leaving,
          }}
          onClose={onClose}
          focusTitle={focusTitle}
        />
      </Suspense>
    );
  }
  return (
    <Suspense fallback={null}>
      <InspectorBody
        slug={slug}
        placement={{ mode: 'sheet' }}
        onClose={onClose}
        focusTitle={false}
      />
    </Suspense>
  );
}

/**
 * 목록 | 글 통계 칼럼. 칼럼을 열고 닫는 움직임은 두 번째 트랙의 폭(0 ↔ 400) 하나다 — 목록의 오른쪽 끝과
 * 칼럼의 왼쪽 끝이 같은 선이라 둘이 같은 시간·곡선(medium·standard)으로 함께 줄고 늘고, 목록은 매 프레임
 * 그 폭에 다시 배치된다(작성일·조회수 칸이 칼럼 끝을 따라 밀린다). 제목 칸은 한 줄 말줄임이라 줄 높이는
 * 흔들리지 않는다.
 *
 * View Transition으로 하지 않는 이유: 전환은 화면을 스냅샷으로 바꿔 그리므로 그 사이의 배치를 보여 줄 수
 * 없다. 예전에는 목록이 첫 프레임에 새 폭으로 바뀌고(열 때 칸들이 400px 왼쪽으로 튀었다) 그 빈자리로
 * 칼럼이 뒤따라 들어왔다. 그래서 열고 닫는 커밋은 전환을 열지 않는다 — 칼럼과 함께 생긴 내용은 들어오지
 * 않고(`InspectorBody`), 닫힐 때 칼럼은 직전 글을 붙든 채 나간다(`useHeldUntilExit`). 브라우저 뒤로 가기로
 * 닫혀도 같은 길이다.
 */
const layout = cva({
  base: {
    display: 'grid',
    // 패널은 sticky라 칸이 자기 높이만 차지해야 한다.
    alignItems: 'start',
    transitionProperty: 'grid-template-columns',
    transitionDuration: 'medium',
    transitionTimingFunction: 'standard',
    // 트랙보다 넓은 칼럼(열고 닫는 동안)이 화면 오른쪽 밖으로 넘친 쪽을 자른다. `clip`은 스크롤 상자를
    // 만들지 않아 칼럼의 sticky가 그대로 문서 스크롤을 따른다(`hidden`이면 이 요소에 묶여 멈춘다).
    overflowX: 'clip',
  },
  variants: {
    // 고른 글이 있는 넓은 화면만 칼럼 트랙이 열린다 — 고른 글이 없으면 목록이 폭을 다 쓴다.
    panel: {
      true: { gridTemplateColumns: '[minmax(0, 1fr) token(sizes.inspector)]' },
      false: { gridTemplateColumns: '[minmax(0, 1fr) 0px]' },
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
  const layoutRef = useRef<HTMLDivElement>(null);
  // 칼럼이 그리는 글 — 닫히면 트랙이 0으로 줄어드는 동안 직전 글을 붙든다(`layout`). 좁은 화면에는 칼럼이 없다.
  const column = useHeldUntilExit(
    isWide ? selectedSlug : null,
    layoutRef,
    'grid-template-columns',
  );

  // 목록에서 고른 글일 때만 칼럼 제목으로 초점을 옮긴다 — 주소로 바로 연 화면이나 뒤로·앞으로 가기로
  // 바뀐 글은 그대로 둔다(고른 slug와 지금 주소의 slug가 같을 때만).
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const select = (slug: string) => {
    setFocusedSlug(slug);
    navigateTo(adminAnalyticsPostPath(slug));
  };
  const close = () => {
    setFocusedSlug(null);
    // 넓은 화면의 칼럼은 닫으면 빠져나가는 동안 inert가 되고 곧 통째로 빠져, 초점을 든 닫기 버튼과 함께 초점이
    // 문서 처음으로 떨어진다. 그 전에 고른 줄의 제목 링크로 돌려준다 — 목록의 어디까지 왔는지 잃지 않게. 좁은
    // 화면 시트는 `useModalDialog`가 연 자리로 돌려준다.
    // 고른 줄이 검색으로 걸러져 목록에 없으면 검색 입력으로 돌려준다.
    if (isWide) {
      const list = listRef.current;
      (
        list?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ??
        list?.querySelector<HTMLInputElement>('input[type="search"]')
      )?.focus({ preventScroll: true });
    }
    navigateTo(ADMIN_ANALYTICS_PATH);
  };

  return (
    <div
      ref={layoutRef}
      className={layout({ panel: isWide && selectedSlug !== null })}
    >
      {selectedSlug !== null && <PrefetchPostStats slug={selectedSlug} />}
      <div className={cx(railGutter, css({ pb: '12', minW: '0' }))}>
        <div
          ref={listRef}
          className={cx(
            railColumn({ width: 'wide' }),
            css({ display: 'flex', flexDir: 'column', gap: '4' }),
          )}
        >
          {/* 드러날 때 스켈레톤은 걷히고(exit) 머리·목록이 차례로 떠오른다(`enterMotion`). */}
          <Suspense
            fallback={
              <ViewTransition exit={ADMIN_VIEW_TRANSITION.out} default="none">
                <LoadingPlaceholder height="96px" />
                <LoadingPlaceholder height="480px" />
              </ViewTransition>
            }
          >
            <PostListView selectedSlug={selectedSlug} onSelect={select} />
          </Suspense>
        </div>
      </div>
      <Inspector
        slug={selectedSlug}
        column={column}
        isWide={isWide}
        onClose={close}
        focusTitle={selectedSlug !== null && focusedSlug === selectedSlug}
      />
    </div>
  );
}
