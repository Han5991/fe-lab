import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const client = createClient<Database>(supabaseUrl, supabaseKey);

export interface SupabasePostData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  date: string | null;
  created_at: string;
  updated_at: string;
}

// 새로운 Analytics 인터페이스들 (Supabase 생성 타입과 일치)
export interface PostAnalytics {
  id: number;
  slug: string;
  title: string | null;
  total_views: number | null;
  unique_visitors: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PostViewLog {
  id: number;
  slug: string;
  visitor_id: string | null;
  ip_address: unknown | null;
  user_agent: string | null;
  referrer: string | null;
  viewed_at: string | null;
  session_id: string | null;
  view_date: string | null;
  view_hour: number | null;
  view_day_of_week: number | null;
  view_month: number | null;
  view_year: number | null;
}

export interface DailyPostStats {
  id: number;
  slug: string;
  stat_date: string;
  views: number | null;
  unique_visitors: number | null;
  bounce_rate: number | null;
  avg_time_on_page: number | null;
  created_at: string | null;
}

// 통계 조회 결과 타입들
export interface DailyViewTrend {
  stat_date: string;
  total_views: number;
  unique_visitors: number;
}

export interface MonthlyViewTrend {
  month_date: string;
  total_views: number;
  unique_visitors: number;
}

export interface PopularPost {
  slug: string;
  total_views: number;
  unique_visitors: number;
}

export interface WeeklyTrafficPattern {
  day_of_week: number;
  day_name: string;
  total_views: number;
}

export interface HourlyTrafficPattern {
  hour: number;
  total_views: number;
}

// 종합 Analytics 데이터 타입
export interface AnalyticsData {
  daily: DailyViewTrend[];
  monthly: MonthlyViewTrend[];
  popular_posts: PopularPost[];
  hourly_pattern: HourlyTrafficPattern[];
  weekly_pattern: WeeklyTrafficPattern[];
}
