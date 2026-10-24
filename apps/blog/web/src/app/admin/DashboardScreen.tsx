'use client';

import { startTransition, Suspense, useState, ViewTransition } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { css, cx } from '@blog/styled-system/css';
import { fmtNum, localeTag, resolvePostState } from '@blog/content/client';
import { SITE_LOCALE, TIMEZONE } from '@/content.values.mts';
import { railColumn, railGutter } from '@/src/components/Rail';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import { AdminCard } from '@/src/components/admin/AdminCard';
import { AdminPageHeader } from '@/src/components/admin/AdminPageHeader';
import { MetricCard } from '@/src/components/admin/MetricCard';
import {
  RefreshButton,
  RefreshFailedNote,
} from '@/src/components/admin/RefreshButton';
import { SegmentedControl } from '@/src/components/admin/SegmentedControl';
import { TagDistribution } from '@/src/components/admin/TagDistribution';
import { TimeSeriesChart } from '@/src/components/admin/TimeSeriesChart';
import { TopPostsTable } from '@/src/components/admin/TopPostsTable';
import {
  adminCard,
  adminCell,
  adminTable,
  adminTableBody,
  barFill,
  barShare,
  barTrack,
  cardTableBleed,
  enterMotion,
  enterOrderStyle,
  panelIconButton,
  rowLink,
  truncate,
} from '@/src/components/admin/adminStyles';
import {
  useAdminDashboardData,
  type PostStatDetail,
} from '@/src/hooks/useAdminViews';
import {
  useAnalyticsOverview,
  UNIQUES_ESTIMATE_RATIO,
} from '@/src/hooks/useAnalyticsOverview';
import { useAdminTagDistribution } from '@/src/hooks/useAdminTagDistribution';
import { countLivePosts } from '@/src/domain/analytics/admin';
// 공개 배럴은 조회수 저장소(publicClient)를 바인딩하므로 기간 정의만 든 순수 leaf를 연다.
import {
  ANALYTICS_RANGES,
  RANGE_DAYS,
  type AnalyticsRange,
} from '@/src/domain/analytics/ranges';
import {
  ADMIN_ANALYTICS_PATH,
  adminAnalyticsPostPath,
} from '@/src/shared/routes';
import { ADMIN_VIEW_TRANSITION } from '@/src/shared/adminViewTransitions';
import { livePostHref } from './components/postState';
import { PostTable, SORT_OPTIONS, usePostSort } from './components/PostTable';
import { StatusBadge } from './components/StatusBadge';

/** 누적 인기 글 카드에 싣는 글 수. */
const LIST_LIMIT = 5;

/** 태그 분포에 싣는 태그 수. */
const TAG_LIMIT = 8;

/** 기간의 화면 이름(`7일`) — 일수에서 만든다. 세그먼트와 카드 제목이 함께 쓴다. */
const rangeLabel = (range: AnalyticsRange) => `${RANGE_DAYS[range]}일`;

/** 집계 기간 세그먼트의 선택지 — 순서·값은 `ANALYTICS_RANGES`가 정한다. */
const RANGE_OPTIONS = ANALYTICS_RANGES.map(range => ({
  value: range,
  label: rangeLabel(range),
}));

