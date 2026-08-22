/**
 * 앱이 **소유하게 된 사이트 고유 값**이 실제 원고와 어긋나지 않는지 잠급니다.
 *
 * 이 값들(sitemap 우선순위·시리즈 컬러)은 원래 `@blog/content`의 기본값이었고,
 * 패키지의 코퍼스 계약 테스트가 함께 지키고 있었습니다. 소유권이 앱으로
 * 오면서 그 계약도 여기로 옵니다 — 패키지 픽스처는 이제 "설정이 흐르는가"만
 * 보고, "이 사이트의 값이 맞는가"는 앱만 알 수 있기 때문입니다.
 *
 * 어긋남은 **조용합니다**: 폴더 이름을 고치거나 글을 옮기면 우선순위와 컬러가
 * 소리 없이 사라지고, 빌드는 그대로 성공합니다.
 */
import { expect, test } from 'vitest';
import {
  SERIES_COLORS,
  SERIES_COLOR_FALLBACK,
  SITEMAP_PRIORITY,
} from '@/content.values.mts';
import { getAllPosts, getAllSeries } from '@/src/content';

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

test('시리즈 컬러 키는 실제 시리즈 폴더다', () => {
  // 키는 `_series.yml`이 있는 폴더명과 정확히 일치해야 한다 — 어긋나면 그
  // 시리즈는 지정한 색 대신 라운드로빈 폴백을 받는다.
  const seriesIds = new Set(getAllSeries().map(s => s.id));
  for (const key of Object.keys(SERIES_COLORS)) {
    expect(seriesIds.has(key), `시리즈가 아닌 키: ${key}`).toBe(true);
  }
});

test('시리즈 컬러 폴백은 비어 있지 않다', () => {
  // 비면 등록되지 않은 시리즈가 색을 못 받는다(라운드로빈의 나눗셈 대상).
  expect(SERIES_COLOR_FALLBACK.length).toBeGreaterThan(0);
});
