import type {
  AnalyticsData,
  DailyViewTrend,
  HourlyTrafficPattern,
  MonthlyViewTrend,
  PopularPost,
  PostAnalytics,
  PostViewLog,
  WeeklyTrafficPattern,
} from './client';
import { client } from './client';

// 쿠키 유틸리티 함수
function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const nameWithEqual = name + '=';
  const cookies = document.cookie.split(';');
  const foundCookie = cookies.find(cookie => {
    const trimmedCookie = cookie.trim();
    return trimmedCookie.startsWith(nameWithEqual);
  });

  if (foundCookie) return foundCookie.substring(nameWithEqual.length);
  return null;
}

function generateVisitorId() {
  const existingId = getCookie('visitor_id');
  if (existingId) return existingId;

  // 새로운 visitor_id 생성 (간단한 랜덤 ID)
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  const visitorId = `v_${timestamp}_${randomPart}`;

  // 쿠키에 1일 만료시간으로 저장
  setCookie('visitor_id', visitorId, 1);

  return visitorId;
}

function generateCookieKey(preFix: string, slug: string) {
  return `${preFix}_${slug.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

// 12시간 쿨다운 체크 함수 (포스트별 독립적)
function checkViewCooldown(slug: string): boolean {
  const cooldownKey = generateCookieKey('last_view', slug);
  const lastViewTime = getCookie(cooldownKey);
  if (!lastViewTime) return true;

  const lastView = parseInt(lastViewTime);
  const now = Date.now();
  const timeDiff = now - lastView;
  const cooldownPeriod = 12 * 60 * 60 * 1000;
  const remainingTime = cooldownPeriod - timeDiff;
  return remainingTime <= 0;
}

function setViewCooldown(slug: string) {
  const cooldownKey = generateCookieKey('last_view', slug);
  const now = Date.now().toString();
  setCookie(cooldownKey, now, 1);
}

// 디버깅용: 현재 쿠키 상태 확인
export function debugViewCooldowns(): void {
  if (typeof document === 'undefined') return;

  console.log('=== 현재 설정된 조회수 쿨다운 쿠키들 ===');
  const cookies = document.cookie.split(';');
  const viewCookies = cookies.filter(cookie =>
    cookie.trim().startsWith('last_view_'),
  );

  if (viewCookies.length === 0) {
    console.log('설정된 쿨다운 쿠키가 없습니다.');
    return;
  }

  viewCookies.forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    const slug = key.replace('last_view_', '').replace(/_/g, '-');
    const timestamp = parseInt(value);
    const date = new Date(timestamp);
    const timeLeft = timestamp + 12 * 60 * 60 * 1000 - Date.now();

    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      console.log(
        `📄 "${slug}": 쿨다운 ${hours}h ${minutes}m 남음 (마지막 조회: ${date.toLocaleString()})`,
      );
    } else {
      console.log(
        `📄 "${slug}": 쿨다운 만료됨 (마지막 조회: ${date.toLocaleString()})`,
      );
    }
  });
  console.log('==========================================');
}

// 클라이언트 사이드 폴백 카운팅 (localStorage 기반)
function getClientSideViewCount(slug: string): number {
  if (typeof window === 'undefined') return 0;

  try {
    const counts = JSON.parse(
      localStorage.getItem('client_view_counts') || '{}',
    );
    return counts[slug] || 0;
  } catch {
    return 0;
  }
}

function setClientSideViewCount(slug: string, count: number): void {
  if (typeof window === 'undefined') return;

  try {
    const counts = JSON.parse(
      localStorage.getItem('client_view_counts') || '{}',
    );
    counts[slug] = count;
    localStorage.setItem('client_view_counts', JSON.stringify(counts));
    console.log(`[Analytics] 💾 Client-side count saved: ${slug} = ${count}`);
  } catch (error) {
    console.error('[Analytics] Failed to save client-side count:', error);
  }
}

export async function incrementViewCount(slug: string) {
  try {
    const visitorId = generateVisitorId();
    const userAgent =
      typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    const canIncrement = checkViewCooldown(slug);
    if (!canIncrement) return await getViewCount(slug);
    try {
      const { data, error } = await client.rpc('increment_post_views', {
        post_slug: slug,
        visitor_session_id: visitorId,
        visitor_user_agent: userAgent,
        visitor_referrer: referrer,
      });

      if (!error) {
        setViewCooldown(slug);
        return data;
      }

      throw new Error('New system not available');
    } catch {
      // 기존 시스템으로 폴백 (프로덕션 호환)
      return await legacyIncrementViewCount(slug);
    }
  } catch {
    return 0;
  }
}

async function legacyIncrementViewCount(slug: string) {
  try {
    // 기존 post_analytics 테이블 확인 (프로덕션에 있을 가능성)
    const { data: existing } = await client
      .from('post_analytics')
      .select('total_views')
      .eq('slug', slug)
      .single();

    if (
      existing &&
      existing.total_views !== null &&
      typeof existing.total_views === 'number'
    ) {
      // 기존 레코드 업데이트
      const { data, error } = await client
        .from('post_analytics')
        .update({
          total_views: existing.total_views + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('slug', slug)
        .select('total_views')
        .single();

      if (
        !error &&
        data &&
        data.total_views !== null &&
        typeof data.total_views === 'number'
      ) {
        setViewCooldown(slug);
        console.log('[Analytics] ✅ Legacy system: view count updated');
        return data.total_views;
      }

      // 업데이트 실패 시 기존 값 반환
      return existing.total_views;
    } else {
      // 새 레코드 생성
      const { data, error } = await client
        .from('post_analytics')
        .insert([
          {
            slug,
            total_views: 1,
            updated_at: new Date().toISOString(),
          },
        ])
        .select('total_views')
        .single();

      if (
        !error &&
        data &&
        data.total_views !== null &&
        typeof data.total_views === 'number'
      ) {
        setViewCooldown(slug);
        return data.total_views;
      }
    }

    const clientCount = getClientSideViewCount(slug);
    setClientSideViewCount(slug, clientCount + 1);
    setViewCooldown(slug);
    return clientCount + 1;
  } catch {
    return 0;
  }
}

// 조회수 가져오기 (프로덕션 호환)
export async function getViewCount(slug: string): Promise<number> {
  try {
    // 새로운 테이블 구조 시도
    const { data, error } = await client
      .from('post_analytics')
      .select('total_views')
      .eq('slug', slug)
      .single();

    if (
      !error &&
      data?.total_views !== null &&
      data?.total_views !== undefined
    ) {
      return data.total_views;
    }

    const legacyResult = await client
      .from('post_analytics')
      .select('views')
      .eq('slug', slug)
      .single();

    if (
      !legacyResult.error &&
      legacyResult.data &&
      'views' in legacyResult.data &&
      typeof legacyResult.data.views === 'number'
    ) {
      return legacyResult.data.views;
    }

    return getClientSideViewCount(slug);
  } catch {
    return 0;
  }
}

// 모든 포스트의 조회수 가져오기
export async function getAllViewCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await client
      .from('post_analytics')
      .select('slug, total_views');

    if (error || !data) {
      return {};
    }

    return data.reduce(
      (acc, item) => {
        if (item.slug && typeof item.total_views === 'number') {
          acc[item.slug] = item.total_views;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  } catch {
    return {};
  }
}

// 일별 조회수 트렌드
export async function getDailyViewTrend(
  daysBack: number = 30,
  targetSlug?: string,
): Promise<DailyViewTrend[]> {
  try {
    const { data, error } = await client.rpc('get_daily_view_trend', {
      days_back: daysBack,
      target_slug: targetSlug,
    });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

// 월별 조회수 트렌드
export async function getMonthlyViewTrend(
  monthsBack: number = 12,
  targetSlug?: string,
): Promise<MonthlyViewTrend[]> {
  try {
    const { data, error } = await client.rpc('get_monthly_view_trend', {
      months_back: monthsBack,
      target_slug: targetSlug,
    });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

// 인기 포스트 가져오기 (조회수 기준)
export async function getPopularPosts(
  daysBack: number = 30,
  limit: number = 10,
): Promise<PopularPost[]> {
  try {
    const { data, error } = await client.rpc('get_popular_posts', {
      days_back: daysBack,
      limit_count: limit,
    });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

// 요일별 트래픽 패턴
export async function getWeeklyTrafficPattern(
  daysBack: number = 30,
): Promise<WeeklyTrafficPattern[]> {
  try {
    const { data, error } = await client.rpc('get_weekly_traffic_pattern', {
      days_back: daysBack,
    });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

// 시간대별 트래픽 패턴
export async function getHourlyTrafficPattern(
  daysBack: number = 7,
): Promise<HourlyTrafficPattern[]> {
  try {
    const { data, error } = await client.rpc('get_hourly_traffic_pattern', {
      days_back: daysBack,
    });

    if (error || !data) {
      return [];
    }

    return data;
  } catch {
    return [];
  }
}

// 종합 Analytics 데이터 가져오기
export async function getAnalyticsData(options?: {
  dailyDays?: number;
  monthlyMonths?: number;
  popularPostsDays?: number;
  popularPostsLimit?: number;
  weeklyPatternDays?: number;
  hourlyPatternDays?: number;
}): Promise<AnalyticsData> {
  const {
    dailyDays = 30,
    monthlyMonths = 12,
    popularPostsDays = 30,
    popularPostsLimit = 10,
    weeklyPatternDays = 30,
    hourlyPatternDays = 7,
  } = options || {};

  try {
    const [daily, monthly, popular_posts, weekly_pattern, hourly_pattern] =
      await Promise.all([
        getDailyViewTrend(dailyDays),
        getMonthlyViewTrend(monthlyMonths),
        getPopularPosts(popularPostsDays, popularPostsLimit),
        getWeeklyTrafficPattern(weeklyPatternDays),
        getHourlyTrafficPattern(hourlyPatternDays),
      ]);

    return {
      daily,
      monthly,
      popular_posts,
      weekly_pattern,
      hourly_pattern,
    };
  } catch (error) {
    console.error('[Analytics] Error fetching analytics data:', error);
    return {
      daily: [],
      monthly: [],
      popular_posts: [],
      weekly_pattern: [],
      hourly_pattern: [],
    };
  }
}

// 특정 포스트의 상세 Analytics
export async function getPostAnalytics(slug: string): Promise<{
  analytics: PostAnalytics | null;
  dailyTrend: DailyViewTrend[];
  recentViews: PostViewLog[];
}> {
  try {
    const [analyticsResult, dailyTrend, recentViewsResult] = await Promise.all([
      client.from('post_analytics').select('*').eq('slug', slug).single(),
      getDailyViewTrend(30, slug),
      client
        .from('post_view_logs')
        .select('*')
        .eq('slug', slug)
        .order('viewed_at', { ascending: false })
        .limit(100),
    ]);

    return {
      analytics: analyticsResult.data as PostAnalytics | null,
      dailyTrend,
      recentViews: (recentViewsResult.data || []) as PostViewLog[],
    };
  } catch (error) {
    console.error('[Analytics] Error fetching post analytics:', error);
    return {
      analytics: null,
      dailyTrend: [],
      recentViews: [],
    };
  }
}

export async function aggregateDailyStats(targetDate?: string) {
  try {
    const { error } = await client.rpc('aggregate_daily_stats', {
      target_date: targetDate,
    });
    return !error;
  } catch {
    return false;
  }
}
