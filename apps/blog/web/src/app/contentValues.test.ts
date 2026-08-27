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
import {
  ADMIN_PATH_PREFIX,
  LLMS_DOCS,
  POSTS_PATH_PREFIX,
  SITEMAP_PRIORITY,
  SITEMAP_STATIC_PAGES,
} from '@/content.values.mts';
import { ABOUT_PATH, ADMIN_BASE_PATH, SERIES_PATH } from '@/shared/routes';
import { POSTS_PATH } from '@blog/content';
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

test('check-bundle의 admin 경로 접두는 실제 admin 라우트 계약에서 파생된 값이다', () => {
  // 두 상수는 직접 잇지 못한다 — 값 모듈은 import 금지(파일 주석 참고).
  // 파생 대신 여기서 잠근다: admin 라우트를 옮기면 이 테스트가 값 모듈의
  // 사본을 함께 고치라고 알린다. 어긋난 채 두면 check-bundle이 admin 페이지를
  // 공개로 분류해 marker-dead(전 마커)로 빌드가 막히지만, 그 메시지보다
  // 이쪽이 원인을 바로 말해 준다.
  expect(ADMIN_PATH_PREFIX).toBe(`${ADMIN_BASE_PATH}/`);
});

test('sitemap·llms에 배선된 정적 페이지 경로는 shared/routes의 라우트 계약과 같다', () => {
  // 값 모듈은 import 금지라 about·series 경로의 비공개 사본을 든다 — 라우트를
  // 옮기면 nav·canonical(shared/routes 소비자)만 고쳐지고 sitemap·llms가 옛
  // 주소를 내보내는 사고를 여기서 잡는다.
  expect(SITEMAP_STATIC_PAGES.map(page => page.path)).toContain(ABOUT_PATH);
  expect(LLMS_DOCS.extra.map(doc => doc.path)).toEqual([
    SERIES_PATH,
    ABOUT_PATH,
  ]);
});

test('번들 규칙의 글 라우트 접두는 패키지 라우트 계약(POSTS_PATH)과 같다', () => {
  // 값 모듈은 import 금지라 사본을 든다 — 어긋나면 글 전용 규칙(Mermaid·
  // Giscus·구문 강조)이 글 페이지를 딴 무리로 분류해 marker-dead로 막힌다.
  expect(POSTS_PATH_PREFIX).toBe(POSTS_PATH);
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
