import { supabase } from './supabase';

export interface PostAnalytics {
  slug: string;
  views: number;
  last_viewed: string;
}

const useSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 조회수 증가
export async function incrementViewCount(slug: string): Promise<number> {
  if (!useSupabase) {
    console.warn('Supabase not configured, view count not tracked');
    return 0;
  }

  try {
    // 먼저 현재 조회수 확인
    const { data: existing } = await supabase
      .from('post_analytics')
      .select('views')
      .eq('slug', slug)
      .single();

    if (existing) {
      // 기존 레코드가 있으면 조회수 증가
      const { data, error } = await supabase
        .from('post_analytics')
        .update({ 
          views: existing.views + 1,
          last_viewed: new Date().toISOString()
        })
        .eq('slug', slug)
        .select('views')
        .single();

      if (error) {
        console.error('Error updating view count:', error);
        return existing.views;
      }

      return data?.views || existing.views;
    } else {
      // 새 레코드 생성
      const { data, error } = await supabase
        .from('post_analytics')
        .insert([{
          slug,
          views: 1,
          last_viewed: new Date().toISOString()
        }])
        .select('views')
        .single();

      if (error) {
        console.error('Error creating view count:', error);
        return 1;
      }

      return data?.views || 1;
    }
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return 0;
  }
}

// 조회수 가져오기
export async function getViewCount(slug: string): Promise<number> {
  if (!useSupabase) {
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from('post_analytics')
      .select('views')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.views;
  } catch (error) {
    console.error('Error fetching view count:', error);
    return 0;
  }
}

// 모든 포스트의 조회수 가져오기
export async function getAllViewCounts(): Promise<Record<string, number>> {
  if (!useSupabase) {
    return {};
  }

  try {
    const { data, error } = await supabase
      .from('post_analytics')
      .select('slug, views');

    if (error || !data) {
      return {};
    }

    return data.reduce((acc, item) => {
      acc[item.slug] = item.views;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    console.error('Error fetching all view counts:', error);
    return {};
  }
}

// 인기 포스트 가져오기 (조회수 기준)
export async function getPopularPosts(limit: number = 10): Promise<PostAnalytics[]> {
  if (!useSupabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('post_analytics')
      .select('*')
      .order('views', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data;
  } catch (error) {
    console.error('Error fetching popular posts:', error);
    return [];
  }
}