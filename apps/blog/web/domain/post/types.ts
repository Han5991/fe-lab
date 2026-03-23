/**
 * Post 도메인 타입 정의
 */

export type PostStatus = 'published' | 'draft' | 'scheduled';

export interface PostData {
  slug: string;
  originalSlug: string;
  relativeDir: string;
  title: string;
  date: string | null;
  content: string;
  excerpt?: string;
  thumbnail?: string;
  tags?: string[];
  series?: string;
  status?: PostStatus;
  scheduledDate?: string;
}

export interface PostSummary {
  slug: string;
  originalSlug: string;
  relativeDir: string;
  title: string;
  date: string | null;
  excerpt?: string;
  thumbnail?: string;
  tags?: string[];
  series?: string;
  status?: PostStatus;
  scheduledDate?: string;
}

export interface PostNavItem {
  slug: string;
  title: string;
}

export interface AdjacentPostsOptions {
  filterTag?: string;
  filterSeries?: string;
  sortOrder?: 'newest' | 'oldest';
}
