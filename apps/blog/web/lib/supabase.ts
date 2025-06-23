import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

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

// 새로운 Analytics 인터페이스들
export interface PostAnalytics {
  id: number;
  slug: string;
  title?: string;
  total_views: number;
  unique_visitors: number;
  created_at: string;
  updated_at: string;
}

export interface PostViewLog {
  id: number;
  slug: string;
  visitor_id?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  viewed_at: string;
  session_id?: string;
  view_date: string;
  view_hour: number;
  view_day_of_week: number;
  view_month: number;
  view_year: number;
}

export interface DailyPostStats {
  id: number;
  slug: string;
  stat_date: string;
  views: number;
  unique_visitors: number;
  bounce_rate?: number;
  avg_time_on_page?: number;
  created_at: string;
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