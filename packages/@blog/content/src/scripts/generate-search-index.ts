import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ADMIN_POSTS_INDEX_PATH,
  type AdminPostsIndexEntry,
  extractPlainText,
  type PostData,
  type PublicSearchIndexEntry,
  SEARCH_INDEX_PATH,
  seriesDisplayName,
  type SeriesMeta,
} from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
import type { ContentContext } from './context.ts';

export const CONTENT_PREVIEW_CHARS = 1500;

/**
 * 공개 포스트용 검색 인덱스 (프론트엔드 검색용).
 *
 * `||`는 의도적: 빈 문자열/undefined 모두 falsy fallback으로 정규화.
 * 검색 UI에서 빈 entry vs 누락 entry의 차이가 없으므로 일관된 빈 값을 사용.
 * (llms-full.ts의 excerpt 처리도 같은 의도이며 거기엔 본문 fallback이 한 단계 더 있음.)
 */
export function buildPublicSearchIndex(
  posts: PostData[],
  resolveSeriesMeta: (seriesId: string) => SeriesMeta | null,
): PublicSearchIndexEntry[] {
  return posts.map(p => ({
    slug: p.slug,
    title: p.title,
    date: p.date,
    excerpt: p.excerpt || '',
    tags: p.tags || [],
    series: p.series || null,
    seriesTitle: p.series
      ? seriesDisplayName(p.series, resolveSeriesMeta(p.series))
      : null,
    contentPreview: extractPlainText(p.content, { dropCode: true }).slice(
      0,
      CONTENT_PREVIEW_CHARS,
    ),
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
    tags: p.tags || [],
    status: p.status,
    scheduledDate: p.scheduledDate || null,
  }));
}

export function main(ctx: ContentContext) {
  const outputPath = join(ctx.content.paths.publicDir, SEARCH_INDEX_PATH);
  const adminOutputPath = join(
    ctx.content.paths.publicDir,
    ADMIN_POSTS_INDEX_PATH,
  );

  // 산출 파일이 두 개고 글 집합도 각각 다르다 — 레지스트리(artifacts.ts)의
  // 선언(search-index: visible/exact, admin-posts-index: all/superset)과
  // 같은 셀렉터를 쓴다.
  const publicPosts = buildPublicSearchIndex(
    resolvePostSet(ctx.content, 'visible'),
    ctx.content.getSeriesMeta,
  );
  writeFileSync(outputPath, JSON.stringify(publicPosts, null, 2), 'utf8');
  console.log(`Search index generated: ${publicPosts.length} posts`);

  const allPosts = buildAdminPostsIndex(resolvePostSet(ctx.content, 'all'));
  writeFileSync(adminOutputPath, JSON.stringify(allPosts, null, 2), 'utf8');
  console.log(
    `Admin posts index generated: ${allPosts.length} posts (including hidden)`,
  );
}
