import { postPath } from '@blog/content';
import { getAllPostSummaries } from '$lib/server/content';

export const load = () => ({
  posts: getAllPostSummaries().map(p => ({
    slug: p.slug,
    href: postPath(p.slug),
    title: p.title,
    date: p.date,
    excerpt: p.excerpt ?? '',
    readMin: p.readMin,
  })),
});
