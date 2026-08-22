/**
 * 실제 `apps/blog/posts/` 디렉토리를 읽어 **도메인 계약**(공개 글의 필수 필드,
 * 시리즈 단일 출처)을 잠그는 회귀 테스트입니다.
 *
 * 빌드 산출물(sitemap/rss/search-index/llms-full) 계약은
 * `scripts/contract.test.ts`에 있습니다 — 생성기(scripts)를 import해야 하는
 * 테스트를 여기 두면 domain → scripts 역의존이 생깁니다.
 *
 * 리팩토링/리디자인 시 데이터 형태가 깨지지 않았는지 빠르게 검출하는 가드레일.
 * 콘텐츠 개수 자체는 잠그지 않습니다(글이 추가/숨김되는 정상 변경에 깨지면 안 됨).
 */
import { expect, test } from 'vitest';
import { isPostVisible } from './visibility.ts';
import { testContent } from './testing.ts';

// 실제 코퍼스에 앵커한 테스트 인스턴스 — 배선은 testing.ts 참고.
const {
  getAllPosts,
  getAllPostsIncludingHidden,
  getSeriesAdjacentPosts,
  getSeriesMeta,
  isSeriesFolder,
} = testContent;

test('contract: 글이 1개 이상 존재 (블로그 동작의 최소 조건)', () => {
  const posts = getAllPostsIncludingHidden();
  expect(
    posts.length > 0,
    'apps/blog/posts/ 에 1개 이상의 글이 있어야 함',
  ).toBeTruthy();
});

test('contract: 모든 글은 unique slug 보유', () => {
  const posts = getAllPostsIncludingHidden();
  const seen = new Set<string>();
  const dup: string[] = [];
  for (const p of posts) {
    if (seen.has(p.slug)) dup.push(p.slug);
    else seen.add(p.slug);
  }
  expect(dup, `중복 slug 발견: ${dup.join(', ')}`).toStrictEqual([]);
});

test('contract: 모든 글은 title 보유', () => {
  const posts = getAllPostsIncludingHidden();
  const missing = posts.filter(p => !p.title || typeof p.title !== 'string');
  expect(
    missing.length,
    `title 누락: ${missing.map(p => p.slug).join(', ')}`,
  ).toBe(0);
});

test('contract: 모든 글은 readMin >= 1', () => {
  const posts = getAllPostsIncludingHidden();
  const invalid = posts.filter(
    p => !Number.isFinite(p.readMin) || p.readMin < 1,
  );
  expect(
    invalid.length,
    `readMin 비정상: ${invalid.map(p => `${p.slug}(${p.readMin})`).join(', ')}`,
  ).toBe(0);
});

test('contract: 공개 글(getAllPosts)은 isPostVisible 기준 일치 (slug 집합 비교)', () => {
  // count만 비교하면 "잘못된 글이 잘못된 글로 대체"되는 필터 버그를 놓침.
  // slug 집합을 정렬해서 deepEqual로 비교해야 실제 동등성을 검증할 수 있음.
  // now를 고정 주입해 두 평가 사이에 scheduled 경계가 교차하는 플레이크를 제거.
  const now = new Date();
  const all = getAllPostsIncludingHidden();
  const visible = getAllPosts(now);
  // PostData를 그대로 넘긴다 — 필드를 골라 넘기면 여기서 가시성 규칙을 재구현하는
  // 꼴이 되어, 규칙이 바뀔 때(예: scheduled의 date 폴백 추가) 조용히 어긋난다.
  const expected = all.filter(p => isPostVisible(p, now));
  const visibleSlugs = visible.map(p => p.slug).sort();
  const expectedSlugs = expected.map(p => p.slug).sort();
  expect(visibleSlugs).toStrictEqual(expectedSlugs);
});

test('contract: getAllPosts는 date 내림차순', () => {
  const posts = getAllPosts();
  for (let i = 0; i + 1 < posts.length; i++) {
    const a = posts[i].date ?? '';
    const b = posts[i + 1].date ?? '';
    // a >= b 여야 함 (null/undefined는 최하위로 정렬됨)
    if (a && b) {
      expect(
        new Date(a).getTime() >= new Date(b).getTime(),
        `정렬 위배: ${posts[i].slug}(${a}) < ${posts[i + 1].slug}(${b})`,
      ).toBeTruthy();
    }
  }
});

