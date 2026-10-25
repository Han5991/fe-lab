'use client';

import { Suspense, ViewTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { css, cva, cx } from '@blog/styled-system/css';
import { token } from '@blog/styled-system/tokens';
import {
  formatMonthDayISO,
  getKSTDateISO,
  resolvePostState,
} from '@blog/content/client';
import { TIMEZONE } from '@/content.values.mts';
import { actionButton } from '@/src/components/actionButton';
import { ChartTooltip } from '@/src/components/admin/ChartTooltip';
import { TimeSeriesChart } from '@/src/components/admin/TimeSeriesChart';
import {
  barFill,
  barShare,
  barTrack,
  enterMotion,
  panelIconButton,
  pillBadge,
  rowLink,
} from '@/src/components/admin/adminStyles';
import { CHART_MOTION, chartReveal } from '@/src/components/admin/chartMotion';
import { LoadingPlaceholder } from '@/src/components/shared/LoadingPlaceholder';
import { analyticsService } from '@/src/domain/analytics/admin';
import type { PostStatDetail } from '@/src/hooks/useAdminViews';
import { usePostDetailStats } from '@/src/hooks/usePostDetailStats';
import { ADMIN_VIEW_TRANSITION } from '@/src/shared/adminViewTransitions';
import { ADMIN_ANALYTICS_PATH } from '@/src/shared/routes';
import { DateRangeControls, useDateFilter } from './DateRangeControls';
import { StatusBadge } from './StatusBadge';
import { WeekGrowthIcon } from './WeekGrowthIcon';
import { livePostHref } from './postState';

// 차트 데이터 색(막대·커서)은 admin 보조 강조색 spot 하나다 — accent는 본문 잉크라 데이터를
// 칠하면 축·글자와 갈리지 않는다(blog-preset.ts의 spot 주석).
const CHART_DATA = token('colors.spot.600');
const CHART_AXIS = token('colors.ink.border');
const CHART_TICK = token('colors.ink.700');

/** 요일 이름 — 인덱스가 RPC의 dow(0=일~6=토)다. */
const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
/** 화면의 요일 순서 — 월요일부터. */
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** 패널 안쪽 — 목업의 위 16 · 좌우 24 · 아래 24, 덩어리 사이 16. */
const panelBody = css({
  px: '6',
  pt: '4',
  pb: '6',
  display: 'flex',
  flexDir: 'column',
  gap: '4',
});

const divider = css({ borderColor: 'ink.border' });

const sectionTitle = css({ textStyle: 'h4' });

const emptyNote = css({
  textStyle: 'body',
  color: 'ink.700',
  py: '6',
  textAlign: 'center',
});

// 증감 줄의 배치와 방향 색 — 방향은 런타임 값이라 정적 클래스 둘을 잇는다(한 `css()`에 섞으면 Panda가
// 그 호출을 추출하지 못한다).
const growthLine = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
});

const growthTone = cva({
  variants: {
    direction: {
      up: { color: 'moss.700' },
      down: { color: 'spot.600' },
      none: { color: 'ink.700' },
    },
  },
});

interface CloseProps {
  onClose: () => void;
}

function CloseButton({ onClose }: CloseProps) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="통계 닫기"
      className={panelIconButton}
    >
      <X size={16} aria-hidden />
    </button>
  );
}

/** 작은 지표 칸(7일 증감·피크·일평균) — 목업의 패널 안 타일(카드 안이라 element 라운드). */
function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className={css({
        p: '3',
        rounded: 'element',
        bg: 'ink.50',
        display: 'flex',
        flexDir: 'column',
        gap: '0.5',
        minW: '0',
      })}
    >
      <span className={css({ textStyle: 'supporting', color: 'ink.700' })}>
        {label}
      </span>
      {children}
    </div>
  );
}

const tileValue = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  textStyle: 'h3',
  fontVariantNumeric: 'tabular-nums',
});

/**
 * 시간대·요일 분포 — 글 하나의 Edge Function 두 번. 패널의 나머지보다 늦게 와서 따로 기다린다.
 * 드러날 때 스켈레톤이 걷히고 이 덩어리가 떠오른다. 시간대 차트는 다 그려진 채 투명도로 나타나고
 * (`chartReveal`), 요일 가로 막대(CSS)는 0에서 자란다.
 */
