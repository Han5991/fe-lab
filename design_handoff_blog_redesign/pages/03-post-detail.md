# 03 · Post detail — `/posts/[slug]`

**채택 변형: A (우측 sticky TOC + 진행률 바 + 각주)**

원본 컴포넌트: `prototypes/src/post.jsx` → `PostA`

## Purpose
글 한 편을 읽는 화면. 긴 글에서 위치를 잃지 않고, 사이드 보충(각주)을 자연스럽게 본문 아래에 배치.

## Layout

폭 1080px (본문 측정자 기준 좁게), 좌우 패딩 32px.
12-col 비율: 본문(8) + TOC(2) + spacer(2). 메인 본문 max-width ≈ 680px.

```
┌─────────────────────────────────────────────────────────┐
│ ▍▍▍▍▍▍▍▍▍▍▍▍▍▍▍░░░░░░░░░░░░░░░░░░░░░░░  ← 진행률 바 (top 56px)
│                                                          │
│  Bundler · #1 / 5                          이 글의 차례  │
│  번들러 밑바닥부터 —                       § 들어가며    │
│  webpack과 vite는 왜                       § graph build │
│  다른 길을 갔는가                          § resolve 차이│
│  ─────────────────────                     § 결론       │
│  esbuild, Rollup, SWC가 만나는 지점.                    │
│  2026.04.28 · 14분 · 한상욱                              │
│                                                          │
│  본문… (serif 18 / lh 1.75)                              │
│                                                          │
│  > inline highlight: 형광펜 marker                       │
│                                                          │
│  ```ts                                                   │
│  코드 블록                                               │
│  ```                                                     │
│                                                          │
│  본문 중 각주 표시 [1] …                                 │
│                                                          │
│  ──────────                                              │
│  각주                                                    │
│  [1] 자세한 내용은 …                                     │
│                                                          │
│  ──────────                                              │
│  관련 글 / 같은 시리즈                                    │
└─────────────────────────────────────────────────────────┘
```

### Reading progress bar
- 페이지 최상단, sticky, 높이 3px
- 배경 transparent, 채움 `marker-600` (또는 `accent-600`)
- 스크롤 위치 / 글 본문 길이 비율로 width 계산
- `useEffect` + scroll listener (passive)

```tsx
const ref = useRef<HTMLElement>(null);
const [pct, setPct] = useState(0);
useEffect(() => {
  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const { top, height } = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = height - vh;
    const passed = Math.max(0, -top);
    setPct(Math.min(100, (passed / total) * 100));
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

### Header

```
SERIES · 번들러 밑바닥부터 · 01 / 5      ← mono 11, marker-600
번들러 밑바닥부터 —
webpack과 vite는 왜 다른 길을 갔는가     ← serif 56, weight 400, line-height 1.05
                                          (두번째 줄 italic 강조 가능)
esbuild, Rollup, SWC가 만나는 지점.       ← serif italic 20, ink-700
2026.04.28 · 14분 읽기 · 한상욱           ← mono 12, ink-500
```

### Body

- `serif` 18px, line-height 1.75
- 단락 사이 마진 1.4em
- max-width 680px
- 헤딩 (h2/h3): serif, weight 600, 위 마진 2em
  - h2 28, h3 22
- 인용문 (`<blockquote>`): 좌측 2px `marker-300` 보더, italic, ink-700
- 인라인 코드: mono 0.92em, 배경 `paper-100`, padding 1px 6px, radius 4px
- 코드 블록: 배경 `ink-950`, 텍스트 `paper-100`, padding 20px, radius 8px, mono 13
  - 우상단 [복사] 버튼 (호버 시 표시)
  - 라인 하이라이트는 `bg-marker-300/15` 좌측 3px 보더로
- 이미지: 풀폭 (max-width 본문폭), 캡션 mono 11 ink-500 가운데 정렬

### TOC (sticky right, 2/12)

- top 96px sticky
- 각 항목: sans 13, color `ink-600`
- 현재 보이는 헤딩: color `ink-950`, 좌측 2px `ink-950` 보더
- 라벨 `이 글의 차례` (mono 11 uppercase)
- IntersectionObserver로 활성 헤딩 추적

### Footnotes

본문 끝, h2 `각주` 아래.
각 항목:
```
[1] 자세한 내용은 …
```
- mono 11 number, serif 14 본문, ink-700
- 본문 anchor `[1]`은 superscript serif italic, color marker-600
- 클릭 시 부드럽게 해당 각주로 스크롤 + 잠깐 `marker-300` 배경 깜빡 (1.5s ease)

### Related / 같은 시리즈

푸터 위, 가로 스크롤 또는 3-col grid.
- 같은 시리즈 next/prev (있을 때)
- 태그 교집합 큰 글 3개

## Components

| 이름 | 비고 |
|---|---|
| `<PostHeader post />` | 시리즈 라벨 + 제목 + excerpt + 메타 |
| `<ReadingProgress targetRef />` | 진행률 바 |
| `<TOC headings />` | 우측 sticky 차례 |
| `<MdxComponents>` | h2/h3/p/blockquote/code/pre/img 매핑 |
| `<Footnotes items />` | 각주 섹션 |
| `<RelatedPosts post />` | 시리즈 next/prev + 태그 교집합 |

## MDX setup

각주는 **rehype-footnote-elements** 또는 **remark-footnotes** 사용.
TOC 추출은 **rehype-slug** + **rehype-toc** (또는 직접 ast 순회).

```ts
// next.config.mjs / contentlayer config
const rehypePlugins = [
  rehypeSlug,
  [rehypeAutolinkHeadings, { behavior: 'wrap' }],
  rehypeFootnotes,
  rehypePrettyCode, // 코드 하이라이트
];
```

## Copy

- 시리즈 라벨 형식: `SERIES · 번들러 밑바닥부터 · 01 / 5`
- 메타 형식: `2026.04.28 · 14분 읽기 · 한상욱`
- TOC 라벨: `이 글의 차례`
- 각주 섹션 라벨: `각주`
- 관련 글 섹션 라벨: `같은 시리즈` / `관련 노트`