test('contract: status 값이 유효 enum 범위', () => {
  const valid = new Set(['published', 'draft', 'scheduled']);
  const posts = getAllPostsIncludingHidden();
  const invalid = posts.filter(p => p.status && !valid.has(p.status));
  expect(invalid.length).toBe(0);
});

test('contract: scheduled 글은 공개 시각(scheduledDate ?? date)이 파싱 가능', () => {
  const posts = getAllPostsIncludingHidden();
  for (const p of posts) {
    if (p.status !== 'scheduled') continue;
    // scheduledDate는 시각까지 지정할 때만 쓰는 선택 필드. 없으면 date가 공개 시각.
    const publishAt = p.scheduledDate ?? p.date;
    expect(
      publishAt,
      `${p.slug}: scheduled인데 scheduledDate도 date도 없음 (영원히 비공개)`,
    ).toBeTruthy();
    expect(
      !Number.isNaN(Date.parse(publishAt ?? '')),
      `${p.slug}: 공개 시각 파싱 불가 (${publishAt})`,
    ).toBeTruthy();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 시리즈 단일 출처
//
// `series`는 `_series.yml`로 선언된 폴더에만 붙는다(`repository.ts`). 판정이 읽는
// 시점 한 곳에서 끝나므로, 아래 불변식이 깨지면 배지·네비게이션뿐 아니라 검색·
// OG 카드·llms까지 한꺼번에 어긋난다.
// ─────────────────────────────────────────────────────────────────────────────

test('contract: series는 _series.yml로 선언된 폴더에만 붙는다', () => {
  const violations = getAllPostsIncludingHidden()
    .filter((p): p is typeof p & { series: string } => Boolean(p.series))
    .filter(p => !isSeriesFolder(p.series))
    .map(p => `${p.slug} (series=${p.series})`);
  expect(violations).toStrictEqual([]);
});

test('contract: 시리즈로 선언된 폴더는 메타(_series.yml)를 읽을 수 있어야 한다', () => {
  // repository가 "시리즈다"라고 판정한 폴더에서 getSeriesMeta가 null이면,
  // 두 경로 계산이 갈라졌다는 뜻이다(과거: 각자 process.cwd() 기준 선언).
  // 그 상태로도 빌드는 성공하고 시리즈 표시명·order·nav만 조용히 사라지므로,
  // 여기서 계약으로 잠근다. (series.ts는 폴더가 없으면 경고도 남긴다.)
  const seriesIds = [
    ...new Set(
      getAllPostsIncludingHidden()
        .map(p => p.series)
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  expect(
    seriesIds.length > 0,
    '선언된 시리즈가 최소 1개는 있어야 함',
  ).toBeTruthy();
  for (const id of seriesIds) {
    expect(
      getSeriesMeta(id),
      `${id}: _series.yml을 읽지 못함 — dirs.content 경로 불일치?`,
    ).not.toBe(null);
  }
});

test('contract: 선언되지 않은 폴더의 글은 시리즈 네비게이션이 없다', () => {
  // relativeDir은 있는데 series가 없는 글 = 폴더에는 있지만 시리즈가 아닌 글.
  const grouped = getAllPosts().filter(p => p.relativeDir && !p.series);
  expect(
    grouped.length > 0,
    '검증이 공허하지 않으려면 시리즈가 아닌 폴더의 공개 글이 최소 1편은 있어야 함',
  ).toBeTruthy();
  for (const p of grouped) {
    const nav = getSeriesAdjacentPosts(p.slug);
    expect(nav.seriesName, `${p.slug}: seriesName`).toBe(null);
    expect(nav.prev, `${p.slug}: prev`).toBe(null);
    expect(nav.next, `${p.slug}: next`).toBe(null);
  }
});

test('contract: 선언된 시리즈의 글은 시리즈 네비게이션이 있다 (대조군)', () => {
  const seriesPosts = getAllPosts().filter(p => p.series);
  expect(
    seriesPosts.length > 0,
    '시리즈 글이 최소 1편은 있어야 함',
  ).toBeTruthy();
  for (const p of seriesPosts) {
    expect(
      getSeriesAdjacentPosts(p.slug).seriesName,
      `${p.slug}: 시리즈인데 seriesName이 없음`,
    ).toBeTruthy();
  }
});

// 검색 인덱스·sitemap 우선순위처럼 **생성기를 import해야 하는** 시리즈 계약은
// scripts/contract.test.ts에 있다 (domain → scripts 역의존 금지).
