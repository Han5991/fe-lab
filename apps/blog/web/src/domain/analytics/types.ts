/**
 * Analytics 도메인 타입 정의
 *
 * DB에서 그대로 오는 행 타입은 손으로 다시 적지 않고 `database.types.ts`
 * (`pnpm gen:types` 산출물)에서 파생한다 — 스키마가 바뀌면 여기가 아니라 그
 * 파일을 재생성하고, 컬럼이 사라지거나 이름이 바뀌면 소비처가 컴파일 에러가 된다.
 *
 * 단, 생성 타입이 nullability까지 맞혀 주지는 않는다. RPC의 `RETURNS TABLE`
 * 선언은 컬럼이 nullable이어도 non-null로 나온다(예: `get_all_post_stats`의
 * `total_views`는 nullable한 `post_views.view_count`에서 온다). 그 정규화는
 * repository의 `Number()`가 맡는다.
 */

import type { PostStatus } from '@blog/content';
import type { Database, Tables } from '../../lib/platform/database.types';

type DbFunctions = Database['public']['Functions'];

// ── DB 행 타입 (database.types.ts에서 파생) ───────────────────────────────────

/** `post_views` 한 행. */
export type PostViewsRow = Tables<'post_views'>;

/**
 * `post_views` 프로젝션 — 공개 페이지의 인기순 정렬·조회수 표시용.
 * `view_count`는 DB에서 nullable(`bigint default 0`)이라 repository가 0으로 정규화한다.
 */
export interface TopPostRow extends Pick<PostViewsRow, 'slug'> {
  view_count: NonNullable<PostViewsRow['view_count']>;
}

/** `get_all_post_stats` RPC 한 행 — 글별 누적·오늘 조회수. */
export type PostStatsRow = DbFunctions['get_all_post_stats']['Returns'][number];

/** `get_all_posts_trends` RPC 한 행 — 글별·일별(KST) 조회수. */
export type PostTrendRow =
  DbFunctions['get_all_posts_trends']['Returns'][number];

/** 글 하나의 일별 추이 한 점 — `PostTrendRow`에서 slug를 뗀 것. */
export type TrendPoint = Pick<PostTrendRow, 'view_date' | 'view_count'>;

/** `get_post_hourly_distribution` RPC 한 행 — 시간대(0~23, KST)별 조회수. */
export type HourlyDistribution =
  DbFunctions['get_post_hourly_distribution']['Returns'][number];

/** `get_post_dow_distribution` RPC 한 행 — 요일(0=일~6=토, KST)별 조회수. */
export type DowDistribution =
  DbFunctions['get_post_dow_distribution']['Returns'][number];

// ── 도메인 모델 ────────────────────────────────────────────────────────────────

export interface PostStatDetail {
  slug: string;
  title: string;
  date: string | null;
  totalViews: number;
  todayViews: number;
  trends: TrendPoint[];
  status: PostStatus;
  scheduledDate: string | null;
}

export interface DerivedStats {
  weekGrowthRate: number | null;
  peakDay: { date: string; count: number } | null;
  dailyAverage: number;
  milestones: { target: number; reached: boolean; date: string | null }[];
}

export interface PostDetailStats {
  post: PostStatDetail;
  hourly: HourlyDistribution[];
  dow: DowDistribution[];
  derived: DerivedStats;
}