const gridThree = css({
  display: 'grid',
  gridTemplateColumns: { base: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
  gap: '4',
});

// 승인 목업의 두 칸 비율(6:5) — 표가 넓은 쪽, 분포·짧은 목록이 좁은 쪽.
const gridSplit = css({
  display: 'grid',
  gridTemplateColumns: {
    base: '1fr',
    lg: '[minmax(0, 6fr) minmax(0, 5fr)]',
  },
  gap: '4',
});

const emptyNote = css({
  textStyle: 'body',
  color: 'ink.700',
  py: '6',
  textAlign: 'center',
});

/**
 * 공개 글의 실제 주소를 새 탭으로 여는 아이콘 — 목록 제목은 그 글의 admin 통계로 열기 때문에,
 * 글 자체로 가는 길은 여기 둔다. 정적 export는 비공개 글의 페이지를 만들지 않아 공개 글에만 있다.
 *
 * Next `Link`가 아니라 `<a>`다 — 새 탭은 어차피 문서를 처음부터 받으므로 클라이언트 이동이 할 일이
 * 없고, `Link`는 화면에 든 링크마다 글 페이지를 미리 받는다(「모든 글」만 45편).
 */
function LivePostLink({ post }: { post: PostStatDetail }) {
  const href = livePostHref(post.slug, resolvePostState(post, TIMEZONE));
  if (href === null) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${post.title} 글을 새 탭에서 열기`}
      className={panelIconButton}
    >
      <ExternalLink size={16} aria-hidden />
    </a>
  );
}

/** 제목 칸 — 그 글의 admin 통계로 여는 링크와, 공개 중이 아니면 상태 배지. */
function TitleCell({ post }: { post: PostStatDetail }) {
  const state = resolvePostState(post, TIMEZONE);
  return (
    <td className={adminCell()}>
      <span
        className={css({ display: 'flex', alignItems: 'center', gap: '2' })}
      >
        <Link
          href={adminAnalyticsPostPath(post.slug)}
          className={css(truncate, rowLink)}
        >
          {post.title}
        </Link>
        {state !== 'published' && <StatusBadge state={state} post={post} />}
      </span>
    </td>
  );
}

const linkHeadCell = css(adminCell.raw({ kind: 'head' }), { w: '12' });

/** 누적 상위 글 — 순위 · 제목 · 1위 대비 비중 · 누적 조회수(승인 목업의 인기 게시글). */
function CumulativeTopTable({ posts }: { posts: PostStatDetail[] }) {
  const max = posts[0]?.totalViews ?? 0;
  return (
    <div className={cardTableBleed}>
      <table className={adminTable}>
        <thead>
          <tr>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head' }), { w: '14' })}
            >
              순위
            </th>
            <th scope="col" className={adminCell({ kind: 'head' })}>
              제목
            </th>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head' }), {
                w: '28',
                display: { base: 'none', md: 'table-cell' },
              })}
            >
              비중
            </th>
            <th
              scope="col"
              className={css(adminCell.raw({ kind: 'head', align: 'end' }), {
                w: '20',
              })}
            >
              조회수
            </th>
            <th scope="col" className={linkHeadCell}>
              <span className={css({ srOnly: true })}>글 열기</span>
            </th>
          </tr>
        </thead>
        <tbody className={adminTableBody}>
          {posts.map((post, i) => (
            <tr key={post.slug}>
              <td
                className={css(adminCell.raw(), {
                  fontFamily: 'mono',
                  fontSize: '[13px]',
                  color: 'ink.700',
                })}
              >
                {String(i + 1).padStart(2, '0')}
              </td>
              <TitleCell post={post} />
              <td
                className={css(adminCell.raw(), {
                  display: { base: 'none', md: 'table-cell' },
                })}
              >
                <span className={barTrack} aria-hidden>
                  <span
                    className={barFill({ tone: 'ink' })}
                    style={barShare(max > 0 ? post.totalViews / max : 0)}
                  />
                </span>
              </td>
              <td
                className={css(adminCell.raw({ align: 'end' }), {
                  fontWeight: 'medium',
                })}
              >
                {post.totalViews.toLocaleString()}
              </td>
              <td className={adminCell({ align: 'end' })}>
                <LivePostLink post={post} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DashboardContent() {
  const { data, dataUpdatedAt, isFetching, isRefetchError, refetch } =
    useAdminDashboardData();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const overview = useAnalyticsOverview(range);
  const { tags, taggedPosts } = useAdminTagDistribution();
  const sort = usePostSort();

  const totalViews = data.reduce((acc, post) => acc + post.totalViews, 0);
  const todayViews = data.reduce((acc, post) => acc + post.todayViews, 0);
  // 기간 지표의 글당 평균과 같은 규칙(지금 공개 중인 글)으로 센다.
  const livePosts = countLivePosts(data, { timezone: TIMEZONE });
  const hiddenPosts = data.length - livePosts;
  const postBySlug = new Map(data.map(post => [post.slug, post]));

  const topPosts = [...data]
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, LIST_LIMIT);

  const days = rangeLabel(overview.range);

  // 기간을 바꾸는 것은 transition이다 — 지표 카드의 값 줄(`MetricCard`의 `<ViewTransition>`)이 이전
  // 값을 걷고 새 값을 띄우고, 나머지(제목의 일수·차트·표)는 루트 크로스페이드로 바뀐다 — 차트는 선을
  // 보간하지 않는다(`chartMotion.ts`).
  const changeRange = (next: AnalyticsRange) =>
    startTransition(() => setRange(next));

  return (
    <>
      <AdminPageHeader
        title="대시보드"
        description={
          <>
            누적 조회수 기준 · 업데이트:{' '}
            {new Date(dataUpdatedAt).toLocaleString(localeTag(SITE_LOCALE))}
            {isRefetchError && <RefreshFailedNote />}
          </>
        }
      />

      {/* ── 누적 — 요약 카드, 누적 인기 글, 태그 분포(승인 목업의 위 두 줄) ── */}
      <div className={gridThree}>
        <MetricCard
          level="h2"
          enterOrder={1}
          label="전체 조회수"
          value={totalViews.toLocaleString()}
          unit="회"
        >
          {data.length}편 누적
          {todayViews > 0 && (
            <span className={css({ color: 'spot.600', fontWeight: 'medium' })}>
              {' '}
              · 오늘 +{todayViews}
            </span>
          )}
        </MetricCard>
        <MetricCard
          level="h2"
          enterOrder={2}
          label="공개 게시글 수"
          value={String(livePosts)}
          unit="개"
        >
          {hiddenPosts > 0 ? `· 비공개·예약 ${hiddenPosts}개` : undefined}
        </MetricCard>
        <Link
          href={ADMIN_ANALYTICS_PATH}
          style={enterOrderStyle(3)}
          className={css(adminCard, enterMotion, {
            display: 'flex',
            flexDir: 'column',
            justifyContent: 'space-between',
            gap: '1',
            color: 'ink.950',
            transition: 'colors',
            _hover: { borderColor: 'ink.borderStrong' },
          })}
        >
          <span className={css({ textStyle: 'label', color: 'ink.700' })}>
            상세 분석
          </span>
          <span
            className={css({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '2',
            })}
          >
            <span className={css({ textStyle: 'h3' })}>
              글 목록 · 글별 일별 추이 · 시간대·요일 분포
            </span>
            <ArrowRight size={20} aria-hidden />
          </span>
        </Link>
      </div>

      <div className={gridSplit}>
        <AdminCard
          level="h2"
          enterOrder={2}
          title="인기 게시글"
          meta={`누적 상위 ${topPosts.length}편`}
        >
          <CumulativeTopTable posts={topPosts} />
        </AdminCard>
        <AdminCard
          level="h2"
          enterOrder={3}
          title="태그 분포"
          meta={`태그가 있는 ${taggedPosts}편 · 상위 ${Math.min(TAG_LIMIT, tags.length)}`}
        >
          {tags.length === 0 ? (
            <p className={emptyNote}>태그가 달린 글이 없습니다.</p>
          ) : (
            <TagDistribution
              tags={tags.slice(0, TAG_LIMIT)}
              highlightId={tags[0]?.id}
            />
          )}
        </AdminCard>
      </div>

      {/* ── 기간 추이 — 집계 기간(7·30·90일)을 고르는 절. 목업에는 없고 예전 분석 화면 위쪽에 있던 것 ── */}
      <section
        aria-labelledby="dashboard-period"
        className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
      >
        <div
          style={enterOrderStyle(3)}
          className={css(enterMotion, {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '3',
            pt: '4',
          })}
        >
          <div>
            <h2 id="dashboard-period" className={css({ textStyle: 'h2' })}>
              기간 추이
            </h2>
            <p className={css({ textStyle: 'supporting', color: 'ink.700' })}>
              최근 {days} · 증감은 직전 {days} 대비
            </p>
          </div>
          <SegmentedControl
            label="집계 기간"
            options={RANGE_OPTIONS}
            value={range}
            onChange={changeRange}
          />
        </div>

        <div className={gridThree}>
          <MetricCard
            level="h3"
            enterOrder={4}
            label={`조회수 · ${days}`}
            value={fmtNum(overview.total)}
            delta={overview.totalDelta}
            series={overview.totalSeries.map(d => d.value)}
          />
          <MetricCard
            level="h3"
            enterOrder={5}
            label={`방문 추정 · ${days}`}
            value={fmtNum(overview.uniques)}
            delta={overview.uniquesDelta}
          >
            조회수의 {Math.round(UNIQUES_ESTIMATE_RATIO * 100)}%로 추정
          </MetricCard>
          <MetricCard
            level="h3"
            enterOrder={6}
            label={`글당 평균 · ${days}`}
            value={fmtNum(overview.avgPerPost)}
            unit="회"
          >
            공개 글 {overview.postsPublished}편 기준
          </MetricCard>
        </div>

        <AdminCard
          level="h3"
          enterOrder={5}
          title={`일별 조회수 · ${days}`}
          meta="일별 합산"
        >
          <TimeSeriesChart data={overview.totalSeries} />
        </AdminCard>

        <AdminCard
          level="h3"
          enterOrder={6}
          title={`기간 인기 글 · ${days}`}
          meta={`${overview.topPosts.length}편`}
        >
          {overview.topPosts.length === 0 ? (
            <p className={emptyNote}>해당 기간에 데이터가 없습니다.</p>
          ) : (
            <TopPostsTable
              rows={overview.topPosts}
              renderAction={row => {
                const post = postBySlug.get(row.slug);
                return post === undefined ? null : <LivePostLink post={post} />;
              }}
            />
          )}
        </AdminCard>
      </section>

      {/* ── 모든 글 — 승인 목업의 맨 아래 표. 분석 화면의 목록과 같은 표이고, 제목은 그 글이 고른
          분석 화면으로, 줄 끝 아이콘은 실제 글로 간다. 예전 「최근 게시글」(작성일 최근 5편)은 이 표의
          기본 정렬(작성일 내림차순) 첫 다섯 줄이다. ── */}
      <AdminCard
        level="h2"
        enterOrder={7}
        title="모든 글"
        meta={`${data.length}편`}
        actions={
          <>
            <SegmentedControl
              label="정렬 기준"
              options={SORT_OPTIONS}
              value={sort.field}
              onChange={sort.changeField}
            />
            <RefreshButton
              isFetching={isFetching}
              onRefresh={() => void refetch()}
            />
          </>
        }
      >
        <PostTable
          frame="bleed"
          posts={data}
          sort={sort}
          emptyMessage="게시글 데이터가 없습니다."
          renderAction={post => <LivePostLink post={post} />}
        />
      </AdminCard>
    </>
  );
}

/**
 * 데이터를 기다리는 동안의 자리 — 드러날 때 내용과 교차한다: 스켈레톤은 `<ViewTransition>`의 exit로
 * 제자리에서 걷히고(fast·exit), 같은 순간 내용의 카드들이 차례로 떠오른다(`enterMotion`). 높이는
 * 처음 화면에 보이는 머리·지표 줄·둘째 줄의 실측(1280px — 머리 101, 지표 카드 114, 다섯 줄 표 카드
 * 339 — 옆의 태그 분포 카드가 같은 줄 높이로 늘어난다)이라 드러날 때 카드가 제자리에서 바뀐다.
 */
function DashboardSkeleton() {
  return (
    <>
      <LoadingPlaceholder height="101px" />
      <div className={gridThree}>
        <LoadingPlaceholder height="114px" />
        <LoadingPlaceholder height="114px" />
        <LoadingPlaceholder height="114px" />
      </div>
      <div className={gridSplit}>
        <LoadingPlaceholder height="339px" />
        <LoadingPlaceholder height="339px" />
      </div>
    </>
  );
}

/**
 * admin 대시보드 — 승인 목업 순서대로 누적 요약(조회수·공개 글·상세 분석으로 가는 카드), 누적 인기
 * 글·태그 분포, 그리고 맨 아래 모든 글 표다. 목업에 없는 기간 추이(7·30·90일 지표·일별 시계열·기간
 * 인기 글)는 누적 두 줄과 모든 글 사이에 둔다 — 45줄 표 아래로 내리면 화면 여러 장 밑에 묻힌다.
 * 예전에는 누적 요약이 여기, 기간 추이가 `/admin/analytics/`에 따로 있었다.
 *
 * 페이지(`page.tsx`)는 서버 컴포넌트로 남아 페이지 전환 경계(`PageBoundary`)만 씌운다 — 경계를
 * 클라이언트 그래프에 들이지 않는다.
 */
export function DashboardScreen() {
  return (
    <div className={cx(railGutter, css({ pb: '12' }))}>
      <div
        className={cx(
          railColumn({ width: 'wide' }),
          css({ display: 'flex', flexDir: 'column', gap: '6' }),
        )}
      >
        <Suspense
          fallback={
            <ViewTransition exit={ADMIN_VIEW_TRANSITION.out} default="none">
              <DashboardSkeleton />
            </ViewTransition>
          }
        >
          <DashboardContent />
        </Suspense>
      </div>
    </div>
  );
}
