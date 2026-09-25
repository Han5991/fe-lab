import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractPlainText, type PostData } from '../post/index.ts';
import { resolvePostSet } from './artifacts.ts';
import type { ContentContext } from './context.ts';

export const CONTENT_PREVIEW_CHARS = 1500;

export interface PublicSearchIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  excerpt: string;
  tags: string[];
  series: string | null;
  contentPreview: string;
}

/**
 * admin 대시보드가 **실제로 읽는 필드만** 싣는다(`adminRepository.ts`의
 * `AdminPostIndex`와 같은 모양).
 *
 * 이 파일은 정적 산출물이라 인증 없이 `/admin-posts-index.json`으로 누구나
 * 받는다 — admin 인증(Edge Function의 JWT 대조)은 이 파일을 덮지 않는다.
 * 그래서 draft·예약 글의 요약(`excerpt`)과 시리즈는 뺐다: 대시보드가 쓰지 않는
 * 값이 공개 전 글의 내용을 흘릴 이유가 없다. 남은 제목·날짜·상태까지 감추려면
 * 이 목록을 Edge Function 뒤로 옮겨야 한다(이 패키지 밖의 일).
 */
export interface AdminPostsIndexEntry {
  slug: string;
  title: string;
  date: string | null;
  tags: string[];
  status: string;
  scheduledDate: string | null;
}

/**
 * 공개 포스트용 검색 인덱스 (프론트엔드 검색용).
 *
 * `||`는 의도적: 빈 문자열/undefined 모두 falsy fallback으로 정규화.
 * 검색 UI에서 빈 entry vs 누락 entry의 차이가 없으므로 일관된 빈 값을 사용.
 * (llms-full.ts의 excerpt 처리도 같은 의도이며 거기엔 본문 fallback이 한 단계 더 있음.)
 */
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
  const outputPath = join(ctx.content.paths.publicDir, 'search-index.json');
  const adminOutputPath = join(
    ctx.content.paths.publicDir,
    'admin-posts-index.json',
  );

  // 산출 파일이 두 개고 글 집합도 각각 다르다 — 레지스트리(artifacts.ts)의
  // 선언(search-index: visible/exact, admin-posts-index: all/superset)과
  // 같은 셀렉터를 쓴다.
  const publicPosts = buildPublicSearchIndex(resolvePostSet(ctx, 'visible'));
  writeFileSync(outputPath, JSON.stringify(publicPosts, null, 2), 'utf8');
  console.log(`Search index generated: ${publicPosts.length} posts`);

  const allPosts = buildAdminPostsIndex(resolvePostSet(ctx, 'all'));
  writeFileSync(adminOutputPath, JSON.stringify(allPosts, null, 2), 'utf8');
  console.log(
    `Admin posts index generated: ${allPosts.length} posts (including hidden)`,
  );
}
