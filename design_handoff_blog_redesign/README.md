# Handoff: Frontend Lab 블로그 리디자인

## Overview

한상욱(@hsw)의 개발 블로그 **Frontend Lab**의 리디자인.
"실험실 노트같이 정제되지 않지만 깊이 있는" 무드 — 따뜻한 저널 + 위키 밀도가 핵심.

대상 페이지 4개 + 신규 기능 제안 1개:

| # | 페이지 | 라우트 | 변형 |
|---|---|---|---|
| 01 | **Home** | `/` | B — 에디토리얼 피처 |
| 02 | **Posts (Archive)** | `/posts` | A — 사이드바 필터 + 리스트/카드 토글 |
| 03 | **Post detail** | `/posts/[slug]` | A — 우측 TOC + 진행률 + 각주 |
| 04 | **Analytics** | `/admin/analytics` | 대시보드 (시계열 + 글별 랭킹 + 태그 분포) |
| 05 | **신규 기능 제안** | — | 컨셉 카드 5장 (구현 전, 검토용) |

---

## About the Design Files

이 번들의 HTML 파일은 **디자인 레퍼런스** — React+Babel inline JSX로 만든 프로토타입이다.
프로덕션 코드로 그대로 옮기는 게 아니라, **현재 레포의 환경(Next.js App Router + Panda CSS + MDX)에 맞게 재구현**해야 한다.

기준 레포: `frontend-lab` (Next.js 15+, App Router, Panda CSS, contentlayer or fumadocs MDX, recharts)

## Fidelity

**High-fidelity**. 색상·폰트·간격·인터랙션이 모두 명세되어 있다. 픽셀에 가깝게 재현하는 것을 목표로 한다. 단, 본문 콘텐츠/이미지는 mock이며 실제 데이터로 교체한다.

---

## Files in this bundle

```
design_handoff_blog_redesign/
├── README.md                       ← 지금 보고 있는 파일
├── tokens.md                        ← Panda CSS 토큰 매핑표
├── pages/
│   ├── 01-home.md                  ← Home 페이지 명세
│   ├── 02-posts.md                 ← Archive 페이지 명세
│   ├── 03-post-detail.md           ← 글 상세 명세
│   ├── 04-analytics.md             ← 분석 대시보드 명세
│   └── 05-future-ideas.md          ← 신규 기능 제안 (구현 전 검토)
└── prototypes/
    ├── FE Lab Redesign v2.html     ← 캔버스 — 모든 변형이 한 페이지에
    ├── design-canvas.jsx
    └── src/
        ├── tokens.jsx              ← 디자인 토큰 (CSS vars + @import)
        ├── data.jsx                ← mock posts / series / tags / analytics
        ├── components.jsx          ← 공유 atoms (Tag, SearchInput, Nav, Footer 등)
        ├── home.jsx                ← HomeB가 채택본
        ├── list.jsx                ← ListA가 채택본
        ├── post.jsx                ← PostA가 채택본
        └── extras.jsx              ← Analytics + Section5
```

**프로토타입 실행 방법**: `prototypes/FE Lab Redesign v2.html`을 브라우저에서 열면 캔버스가 뜬다 (인터넷 연결 필요 — Babel/React/폰트가 CDN). 캔버스에서 각 아트보드를 더블클릭하면 풀스크린.

---

## Top-level instructions for Claude Code

1. **`tokens.md` 먼저** — Panda CSS 토큰 파일에 색/폰트/간격을 추가/패치한다. 이게 끝나야 페이지 작업이 의미 있다.
2. **공통 컴포넌트** (`Tag`, `SearchInput`, `MarkerText`, `Sparkline`, `Nav`, `Footer`)를 `components/blog/` 아래에 만든다.
3. **페이지별 명세 (`pages/01-home.md` … `04-analytics.md`)**를 순서대로 구현한다. 각 명세는 자체완결형이다.
4. **신규 기능 제안 (`pages/05-future-ideas.md`)은 구현하지 않는다.** 사용자 검토용.
5. 단계별로 commit, 마지막에 PR 생성:
   ```
   git checkout -b feat/blog-redesign
   # 단계별 커밋
   gh pr create --title "Blog redesign — warm journal + wiki density" --body-file design_handoff_blog_redesign/PR_DESCRIPTION.md
   ```

---

## Global design system

### Tone
- **따뜻한 저널** — 페이퍼톤 웜 뉴트럴, 세리프 헤드라인
- **위키 밀도** — 서브 정보(태그/날짜/시리즈)는 mono small caps, 12px 안팎
- **실험실 노트** — 형광펜 highlight (`marker-300`), 손글씨 같은 italic 강조
- 큰 헤드라인은 *italic* 후속어로 리듬을 만든다

