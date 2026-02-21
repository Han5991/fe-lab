import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllPosts } from '../lib/posts';

const outputPath = join(process.cwd(), 'public', 'search-index.json');

const posts = getAllPosts().map(p => ({
  slug: p.slug,
  title: p.title,
  date: p.date,
  excerpt: p.excerpt || '',
  tags: p.tags || [],
  series: p.series || null,
}));

writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf8');
console.log(`Search index generated: ${posts.length} posts`);
