# 02 · Posts (Archive) — `/posts`

**채택 변형: A (사이드바 필터 + 리스트/카드 토글)**

원본 컴포넌트: `prototypes/src/list.jsx` → `ListA`

## Purpose
모든 글을 탐색. 태그/시리즈 필터, 정렬, 검색, 리스트↔카드 뷰토글.

## Layout

12-col grid, 좌 사이드바(3) + 메인(9), gap 48px. 폭 1200px.

### Sidebar (3/12, sticky top: 80px)

```
검색 [────────────] ⌘K

──────────────────
정렬                  ← label
( ) 최신순
( ) 인기순
( ) 짧은 글부터

──────────────────
뷰
[ 리스트 ] [ 카드 ]   ← segmented

──────────────────
태그                  
#bundler   6
#react     5
#typescript 4
…

──────────────────
시리즈
번들러 밑바닥부터  5
TypeScript 설계… 4
오픈소스 일기    8

──────────────────
연도
2026  12
2025  3
```

- 각 그룹 라벨: mono 11, uppercase, color `ink-500`
- 활성 항목: text `ink-950`, 좌측 2px `ink-950` 보더
- 카운트 배지: mono 11, color `ink-500`

### Main (9/12)

상단 페이지 헤더:
```
모든 노트                              17편
─────────────────────────────────────────  ← 1px ink-border
```
- H1 serif 36px, weight 500
- 카운트: mono 12, color `ink-500`

활성 필터 표시 (선택된 태그/시리즈가 있을 때만):
```
필터: #bundler  #performance  ×모두 지우기
```
- 각 활성 칩: 검은 배경 `ink-950`, 흰 텍스트 `paper-50`, 클릭 시 제거

리스트 영역:

**리스트 뷰** (default)
각 행:
```
2026.04.28 · 14분    번들러 밑바닥부터 — webpack과…    ▍
                     #bundler  #webpack  #vite          │
                     esbuild, Rollup, SWC가 만나는…      │
                                              8.4K views │
─────────────────────────────────────────────────────
```
- 좌 컬럼 (date+readMin): mono 12, color `ink-500`, 폭 110px
- 제목: serif 22, weight 500, line-height 1.25 — hover시 underline
- 태그 라인: 작은 Tag chip (size sm)
- excerpt: serif italic 14, ink-700, 1줄 ellipsis
- 우측 끝: 조회수 (mono 11, ink-500)
- 행 사이 1px `ink-200`, 패딩 24px

**카드 뷰**
3-col grid, gap 24px. 각 카드:
- placeholder 이미지 (높이 160)
- 제목 serif 18, weight 600
- excerpt 13 sans, 2줄 ellipsis
- 메타 + 태그 mono 11

## Interactions

| 액션 | 결과 |
|---|---|
| 검색 입력 | 클라이언트 필터 (debounce 200ms). title + excerpt + tags includes |
| 정렬 변경 | URL `?sort=recent\|popular\|shortest` |
| 태그 클릭 | 토글. URL `?tag=bundler,react` (multi) |
| 시리즈 클릭 | URL `?series=bundler-deep-dive` |
| 연도 클릭 | URL `?year=2026` |
| 뷰토글 | URL `?view=list\|cards` (localStorage에도 저장) |
| × 모두 지우기 | URL params 모두 제거 |

useState 대신 **URL을 single source of truth**로. `useSearchParams` + `router.replace`.

## Components

| 이름 | 비고 |
|---|---|
| `<PostsArchive />` | 페이지 client 컴포넌트 (`'use client'`) — 검색/필터 상태 관리 |
| `<FilterSidebar />` | 좌측 필터 |
| `<FilterGroup label, items, active, onToggle, multi />` | 태그/시리즈/연도 공통 |
| `<SortRadio value, onChange />` | 정렬 라디오 |
| `<ViewToggle value, onChange />` | 리스트↔카드 |
| `<ActiveFilters values, onRemove, onClear />` | 활성 필터 표시 |
| `<PostListRow post />` | 리스트 뷰 행 |
| `<PostGridCard post />` | 카드 뷰 카드 |

## Data

```ts
// app/posts/page.tsx (RSC) — 데이터 prefetch
export default async function PostsPage({ searchParams }) {
  const all = await getAllPosts();
  const series = await getAllSeries();
  const tags = await getAllTags();
  return <PostsArchive {...{all, series, tags, initial: searchParams}} />;
}
```

`PostsArchive`는 `'use client'`. 필터링/정렬은 `useMemo`로 클라에서.

## Search 구현

- 18~30개면 단순 `includes` 매칭으로 충분 (현재 mock 17개)
- 100+ 가면 Fuse.js 권장

```ts
const filtered = useMemo(() => {
  let r = posts;
  if (q) r = r.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.excerpt.toLowerCase().includes(q) ||
    p.tags.some(t => t.includes(q))
  );
  if (activeTags.length) r = r.filter(p => activeTags.every(t => p.tags.includes(t)));
  if (series) r = r.filter(p => p.series === series);
  if (year) r = r.filter(p => p.date.startsWith(year));
  return sortPosts(r, sort);
}, [posts, q, activeTags, series, year, sort]);
```

## Edge cases

- 결과 0개일 때:
  ```
  매칭되는 노트가 없어요.
  필터를 풀거나 다른 검색어로 시도해보세요.
  [ × 모두 지우기 ]
  ```
  serif italic 18, color ink-700, 패딩 96px

- 필터 활성 + 결과 1개일 때도 같은 레이아웃 유지

## Copy

- 페이지 H1: `모든 노트`
- 카운트 형식: `17편`
- Sidebar 라벨들: `정렬`, `뷰`, `태그`, `시리즈`, `연도`
- 빈 상태: `매칭되는 노트가 없어요.`
