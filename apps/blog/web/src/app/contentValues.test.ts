/**
 * 앱이 **소유하게 된 사이트 고유 값**이 실제 원고와 어긋나지 않는지 잠급니다.
 *
 * 이 값들(sitemap 우선순위·정적 페이지)은 원래 `@blog/content`의 기본값이었고,
 * 패키지의 코퍼스 계약 테스트가 함께 지키고 있었습니다. 소유권이 앱으로
 * 오면서 그 계약도 여기로 옵니다 — 패키지 픽스처는 이제 "설정이 흐르는가"만
 * 보고, "이 사이트의 값이 맞는가"는 앱만 알 수 있기 때문입니다.
 *
 * 어긋남은 **조용합니다**: 폴더 이름을 고치거나 글을 옮기면 우선순위가 소리 없이
 * 사라지고, 빌드는 그대로 성공합니다.
 */
import { expect, test } from 'vitest';
import { SITEMAP_PRIORITY, SITEMAP_STATIC_PAGES } from '@/content.values.mts';
import { getAllPosts } from '@/src/content';

const posts = getAllPosts();
const folders = new Set(posts.map(p => p.relativeDir).filter(Boolean));
const slugs = new Set(posts.map(p => p.slug));

test('sitemap 고우선 폴더는 실제 원고 폴더다', () => {
  for (const folder of SITEMAP_PRIORITY.highPriorityFolders) {
    expect(folders.has(folder), `없는 폴더: ${folder}`).toBe(true);
  }
});

test('sitemap 고우선 slug는 실제 공개 글이다', () => {
  for (const slug of SITEMAP_PRIORITY.highPrioritySlugs) {
    expect(slugs.has(slug), `없는 글: ${slug}`).toBe(true);
  }
});

test('sitemap 정적 페이지는 후행 슬래시를 단 사이트 내부 경로다', () => {
  // `next.config.ts`의 trailingSlash 계약과 같은 규칙이다. 여기서 어긋나면
  // sitemap만 301을 타는 URL을 색인에 내보낸다.
  for (const page of SITEMAP_STATIC_PAGES) {
    expect(page.path.startsWith('/'), `절대 경로가 아님: ${page.path}`).toBe(
      true,
    );
    expect(page.path.endsWith('/'), `후행 슬래시 없음: ${page.path}`).toBe(
      true,
    );
  }
});

test('sitemap 정적 페이지의 lastmod는 YYYY-MM-DD다', () => {
  // 손으로 관리하는 값이라 오타가 조용히 지나간다 — sitemap은 그대로 생성되고
  // 검색엔진만 날짜를 못 읽는다.
  for (const page of SITEMAP_STATIC_PAGES) {
    if (page.lastmod === undefined) continue;
    expect(page.lastmod, `날짜 형식 아님: ${page.path}`).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  }
});
