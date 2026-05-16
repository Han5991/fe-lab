import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllPosts, getAllPostsIncludingHidden } from '../domain/post';
import type { PostData } from '../domain/post';

export const CONTENT_PREVIEW_CHARS = 1500;

export function toPlainText(content: string): string {
  return (
    content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // HTML 태그를 마크다운 기호 제거(`>` 포함)보다 먼저 처리해야 `<div>...</div>` 같은
      // 태그가 정상적으로 공백으로 치환됩니다.
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#*`_>~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export interface PublicSearchIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  contentPreview: string;
}

export interface AdminPostsIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  status: string;
  scheduledDate: string | null;
}

/** 공개 포스트용 검색 인덱스 (프론트엔드 검색용) */
export function buildPublicSearchIndex(
  posts: PostData[],
): PublicSearchIndexEntry[] {
  return posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt || '',
    tags: p.tags || [],
    series: p.series || null,
    contentPreview: toPlainText(p.content).slice(0, CONTENT_PREVIEW_CHARS),
  }));
}

/** Admin 대시보드용 전체 포스트 인덱스 (draft, scheduled 포함) */
export function buildAdminPostsIndex(
  posts: PostData[],
): AdminPostsIndexEntry[] {
  return posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt || '',
    tags: p.tags || [],
    series: p.series || null,
    status: p.status || 'published',
    scheduledDate: p.scheduledDate || null,
  }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const outputPath = join(process.cwd(), 'public', 'search-index.json');
  const adminOutputPath = join(
    process.cwd(),
    'public',
    'admin-posts-index.json',
  );

  const publicPosts = buildPublicSearchIndex(getAllPosts());
  writeFileSync(outputPath, JSON.stringify(publicPosts, null, 2), 'utf8');
  console.log(`Search index generated: ${publicPosts.length} posts`);

  const allPosts = buildAdminPostsIndex(getAllPostsIncludingHidden());
  writeFileSync(adminOutputPath, JSON.stringify(allPosts, null, 2), 'utf8');
  console.log(
    `Admin posts index generated: ${allPosts.length} posts (including hidden)`,
  );
}
