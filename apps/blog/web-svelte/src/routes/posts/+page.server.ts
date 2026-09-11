import {
  fmtDate,
  postPath,
  resolveThumbnailSrc,
  type PostSummary,
} from '@blog/content';
import { OG_DEFAULT_IMAGE } from '@blog/site-values';
import {
  getAllPostSummaries,
  getAllSeries,
  getAllTags,
  getAllYears,
} from '$lib/server/content';
import type { ArchivePost } from '$lib/components/archive/types';

/**
 * 아카이브 — 글 전체와 필터 그룹 셋(태그·시리즈·연도).
 *
 * URL·썸네일·날짜 표기를 **여기서 전부 푼다.** 화면이 `@blog/content` 배럴을
 * 열면 `node:fs`가 클라이언트 그래프로 딸려 오기 때문이다(`+layout.server.ts`
 * 주석). 필터·정렬 계산만 브라우저에서 도는데, 그건 패키지가 클라이언트 문으로
 * 따로 내준 순수 함수다.
 */
const toArchivePost = (post: PostSummary): ArchivePost => ({
  slug: post.slug,
  href: postPath(post.slug),
  title: post.title,
  excerpt: post.excerpt ?? '',
  tags: post.tags ?? [],
  series: post.series,
  date: post.date,
  dateLabel: fmtDate(post.date),
  readMin: post.readMin,
  thumb: resolveThumbnailSrc(post, OG_DEFAULT_IMAGE),
});

export const load = () => ({
  posts: getAllPostSummaries().map(toArchivePost),
  seriesItems: getAllSeries().map(entry => ({
    id: entry.id,
    label: entry.title,
    count: entry.count,
  })),
  tagItems: getAllTags().map(tag => ({
    id: tag.id,
    label: `#${tag.id}`,
    count: tag.count,
  })),
  yearItems: getAllYears().map(entry => ({
    id: entry.year,
    label: entry.year,
    count: entry.count,
  })),
});
