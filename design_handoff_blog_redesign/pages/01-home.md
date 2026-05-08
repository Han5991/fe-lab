# 01 · Home — `/`

**채택 변형: B (에디토리얼 피처)**

원본 컴포넌트: `prototypes/src/home.jsx` → `HomeB`

## Purpose
방문자가 처음 보는 화면. "여긴 어떤 사람의 어떤 공부방인가"를 한 눈에 보여주고, 최신 글·시리즈·검색·인기 글 진입점을 모두 제공한다.

## Layout

전체 폭 1200px, 좌우 패딩 32px. 위에서 아래로:

1. **Nav** — 글로벌 (`SiteFrame` 안의 `Nav`)
2. **Hero** (높이 ~360px)
3. **Featured + Side stack** (12-col grid, 7:5)
4. **Series shelf** (3-col grid)
5. **최신 노트 인덱스** (목록 + 사이드 인기 글)
6. **Footer** — 글로벌

### 1. Hero

```
┌───────────────────────────────────────────────────────────────┐
│  [STUDY NOTE / 한상욱 · since 2023]                            │
│                                                                 │
│  그냥,                                                          │
│  *적어 두는* 공부방.                                            │
│                                                                 │
│  아직 정리되지 않은 생각과, 내일이면 다시                       │
│  계산해볼 코드 조각들. 회사에서 번들러 소스를                   │
│  떠돌다 뜨게 알게 된 내용이 주로 살고 있습니다.                  │
└───────────────────────────────────────────────────────────────┘
```

- Eyebrow: mono 11px, letterSpacing 0.16em, color `ink-500`
- H1: `serif`, 88px, weight 400, line-height 0.95, letter-spacing -0.03em
  - 두번째 줄 "적어 두는"은 `font-style: italic`
- 부제: `serif`, 20px, color `ink-700`, max-width 580px, line-height 1.55

### 2. Featured + Side (gap 48px)

**Left (7/12) — 메인 피처드 글 1개**
- 큰 placeholder 이미지 (높이 320px, repeating-stripe)
- 라벨: `LATEST · 시리즈명 · 01/05` (mono 11, color marker-600)
- H2: serif 36px, weight 500, line-height 1.2
- excerpt: serif italic 16px, ink-700, 2줄 ellipsis
- 메타: `2026.04.28 · 14분 읽기 · #bundler #webpack` (mono 11)

**Right (5/12) — 작은 카드 2개 + 검색**
- 검색 박스 (`SearchInput`, `⌘K` 라벨 노출)
- 작은 글 카드 2개 (썸네일 없이 제목/날짜/태그)
- 카드 사이 1px ink-border 구분선

### 3. Series shelf

라벨 `시리즈로 묶어서 보기` (h3 serif 18px) + 카드 3개 grid

각 카드:
```
┌───────────────────────────┐
│ 01 / SERIES               │
│ 번들러 밑바닥부터          │  ← serif 22, weight 600
│                           │
│ webpack/vite/esbuild의…   │  ← sans 13, ink-700
│                           │
│ ────────────────          │
│ 5편 · 2026.04.28 업데이트  │  ← mono 11
└───────────────────────────┘
```
- 카드 배경: `paper-50`
- 보더: 1px `ink-border`
- 호버: 보더만 `ink-border-strong`로
- 시리즈별 컬러 키 (좌측 4px 엣지 라인 또는 시리즈 번호 색):
  - bundler: accent-600
  - typescript-patterns: marker-600
  - oss-diary: moss-600

### 4. 최신 노트 인덱스 + 인기 사이드

12-col, 8:4 grid, gap 64px

**Left (8/12)** — 최신 글 리스트 (10개)
- 행마다: 날짜 / 제목 / 태그 / 읽기시간
- 1px `ink-200` 행 구분선
- hover: 행 배경 `paper-100`

**Right (4/12)** — 인기 글 사이드 (sticky)
- 라벨 `POPULAR · 30일`
- top 5 글 (랭크 번호 + 제목 + 조회수)
- 랭크 번호: `serif italic 24px`, ink-300

## Components

| 이름 | 위치 | 비고 |
|---|---|---|
| `<Hero />` | `components/blog/Hero.tsx` | 정적 — 하드코드 OK |
| `<FeaturedPost post={…} />` | `components/blog/FeaturedPost.tsx` | 큰 카드 |
| `<MiniPostCard post={…} />` | `components/blog/MiniPostCard.tsx` | 사이드용 |
| `<SeriesCard series={…} />` | `components/blog/SeriesCard.tsx` | 시리즈 셸프용 |
| `<PostIndexRow post={…} />` | `components/blog/PostIndexRow.tsx` | 최신 인덱스 행 |
| `<PopularRail posts={…} />` | `components/blog/PopularRail.tsx` | sticky 사이드 |
| `<SearchBox />` | `components/blog/SearchBox.tsx` | 글로벌 — 클릭 시 `/posts?q=…` 이동 또는 `⌘K` 다이얼로그 |

## Data

```ts
// app/page.tsx
export default async function Home() {
  const allPosts = await getAllPosts(); // sort by date desc
  const featured = allPosts[0];
  const sideTwo = allPosts.slice(1, 3);
  const recent = allPosts.slice(3, 13);
  const popular = await getPopularPosts(5); // 분석 소스 또는 metadata.popular flag
  const series = await getAllSeries();      // top 3 by 'updated' desc
  return <HomeView {...{featured, sideTwo, recent, popular, series}} />;
}
```

## Interactions

- `SearchBox` 클릭 시 `/posts?focus=search`로 이동, 또는 `⌘K` (전역 단축키 — `useHotkeys('cmd+k')`) 다이얼로그.
- `FeaturedPost` 클릭 → 글 상세
- `SeriesCard` 클릭 → `/posts?series=<id>`
- `PopularRail` 호버 → 랭크 숫자가 `serif italic` 그대로, 단 색이 `ink-300` → `marker-600`로

## Copy (정확히 이대로)

- Hero eyebrow: `STUDY NOTE / 한상욱 · since 2023`
- Hero H1 (line 1): `그냥,`
- Hero H1 (line 2, italic): `적어 두는` + ` 공부방.`
- Hero 부제: `아직 정리되지 않은 생각과, 내일이면 다시 계산해볼 코드 조각들. 회사에서 번들러 소스를 떠돌다 뜨게 알게 된 내용이 주로 살고 있습니다.`
- Series shelf 라벨: `시리즈로 묶어서 보기`
- 최신 인덱스 라벨: `최근 노트`
- 인기 사이드 라벨: `POPULAR · 30일` (mono uppercase)
