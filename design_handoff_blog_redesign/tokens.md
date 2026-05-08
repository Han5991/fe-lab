# Design Tokens — Panda CSS mapping

토큰은 `panda.config.ts`의 `theme.tokens`와 `theme.semanticTokens`에 추가한다.
색은 모두 **oklch** — Panda는 oklch를 그대로 받는다.

## Colors

```ts
// panda.config.ts
export default defineConfig({
  // ...
  theme: {
    tokens: {
      colors: {
        // 페이퍼톤 웜 뉴트럴 (배경)
        paper: {
          50:  { value: 'oklch(98.5% 0.008 75)' }, // 가장 밝은 페이퍼 — body bg
          100: { value: 'oklch(96% 0.012 75)' },   // footer / 카드 hover
          200: { value: 'oklch(92% 0.014 75)' },   // 구분선 영역
          300: { value: 'oklch(86% 0.014 75)' },
        },
        // 잉크 (텍스트 + 보더). 웜톤 (hue 60–75)
        ink: {
          950: { value: 'oklch(16% 0.018 60)' },   // primary text
          900: { value: 'oklch(22% 0.02 60)' },
          800: { value: 'oklch(30% 0.022 60)' },
          700: { value: 'oklch(40% 0.022 60)' },   // secondary text
          600: { value: 'oklch(50% 0.02 60)' },    // hover transitions
          500: { value: 'oklch(60% 0.018 60)' },   // meta / mono labels
          400: { value: 'oklch(70% 0.014 60)' },
          300: { value: 'oklch(80% 0.012 70)' },
          200: { value: 'oklch(88% 0.012 75)' },
          border:        { value: 'oklch(86% 0.014 75)' },
          borderStrong:  { value: 'oklch(72% 0.018 70)' },
        },
        // 블루 — 링크/액션 (기존 blog-preset에서 유지)
        accent: {
          50:  { value: 'oklch(96.5% 0.022 255)' },
          200: { value: 'oklch(84% 0.05 255)' },
          600: { value: 'oklch(53% 0.22 255)' },   // primary link
          700: { value: 'oklch(47% 0.24 255)' },   // active
        },
        // 형광펜 옐로 — highlight, 시리즈 색 1
        marker: {
          100: { value: 'oklch(95% 0.06 90)' },
          300: { value: 'oklch(89% 0.14 90)' },    // 형광펜 본색
          600: { value: 'oklch(60% 0.16 65)' },    // 진한 ochre — mono accent text
        },
        // 모스 그린 — "지금 작업 중" / 라이브 데모 / 시리즈 색 2
        moss: {
          100: { value: 'oklch(94% 0.04 145)' },
          600: { value: 'oklch(45% 0.12 145)' },
        },
      },
      fonts: {
        serif:   { value: "'Newsreader', 'Noto Serif KR', Georgia, serif" },
        serifKr: { value: "'Noto Serif KR', 'Newsreader', Georgia, serif" },
        sans:    { value: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", "Apple SD Gothic Neo", sans-serif' },
        mono:    { value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
      },
      fontSizes: {
        // mono 라벨용
        '2xs': { value: '10px' },
        xs:    { value: '11px' },
        // 기본 스케일 — Panda 기본 사용해도 됨
      },
    },
    semanticTokens: {
      colors: {
        bg:        { value: { base: '{colors.paper.50}' } },
        bgMuted:   { value: { base: '{colors.paper.100}' } },
        text:      { value: { base: '{colors.ink.950}' } },
        textMuted: { value: { base: '{colors.ink.700}' } },
        textMeta:  { value: { base: '{colors.ink.500}' } },
        border:    { value: { base: '{colors.ink.border}' } },
        borderStrong: { value: { base: '{colors.ink.borderStrong}' } },
        link:      { value: { base: '{colors.accent.600}' } },
        linkHover: { value: { base: '{colors.accent.700}' } },
      },
    },
  },
});
```

## Fonts — next/font 로드

```ts
// app/fonts.ts
import { Newsreader, Noto_Serif_KR, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local'; // Pretendard는 local 권장 (CDN보다 빠름)

export const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const notoSerifKr = Noto_Serif_KR({
  subsets: ['latin'], // ko 자동 포함
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-serif-kr',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// Pretendard — npm `pretendard` 패키지나 jsdelivr CDN 사용
// 기존 레포가 이미 로드 중이면 그대로
```

```tsx
// app/layout.tsx
import { newsreader, notoSerifKr, jetbrainsMono } from './fonts';
// ...
<html lang="ko" className={`${newsreader.variable} ${notoSerifKr.variable} ${jetbrainsMono.variable}`}>
```

`panda.config.ts` fonts 토큰의 stack을 `var(--font-newsreader)` 등으로 바꿔도 되고, 그대로 family명으로 둬도 된다.

## Spacing

기본 Panda spacing 그대로. 자주 쓰는 값:
- 페이지 좌우 패딩: `32px` (모바일은 `20px`, 별도 작업)
- 섹션 사이 마진: `64–96px`
- 카드 내부 패딩: `24px`
- 콘텐츠 max-width: `1200px` (전체) / `680px` (글 본문 측정자 기준)

## Radius

거의 안 씀. 강조점:
- Tag chip: `999px` (pill)
- 카드/박스: `0` 또는 `4px` — **둥근 모서리는 절제**, 페이퍼 느낌 유지
- Input/buttons: `8px`
- Code block: `8px`

## Shadow

거의 안 씀. 그림자 대신 **1px solid border**로 구분.
필요할 때만:
- floating panel: `0 1px 2px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.06)`

## Utilities (recipe / pattern)

```ts
// styled-system/recipes/marker.ts
export const marker = cva({
  base: {
    background: 'linear-gradient(180deg, transparent 55%, {colors.marker.300} 55%, {colors.marker.300} 92%, transparent 92%)',
    paddingX: '2px',
  },
});

// label (mono small caps)
export const label = cva({
  base: {
    fontFamily: 'mono',
    fontSize: 'xs',
    fontWeight: 500,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'textMeta',
  },
});
```
