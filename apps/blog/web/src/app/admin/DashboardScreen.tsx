'use client';

import { startTransition, Suspense, useState, ViewTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { css, cx } from '@blog/styled-system/css';
import { fmtNum, localeTag, resolvePostState } from '@blog/content/client';
import { SITE_LOCALE, TIMEZONE } from '@/content.values.mts';
import { pressCardLink } from '@/src/components/interaction';
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
import { StatusBadge } from './components/StatusBadge';

/** 누적 인기 글 카드에 싣는 글 수. */
const LIST_LIMIT = 5;

/**
 * 공개 게시글 수 카드 아래 한 줄에 싣는 태그 수 — 태그 분포는 판단에 쓰는 지표가 아니라 카드 한 장을
 * 내주지 않고 이 줄로 줄였다. 카드 폭(md 이상 1/3)에 한 줄로 들어가는 만큼이고, 넘치면 말줄임이다.
 */
const TOP_TAG_LIMIT = 3;

/** 일별 조회수 차트의 높이(px) — 차트와, 차트 청크를 기다리는 골격이 함께 쓴다(들어설 때 아래가 밀리지 않게). */
const PERIOD_CHART_HEIGHT = 240;

// 일별 조회수 차트는 Recharts(~110KB gzip)를 싣는다 — 대시보드의 다른 칸은 Recharts를 쓰지 않으므로 차트만
// 따로 나눠 받아 첫 로드(문서가 부르는 JS)에서 뺀다. 받는 동안은 같은 높이의 골격이 자리를 지킨다. Recharts
// 청크는 분석 화면과 같은 것이라, 하이드레이션 뒤 관리자 바의 분석 링크 프리페치가 먼저 받아 두는 일이 많다.
const TimeSeriesChart = dynamic(
  () =>
    import('@/src/components/admin/TimeSeriesChart').then(
      mod => mod.TimeSeriesChart,
    ),
  {
    ssr: false,
    loading: () => <LoadingPlaceholder height={`${PERIOD_CHART_HEIGHT}px`} />,
  },
);

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

const supportingLine = css({ display: 'block' });

const tagLine = css({
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
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
 * 없고, `Link`는 화면에 든 링크마다 글 페이지를 미리 받는다.
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
  const { tags } = useAdminTagDistribution();
  const topTags = tags.slice(0, TOP_TAG_LIMIT);
  const topTagText = topTags.map(tag => `#${tag.id} ${tag.count}`).join(' · ');

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

  // 기간을 바꾸는 것은 transition이다 — 움직이는 것은 지표 카드의 값 줄(`MetricCard`의 `<ViewTransition>`)
  // 뿐이고 이전 값을 걷은 뒤 새 값을 띄운다. 나머지(제목의 일수·차트·표·세그먼트 표식)는 스냅샷 없이
  // 곧바로 바뀐다 — React가 이 transition의 새 화면에서 루트를 빼서(`view-transition-name: none`) 루트
  // 크로스페이드가 없다(실측). 차트는 선을 보간하지 않는다(`chartMotion.ts`). View Transition은 한 번에
  // 하나라, 하나가 도는 동안(~480ms) 다시 고르면 React가 그 끝까지 커밋을 미뤘다가 마지막 값으로 한 번 더 돈다.
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
        // 「모든 글」 표를 걷으며 그 카드에 있던 새로고침을 머리로 올렸다(분석 화면과 같은 자리).
        actions={
          <RefreshButton
            isFetching={isFetching}
            onRefresh={() => void refetch()}
          />
        }
      />

      {/* ── 누적 — 요약 카드(태그는 공개 게시글 수 카드의 한 줄), 누적 인기 글 ── */}
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
          {hiddenPosts > 0 || topTags.length > 0 ? (
            <>
              {hiddenPosts > 0 && (
                <span className={supportingLine}>
                  비공개·예약 {hiddenPosts}개
                </span>
              )}
              {topTags.length > 0 && (
                <span className={tagLine} title={topTagText}>
                  주요 태그 {topTagText}
                </span>
              )}
            </>
          ) : undefined}
        </MetricCard>
        {/* 카드 자신이 링크라 `pressCardLink`다. */}
        <Link
          href={ADMIN_ANALYTICS_PATH}
          style={enterOrderStyle(3)}
          className={css(adminCard, enterMotion, pressCardLink, {
            display: 'flex',
            flexDir: 'column',
            justifyContent: 'space-between',
            gap: '1',
            color: 'ink.950',
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

      <AdminCard
        level="h2"
        enterOrder={2}
        title="인기 게시글"
        meta={`누적 상위 ${topPosts.length}편`}
      >
        <CumulativeTopTable posts={topPosts} />
      </AdminCard>

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
          <TimeSeriesChart
            data={overview.totalSeries}
            height={PERIOD_CHART_HEIGHT}
          />
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
    </>
  );
}

/**
 * 데이터를 기다리는 동안의 자리 — 드러날 때 내용과 교차한다: 스켈레톤은 `<ViewTransition>`의 exit로
 * 제자리에서 걷히고(fast·exit), 같은 순간 내용의 카드들이 차례로 떠오른다(`enterMotion`). 높이는
 * 처음 화면에 보이는 머리·지표 줄·둘째 줄의 실측(1280px — 머리 101, 지표 카드 114, 다섯 줄 표 카드
 * 339)이라 드러날 때 카드가 제자리에서 바뀐다.
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
      <LoadingPlaceholder height="339px" />
    </>
  );
}

/**
 * admin 대시보드 — 승인 목업 순서대로 누적 요약(조회수·공개 글·상세 분석으로 가는 카드), 누적 인기
 * 글, 그리고 기간 추이(7·30·90일 지표·일별 시계열·기간 인기 글)다. 태그 분포는 공개 게시글 수 카드 아래
 * 한 줄(주요 태그)로 줄였고, 목업 맨 아래의 「모든 글」 표는 분석 화면의 목록과 같은 표라 대시보드에서
 * 걷었다(글 목록은 분석 화면이 맡는다).
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
