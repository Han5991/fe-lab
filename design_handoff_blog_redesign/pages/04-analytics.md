# 04 · Analytics — `/admin/analytics`

원본 컴포넌트: `prototypes/src/extras.jsx` → `Analytics`

## Purpose
관리자 대시보드. 글별 조회수 시계열, 총 조회수/방문자, 인기 글 랭킹.

⚠️ **인증 필요**. 본인만 볼 수 있어야 함. middleware 또는 layout에서 보호.

## Layout

폭 1280px, 좌우 패딩 32px.

### 1. 헤더 라인

```
ANALYTICS · 최근 30일                          [최근 30일 ▼]
```
- 라벨: mono 11 uppercase
- 셀렉터: 30일 / 7일 / 90일

### 2. KPI row (4-col grid, gap 32px)

```
84,210         42,180         4              17.8K
TOTAL VIEWS    UNIQUE VISITS  POSTS PUBLISHED AVG / POST
↑ 12.4%        ↑ 8.7%
```
- 큰 숫자: serif 38, weight 600, line-height 1
- 라벨: mono 11 uppercase, color `ink-500`
- delta: mono 11
  - `+`: color `moss-600`, 화살표 ↑
  - `-`: color `marker-600`, 화살표 ↓

### 3. Total views chart (full width, 높이 240px)

- recharts `<AreaChart>` (또는 LineChart + 옅은 area fill)
- 라인: `ink-700`, 1.5px
- 채움: `marker-300/0.15`
- X축: 일자 (mono 11, ink-500)
- Y축: 숨김 (또는 우측 mono small)
- 그리드: dasharray 1px `ink-border`
- 호버 시 vertical guide line + tooltip:
  ```
  2026.04.18
  3,128 views
  ```

### 4. Top posts ranking (좌 6/12) + Tag distribution (우 6/12)

#### Top posts (table)

```
#  제목                                    조회수    Δ      ────sparkline────
01 React 19 use() 훅을 컴파일된…           9.1K     ↑ 34%  ╱╲╱╲╱╲╱╲
02 번들러 밑바닥부터 — webpack과 vite     8.4K     ↑ 21%  ╱╲╱  ╲╱
03 Server Components 멘탈 모델            8.0K     ↑ 18%  ╲╱╲╱╲╱
04 Branded Types 4가지 패턴               7.6K     ↓  5%  ╱╲   ╲
05 Next.js App Router 캐시 4계층          6.2K     ↑  9%  ╱╲╱╲╲╱
```

- 랭크: serif italic 18, ink-300
- 제목: sans 14, weight 500, ink-950, hover underline
- 조회수: mono 14, weight 500
- Δ: mono 12, ↑ moss-600 / ↓ marker-600
- sparkline: `<Sparkline>` 컴포넌트, 100×24, color ink-700, fill ink-200
- 행 hover: 배경 `paper-100`

#### Tag distribution

수평 바 (top 8 태그):
```
bundler        ████████████████████  6
react          █████████████████     5
typescript     █████████████         4
nextjs         █████████████         4
opensource     █████████████         4
architecture   █████████████         4
performance    █████████             3
dx             █████████             3
```
- 바: 배경 `marker-300/0.4`, 높이 14px
- 길이는 max count 기준 비율
- 카운트: mono 12 우측

### 5. (선택) 최근 활동 / 댓글

오른쪽 작은 카드 — Giscus 최신 댓글 5개. 이번 PR에서 제외해도 OK.

## Charts library

기존 레포에서 **recharts** 사용중. 그대로 유지.

```tsx
<ResponsiveContainer width="100%" height={240}>
  <AreaChart data={analytics.totalSeries}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--colors-ink-border)" />
    <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'var(--fonts-mono)', fill: 'var(--colors-ink-500)' }} />
    <Tooltip content={<CustomTooltip />} />
    <Area
      type="monotone"
      dataKey="value"
      stroke="var(--colors-ink-700)"
      strokeWidth={1.5}
      fill="var(--colors-marker-300)"
      fillOpacity={0.15}
    />
  </AreaChart>
</ResponsiveContainer>
```

## Data source

**미정** — 사용자 결정 필요. 옵션:

| 옵션 | 장점 | 단점 |
|---|---|---|
| **Plausible self-hosted** | API 깔끔, 페이지뷰/유니크 모두 | 셀프호스트 운영 비용 |
| **Umami self-hosted** | 같음, OSS | 같음 |
| **Vercel Analytics** | 무설정 | 외부 노출 API 없음 — 직접 보여주기 어려움 |
| **자체 수집 (`/api/track`)** | 풀 컨트롤 | 직접 만들어야 |

**임시 권장**: Plausible/Umami API + 환경변수.

```ts
// lib/analytics.ts
export async function getAnalytics(range: '30d' | '7d' | '90d') {
  if (process.env.NODE_ENV === 'development' || !process.env.PLAUSIBLE_API_KEY) {
    return MOCK_ANALYTICS; // prototypes/src/data.jsx의 ANALYTICS 형태
  }
  const res = await fetch(`https://plausible.io/api/v1/stats/aggregate?...`, {
    headers: { Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}` },
    next: { revalidate: 600 },
  });
  // ...
}
```

## Components

| 이름 | 비고 |
|---|---|
| `<AnalyticsPage />` | RSC 또는 'use client' (range selector 위해) |
| `<KpiCard num, label, delta />` | KPI 4개 |
| `<TimeSeriesChart data />` | recharts wrap |
| `<TopPostsTable posts />` | 랭킹 |
| `<Sparkline data, w, h />` | inline mini chart (이미 있음, 재사용) |
| `<TagDistribution tags />` | 수평 바 |

## Auth

```ts
// app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const session = await getSession();
  if (!session || session.user.email !== process.env.ADMIN_EMAIL) {
    redirect('/');
  }
  return <>{children}</>;
}
```

## Copy

- H1: `Analytics`
- KPI 라벨: `TOTAL VIEWS`, `UNIQUE VISITS`, `POSTS PUBLISHED`, `AVG / POST`
- 차트 섹션 라벨: `TOTAL VIEWS · 30D`
- Ranking 라벨: `TOP POSTS · 30D`
- Tag 라벨: `TAG DISTRIBUTION`