### Typography 룰
| 용도 | 폰트 | 크기 | weight |
|---|---|---|---|
| H1 (메인 히어로) | `serif` | 72–88px | 400–500 |
| H1 (페이지 타이틀) | `serif` | 48–56px | 500 |
| H2 (섹션) | `serif` | 22–28px | 600 |
| H3 | `serif` | 18–20px | 600 |
| 본문 (글 읽기) | `serif` | 18px | 400 / line-height 1.75 |
| 본문 (UI) | `sans` | 13–15px | 400 |
| 라벨 / 메타 | `mono` | 10–12px | 500 / letter-spacing 0.08–0.16em / uppercase |
| 코드 인라인 | `mono` | 0.92em | 500 |

`serif`는 한글 본문에 **Noto Serif KR**, 영문/숫자에 **Newsreader**가 자연스럽게 우선되도록 stack을 짠다 (`font-family: 'Newsreader', 'Noto Serif KR', Georgia, serif;`).

### 형광펜 / 마커 강조

```css
.marker {
  background: linear-gradient(180deg,
    transparent 55%,
    var(--marker-300) 55%,
    var(--marker-300) 92%,
    transparent 92%);
  padding: 0 2px;
}
```

쓰는 곳: 히어로 카피의 핵심 명사 1개, 시리즈 카드의 시리즈명, "지금 작업 중" 라벨.

### Imagery placeholder
이미지 자리는 모두 placeholder. 패턴: `repeating-linear-gradient(135deg, transparent 0 8px, rgba(0,0,0,0.025) 8px 9px)` + 1px ink-border + mono 11px 라벨.
실제 이미지로 교체할 때 placeholder 컴포넌트를 그대로 두고 `<img>` 또는 `next/image`로 바꾼다.

---

## Interactions catalogue

전 페이지 공통:
- **링크 hover** — text color `ink-600` → `ink-950`, transition 150ms
- **Tag chip hover** — border `ink-border` → `ink-border-strong`, 150ms
- **카드 hover** — 그림자 없음. 대신 border 색만 약간 진해짐. 제목에 underline-on-hover.
- **Nav** — sticky top, 56px 높이, backdrop-filter blur(12px), `rgba(252,250,247,0.85)` 배경
- **Selection 색** — `marker-300`

페이지별 인터랙션은 각 명세 문서에서.

---

## Routes & data model

레포에 이미 있는 (또는 만들어야 할) 구조에 맞춘다. mock 데이터 형태는 `prototypes/src/data.jsx` 참고 — 실제 MDX frontmatter 매핑은 다음과 같이 권장:

```ts
// types/post.ts
export interface Post {
  slug: string;
  title: string;
  excerpt: string;       // frontmatter `description`
  tags: string[];
  series?: string;       // frontmatter `series`
  seriesIdx?: number;    // frontmatter `seriesIdx`
  date: string;          // ISO yyyy-mm-dd
  readMin: number;       // computed from MDX (reading-time lib)
  views?: number;        // optional, from analytics provider
  popular?: boolean;     // computed (top 5 by views over last 30d)
}

export interface Series {
  id: string;
  title: string;
  count: number;
  desc: string;
  updated: string;       // ISO date of latest post in series
  color: 'accent' | 'marker' | 'moss'; // 시리즈별 컬러 키
}
```

---

## What's NOT in this handoff

- 모바일/반응형 명세 — 별도 작업. 현재 프로토타입은 1200px 기준의 데스크톱 우선.
- 실제 콘텐츠/MDX 본문 — mock만 있음.
- 인증/관리자 라우트 가드 — Analytics는 `/admin/*`에서 보호되어야 한다는 정도만 표기.
- 분석 데이터 소스 — Plausible/Umami/자체수집 중 무엇을 쓸지 결정 필요. 현재는 mock.
- SEO 메타 / Open Graph 이미지 — 필요시 별도 작업.
- 다크 모드 — 사용자 요청에 따라 **이번 PR에서 제외**.

---

## Acceptance checklist

- [ ] `panda.config.ts`에 paper / ink / accent / marker / moss 토큰 추가
- [ ] `app/layout.tsx`에서 next/font로 Newsreader / Noto Serif KR / JetBrains Mono / Pretendard 로드
- [ ] `app/page.tsx` Home B 구현 (히어로 + 피처드 + 시리즈 셸프 + 최신 인덱스 + 검색 진입)
- [ ] `app/posts/page.tsx` ListA 구현 (사이드바 필터 + 리스트↔카드 토글 + 정렬 + 인라인 검색)
- [ ] `app/posts/[slug]/page.tsx` PostA 구현 (우측 sticky TOC + 진행률 바 + 각주)
- [ ] `app/admin/analytics/page.tsx` Analytics 구현 (mock data fetcher 분리)
- [ ] 검색은 클라이언트 fuzzy (Fuse.js 또는 단순 includes로 충분)
- [ ] URL 쿼리 동기화: 필터/정렬/뷰토글 (`?tag=&series=&sort=&view=`)
- [ ] 각 페이지 콘솔 에러 없이 빌드 성공
- [ ] Lighthouse Accessibility 95+ (대비, 포커스링, 시맨틱 헤딩)
