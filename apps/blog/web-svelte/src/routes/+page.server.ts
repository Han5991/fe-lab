import { postPath } from '@blog/content';
import { getAllPostSummaries } from '$lib/server/content';

/** 홈 — 최신 글 목록. 요약만 내려보낸다(본문은 상세에서만 필요하다). */
export const load = () => ({
  posts: getAllPostSummaries()
    .slice(0, 12)
    .map(p => ({
      slug: p.slug,
      href: postPath(p.slug),
      title: p.title,
      date: p.date,
      excerpt: p.excerpt ?? '',
      readMin: p.readMin,
    })),
});
