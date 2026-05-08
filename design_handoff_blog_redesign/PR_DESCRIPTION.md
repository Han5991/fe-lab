# Blog redesign — warm journal + wiki density

## Summary

Frontend Lab 블로그의 주요 페이지를 **따뜻한 저널 + 위키 밀도** 무드로 리디자인합니다.
디자인 명세는 `design_handoff_blog_redesign/`에 자체완결형으로 들어 있습니다.

대상:
- `/` — Home (B 변형: 에디토리얼 피처)
- `/posts` — Archive (A 변형: 사이드바 필터 + 리스트/카드 토글)
- `/posts/[slug]` — Post detail (A 변형: 우측 TOC + 진행률 + 각주)
- `/admin/analytics` — Analytics 대시보드 (mock data 우선, 데이터 소스 별도 결정)

다크모드는 이번 PR에서 **제외**. 신규 기능 5가지 제안(`pages/05-future-ideas.md`)은 별도 PR.

## What changed

### Tokens (`panda.config.ts`)
- 추가: `colors.paper.{50,100,200,300}`, `colors.marker.{100,300,600}`, `colors.moss.{100,600}`
- 패치: `colors.ink.*` 톤을 cool에서 warm hue로 (60–75)
- 추가: `fonts.serif` (Newsreader + Noto Serif KR), `fonts.mono` (JetBrains Mono)

### Fonts
- next/font로 Newsreader / Noto Serif KR / JetBrains Mono 로드
- Pretendard는 기존 로드 유지

### Components
- `components/blog/Hero.tsx`, `FeaturedPost.tsx`, `MiniPostCard.tsx`, `SeriesCard.tsx`,
  `PostIndexRow.tsx`, `PopularRail.tsx`
- `components/blog/FilterSidebar.tsx`, `FilterGroup.tsx`, `SortRadio.tsx`, `ViewToggle.tsx`,
  `ActiveFilters.tsx`, `PostListRow.tsx`, `PostGridCard.tsx`
- `components/blog/PostHeader.tsx`, `ReadingProgress.tsx`, `TOC.tsx`,
  `Footnotes.tsx`, `RelatedPosts.tsx`
- `components/admin/KpiCard.tsx`, `TimeSeriesChart.tsx`, `TopPostsTable.tsx`,
  `TagDistribution.tsx`, `Sparkline.tsx`
- 공통: `Tag.tsx`, `MarkerText.tsx`, `Label.tsx`, `SearchBox.tsx`

### Pages
- `app/page.tsx` (rewrite)
- `app/posts/page.tsx` (rewrite — `'use client'` for filter state)
- `app/posts/[slug]/page.tsx` (rewrite, MDX + rehype 플러그인)
- `app/admin/analytics/page.tsx` (new, with auth guard)

### MDX setup
- `rehype-slug` + `rehype-autolink-headings`
- `remark-footnotes` (or `rehype-footnote-elements`)
- `rehype-pretty-code` (코드 하이라이트)

## Acceptance

- [ ] 토큰 추가 후 기존 페이지 비주얼 회귀 없음
- [ ] 4개 페이지 모두 콘솔 에러 없이 렌더
- [ ] `/posts`의 필터/정렬/뷰토글이 URL과 동기화
- [ ] `/posts/[slug]` 진행률 바 + TOC 활성 헤딩이 스크롤과 함께 동작
- [ ] `/admin/analytics`는 비인증 시 `/`로 리다이렉트
- [ ] Lighthouse Accessibility 95+

## Out of scope

- 모바일/반응형 최적화 (별도 PR)
- 분석 데이터 실제 소스 연결 (mock으로 동작)
- 다크 모드
- 신규 기능 제안 5가지

## Reviewers

@한상욱 — 디자인/카피 톤이 의도와 맞는지

## Test plan

```bash
pnpm dev
# 1) /  — 히어로/피처드/시리즈/최신 인덱스 모두 렌더
# 2) /posts — 검색, 태그 클릭, 정렬 변경, 뷰토글, URL 동기화
# 3) /posts/<slug> — 스크롤 시 진행률 바 / TOC 활성 헤딩
# 4) /admin/analytics — 차트 호버 / KPI / 랭킹
```

빌드:
```bash
pnpm build && pnpm start
```
