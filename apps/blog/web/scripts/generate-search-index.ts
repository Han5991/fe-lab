import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllPosts, getAllPostsIncludingHidden } from '../lib/posts';

const outputPath = join(process.cwd(), 'public', 'search-index.json');

// 공개 포스트용 검색 인덱스 (프론트엔드 검색용)
const publicPosts = getAllPosts().map(p => ({
  slug: p.slug,
  title: p.title,
  date: p.date,
  excerpt: p.excerpt || '',
  tags: p.tags || [],
  series: p.series || null,
}));

writeFileSync(outputPath, JSON.stringify(publicPosts, null, 2), 'utf8');
console.log(`Search index generated: ${publicPosts.length} posts`);

// Admin 대시보드용 전체 포스트 인덱스 (draft, scheduled 포함)
const adminOutputPath = join(process.cwd(), 'public', 'admin-posts-index.json');
const allPosts = getAllPostsIncludingHidden().map(p => ({
  slug: p.slug,
  title: p.title,
  date: p.date,
  excerpt: p.excerpt || '',
  tags: p.tags || [],
  series: p.series || null,
  status: p.status || 'published',
  scheduledDate: p.scheduledDate || null,
}));

writeFileSync(adminOutputPath, JSON.stringify(allPosts, null, 2), 'utf8');
console.log(
  `Admin posts index generated: ${allPosts.length} posts (including hidden)`,
);
