/**
 * Analytics 도메인 타입 정의
 */

export interface PostStatDetail {
  slug: string;
  title: string;
  date: string | null;
  totalViews: number;
  todayViews: number;
  trends: { view_date: string; view_count: number }[];
  status: 'published' | 'draft' | 'scheduled';
  scheduledDate: string | null;
}

export interface HourlyDistribution {
  hour: number;
  view_count: number;
}

export interface DowDistribution {
  dow: number;
  view_count: number;
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
