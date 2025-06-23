import { supabase, type SupabasePostData } from './supabase';
import { type PostData } from './posts';

// Supabase에서 포스트 데이터를 가져오는 함수들
export async function getAllPostsFromSupabase(): Promise<PostData[]> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching posts from Supabase:', error);
      return [];
    }

    return data?.map(mapSupabaseToPostData) || [];
  } catch (error) {
    console.error('Error connecting to Supabase:', error);
    return [];
  }
}

export async function getPostBySlugFromSupabase(slug: string): Promise<PostData | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return null;
    }

    return mapSupabaseToPostData(data);
  } catch (error) {
    console.error('Error fetching post from Supabase:', error);
    return null;
  }
}

export async function createPostInSupabase(post: Omit<SupabasePostData, 'id' | 'created_at' | 'updated_at'>): Promise<PostData | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([post])
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating post in Supabase:', error);
      return null;
    }

    return mapSupabaseToPostData(data);
  } catch (error) {
    console.error('Error creating post in Supabase:', error);
    return null;
  }
}

export async function updatePostInSupabase(id: string, updates: Partial<SupabasePostData>): Promise<PostData | null> {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating post in Supabase:', error);
      return null;
    }

    return mapSupabaseToPostData(data);
  } catch (error) {
    console.error('Error updating post in Supabase:', error);
    return null;
  }
}

export async function deletePostFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting post from Supabase:', error);
    return false;
  }
}

// Supabase 데이터를 PostData 형식으로 변환
function mapSupabaseToPostData(data: SupabasePostData): PostData {
  return {
    slug: data.slug,
    originalSlug: data.slug, // Supabase에서는 slug가 정규화되어 저장됨
    title: data.title,
    date: data.date,
    content: data.content,
    excerpt: data.excerpt,
  };
}

// 로컬 마크다운 파일을 Supabase로 마이그레이션하는 함수
export async function migrateLocalPostsToSupabase() {
  const { getAllPosts } = await import('./posts');
  const localPosts = getAllPosts();
  
  const migrationResults = [];
  
  for (const post of localPosts) {
    const supabasePost = {
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      date: post.date,
    };
    
    const result = await createPostInSupabase(supabasePost);
    migrationResults.push({
      success: !!result,
      post: post.title,
      error: result ? null : 'Failed to create post'
    });
  }
  
  return migrationResults;
}