function PostDistributions({ post }: { post: PostStatDetail }) {
  const { hourly, dow } = usePostDetailStats(post);

  // 빈 시간대·요일은 0으로 채운다 — RPC는 조회가 있었던 칸만 준다.
  const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${hour}시`,
    views: hourly.find(h => h.hour === hour)?.view_count ?? 0,
  }));
  const dowData = DOW_ORDER.map(d => ({
    day: DOW_LABELS[d],
    views: dow.find(item => item.dow === d)?.view_count ?? 0,
  }));
  const maxHourly = Math.max(...hourlyData.map(d => d.views), 1);
  const maxDow = Math.max(...dowData.map(d => d.views), 1);

  return (
    <div
      className={css(enterMotion, {
        display: 'flex',
        flexDir: 'column',
        gap: '4',
      })}
    >
      <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        <h3 className={sectionTitle}>시간대별</h3>
        {/* 막대 불투명도는 값에 비례(0.3~1) — 많이 읽힌 시간대가 진하다. 값은 툴팁에 있다. */}
        <div className={css(chartReveal, { h: '[120px]', w: 'full' })}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={hourlyData}
              // 좌우 8 — 양끝 눈금 글자(0시·23시 자리)가 칸 밖으로 잘리지 않게.
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <XAxis
                dataKey="hour"
                axisLine={{ stroke: CHART_AXIS }}
                tickLine={false}
                tick={{ fill: CHART_TICK, fontSize: 12 }}
                interval={5}
              />
              <Tooltip
                cursor={{ fill: CHART_DATA, fillOpacity: 0.12 }}
                content={ChartTooltip}
              />
              <Bar dataKey="views" radius={[2, 2, 0, 0]} {...CHART_MOTION}>
                {hourlyData.map(entry => (
                  <Cell
                    key={entry.hour}
                    fill={CHART_DATA}
                    fillOpacity={0.3 + (entry.views / maxHourly) * 0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        <h3 className={sectionTitle}>요일별</h3>
        <ul className={css({ display: 'flex', flexDir: 'column', gap: '1.5' })}>
          {dowData.map(d => (
            <li
              key={d.day}
              className={css({
                display: 'grid',
                gridTemplateColumns: '[20px minmax(0, 1fr) 40px]',
                alignItems: 'center',
                gap: '2',
              })}
            >
              <span
                className={css({ textStyle: 'supporting', color: 'ink.700' })}
              >
                {d.day}
              </span>
              <span className={barTrack} aria-hidden>
                <span
                  className={barFill()}
                  style={barShare(d.views / maxDow)}
                />
              </span>
              <span
                className={css({
                  textStyle: 'supporting',
                  color: 'ink.700',
                  textAlign: 'end',
                  fontVariantNumeric: 'tabular-nums',
                })}
              >
                {d.views.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface PostStatsPanelProps extends CloseProps {
  post: PostStatDetail;
  /** 글 인덱스의 태그 — 대시보드 데이터에는 없다(`useAdminPostsWithTags`). */
  tags: readonly string[];
  /** 제목 헤딩의 id — 좁은 화면의 시트(다이얼로그)가 이름으로 쓴다. */
  titleId: string;
  /**
   * 그려질 때 제목으로 초점을 옮긴다 — 넓은 화면에서 목록 줄을 눌러 연 칼럼. 칼럼은 DOM에서 목록 뒤라
   * 옮기지 않으면 키보드로는 남은 줄 링크를 다 지나야 닿는다. 좁은 화면 시트는 `useModalDialog`가 옮긴다.
   * 주소로 바로 연 화면(딥링크)에서는 옮기지 않는다 — 사용자가 고른 것이 아니다.
   */
  focusTitle?: boolean;
}

/**
 * 글 하나의 통계 — 분석 화면 오른쪽 패널(좁은 화면은 시트)의 내용. 예전 목록 아코디언의 펼침과
 * 글별 페이지를 합쳤다: 메타(상태·작성일·글 열기) · 총 조회수·오늘·태그·마일스톤 · 7일 증감·피크·
 * 일평균 · 기간을 고르는 일별 추이 · 시간대·요일 분포.
 *
 * 글이 바뀌면 기간 선택이 처음으로 돌아가야 해서 부르는 쪽이 `key`를 slug로 준다.
 */
export function PostStatsPanel({
  post,
  tags,
  titleId,
  onClose,
  focusTitle = false,
}: PostStatsPanelProps) {
  const todayISO = getKSTDateISO(TIMEZONE);
  const derived = analyticsService.computeDerivedStats(post, todayISO);
  // frontmatter의 status(발행 의도)가 아니라 지금 실제로 공개 중인지로 배지와 글 링크를 정한다.
  const state = resolvePostState(post, TIMEZONE);
  const liveHref = livePostHref(post.slug, state);

  const {
    filterType,
    setFilterType,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dailyTrends,
    autoFellBackToAll,
    invalidRange,
  } = useDateFilter(post.trends, todayISO);
  const trendData = dailyTrends.map(d => ({
    date: formatMonthDayISO(d.view_date),
    value: d.view_count,
  }));

  const growth = derived.weekGrowthRate;
  const growthDirection =
    growth === null ? 'none' : growth >= 0 ? 'up' : 'down';

  return (
    <div className={panelBody}>
      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2',
        })}
      >
        <div
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '2',
            textStyle: 'supporting',
            color: 'ink.700',
          })}
        >
          <StatusBadge state={state} post={post} />
          {post.date && (
            <span className={css({ fontVariantNumeric: 'tabular-nums' })}>
              {post.date}
            </span>
          )}
        </div>
        <CloseButton onClose={onClose} />
      </div>

      <h2
        id={titleId}
        tabIndex={focusTitle ? -1 : undefined}
        // 그려지는 순간 한 번 — 효과 훅 없이 ref 콜백이 맡는다. 칼럼은 sticky라 스크롤은 막는다.
        ref={focusTitle ? el => el?.focus({ preventScroll: true }) : undefined}
        className={css({ textStyle: 'h2' })}
      >
        {post.title}
      </h2>

      <div
        className={css({
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '2',
        })}
      >
        {/* 새 탭은 문서를 처음부터 받으므로 Next `Link`(미리 받기·클라이언트 이동)가 아니라 `<a>`다. */}
        {liveHref !== null && (
          <a
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className={actionButton({ tone: 'solid', size: 'md' })}
          >
            <ExternalLink size={14} aria-hidden />글 열기{' '}
            <span className={css({ srOnly: true })}>(새 탭)</span>
          </a>
        )}
        <DateRangeControls
          filterType={filterType}
          setFilterType={setFilterType}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
        />
      </div>

      <hr className={divider} />

      <dl
        className={css({
          display: 'grid',
          gridTemplateColumns: '[96px minmax(0, 1fr)]',
          rowGap: '2',
          columnGap: '3',
          textStyle: 'body',
          '& dt': { color: 'ink.700' },
        })}
      >
        <dt>총 조회수</dt>
        <dd
          className={css({
            fontWeight: 'semibold',
            fontVariantNumeric: 'tabular-nums',
          })}
        >
          {post.totalViews.toLocaleString()}회
        </dd>
        <dt>오늘</dt>
        <dd
          className={css({
            fontVariantNumeric: 'tabular-nums',
            color: post.todayViews > 0 ? 'spot.600' : 'ink.700',
          })}
        >
          {post.todayViews > 0 ? `+${post.todayViews}` : '0'}
        </dd>
        <dt>태그</dt>
        <dd className={css({ display: 'flex', flexWrap: 'wrap', gap: '1' })}>
          {tags.length === 0 ? (
            <span className={css({ color: 'ink.700' })}>없음</span>
          ) : (
            tags.map(tag => (
              <span key={tag} className={css(pillBadge)}>
                #{tag}
              </span>
            ))
          )}
        </dd>
        <dt>마일스톤</dt>
        <dd>
          <ul className={css({ display: 'flex', flexDir: 'column', gap: '1' })}>
            {derived.milestones.map(m => (
              <li
                key={m.target}
                className={css({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2',
                })}
              >
                <span
                  aria-hidden
                  className={css(
                    { boxSize: '2', rounded: 'full', flexShrink: '0' },
                    m.reached
                      ? { bg: 'accent.solid' }
                      : {
                          borderWidth: 'hairline',
                          borderColor: 'ink.borderStrong',
                        },
                  )}
                />
                <span
                  className={css(
                    { fontVariantNumeric: 'tabular-nums' },
                    m.reached
                      ? { fontWeight: 'semibold' }
                      : { color: 'ink.700' },
                  )}
                >
                  {m.target.toLocaleString()}회
                </span>
                <span className={css({ srOnly: true })}>
                  {m.reached ? '달성' : '미달성'}
                </span>
                {m.reached && m.date && (
                  <span
                    className={css({
                      textStyle: 'supporting',
                      color: 'ink.700',
                      fontVariantNumeric: 'tabular-nums',
                    })}
                  >
                    {m.date}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </dd>
      </dl>

      <hr className={divider} />

      <div
        className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '2',
        })}
      >
        <StatTile label="7일 증감">
          <span
            className={cx(
              growthLine,
              growthTone({ direction: growthDirection }),
            )}
          >
            <WeekGrowthIcon rate={growth} size={14} />
            <span className={tileValue}>
              {growth === null ? '—' : `${growth >= 0 ? '+' : ''}${growth}%`}
            </span>
          </span>
        </StatTile>
        <StatTile label="피크">
          <span className={tileValue}>
            {derived.peakDay ? `${derived.peakDay.count}회` : '—'}
          </span>
          {derived.peakDay && (
            <span
              className={css({
                textStyle: 'supporting',
                color: 'ink.700',
                fontVariantNumeric: 'tabular-nums',
              })}
            >
              {derived.peakDay.date}
            </span>
          )}
        </StatTile>
        <StatTile label="일평균">
          <span className={tileValue}>{derived.dailyAverage}회</span>
        </StatTile>
      </div>

      <div className={css({ display: 'flex', flexDir: 'column', gap: '2' })}>
        <div
          className={css({
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '2',
          })}
        >
          <h3 className={sectionTitle}>일별 조회수</h3>
          {autoFellBackToAll && (
            <span
              className={css({ textStyle: 'supporting', color: 'ink.700' })}
            >
              최근 30일 데이터가 없어 전체 기간으로 표시 중
            </span>
          )}
        </div>
        {invalidRange ? (
          <p role="status" className={emptyNote}>
            시작일이 종료일보다 늦습니다. 기간을 다시 골라 주세요.
          </p>
        ) : trendData.length > 0 ? (
          <TimeSeriesChart data={trendData} height={160} />
        ) : (
          <p className={emptyNote}>해당 기간에 데이터가 없습니다.</p>
        )}
      </div>

      <Suspense
        fallback={
          <ViewTransition exit={ADMIN_VIEW_TRANSITION.out} default="none">
            <div
              className={css({ display: 'flex', flexDir: 'column', gap: '4' })}
            >
              <LoadingPlaceholder height="150px" />
              <LoadingPlaceholder height="180px" />
            </div>
          </ViewTransition>
        }
      >
        <PostDistributions post={post} />
      </Suspense>
    </div>
  );
}

interface PostNotFoundProps extends CloseProps {
  slug: string;
  titleId: string;
}

/** 목록에 없는 글(인덱스에서 빠진 글·손으로 친 주소) — 에러가 아니라 안내다. */
export function PostNotFound({ slug, titleId, onClose }: PostNotFoundProps) {
  return (
    <div role="status" className={panelBody}>
      <div className={css({ display: 'flex', justifyContent: 'flex-end' })}>
        <CloseButton onClose={onClose} />
      </div>
      <h2 id={titleId} className={css({ textStyle: 'h3' })}>
        이 글의 통계를 찾을 수 없습니다
      </h2>
      <p className={css({ textStyle: 'body', color: 'ink.700' })}>
        분석 목록에 <code>{slug || '(빈 slug)'}</code> 글이 없습니다. 주소를
        확인하거나 목록에서 다시 골라 주세요.
      </p>
      {/* 문장 밖의 독립 링크라 hover 밑줄로 가른다(blog-design-system 스킬 "색으로 갈리지 않는 자리"). */}
      <Link
        href={ADMIN_ANALYTICS_PATH}
        className={css(rowLink, { alignSelf: 'flex-start', textStyle: 'body' })}
      >
        조회수 분석 목록으로
      </Link>
    </div>
  );
}

/** 패널이 대시보드 데이터를 기다리는 동안. */
export function PanelSkeleton() {
  return (
    <div className={panelBody}>
      <LoadingPlaceholder height="96px" />
      <LoadingPlaceholder height="160px" />
      <LoadingPlaceholder height="200px" />
    </div>
  );
}
