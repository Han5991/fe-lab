# GitHub — Style Reference

> Dark canvas, white octocat, blue action.

**Theme:** dark · **Category:** Developer Tools · **Source:** https://www.github.com

A mobile-native GitHub experience rendered in true black with crisp white typography,
subtle dark surfaces, and restrained blue accents. The interface is minimal, high-contrast,
and unmistakably GitHub: the white octocat logo floats on pure black, primary buttons are
solid white with black text, secondary actions sit in dark gray pills, and links use a
saturated blue. Status icons and tab labels adopt the same blue when active. The visual
language is spare, utilitarian, and unmistakably developer-first.

## Colors

| Name          | Value     | Group   | Role                            | Token                   |
| ------------- | --------- | ------- | ------------------------------- | ----------------------- |
| Octocat White | `#FFFFFF` | brand   | Primary surface / button fill   | `--color-octocat-white` |
| Void Black    | `#000000` | neutral | Dominant background             | `--color-void-black`    |
| Slate 900     | `#161B22` | neutral | Card / sheet background         | `--color-slate-900`     |
| Slate 800     | `#21262D` | neutral | Secondary surface / list row    | `--color-slate-800`     |
| Slate 700     | `#30363D` | neutral | Border / divider                | `--color-slate-700`     |
| GitHub Blue   | `#58A6FF` | brand   | Link / active tab / icon accent | `--color-github-blue`   |
| Star Yellow   | `#F1C40F` | accent  | Star / highlight accent         | `--color-star-yellow`   |
| Org Orange    | `#F66A0A` | accent  | Organization icon accent        | `--color-org-orange`    |
| Repo Purple   | `#A371F7` | accent  | Trending / repo accent          | `--color-repo-purple`   |
| Awesome Red   | `#FF4757` | accent  | Awesome list accent             | `--color-awesome-red`   |
| Text Muted    | `#8B949E` | neutral | Secondary text / placeholder    | `--color-text-muted`    |
| Text Primary  | `#C9D1D9` | neutral | Body text                       | `--color-text-primary`  |

## Typography

**Base:** 16px · **Scale:** Major Third (1.25)

### System — _primary_

Native system font stack used throughout the app for all text.

- **Weights:** 400, 500, 600, 700
- **Sizes:** 12px, 14px, 16px, 20px, 24px, 32px, 40px
- **Line heights:** 1.3, 1.4, 1.5
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

### Type Scale

| Role       | Size | Line Height | Token               |
| ---------- | ---- | ----------- | ------------------- |
| caption    | 12px | 1.3         | `--text-caption`    |
| body-sm    | 14px | 1.4         | `--text-body-sm`    |
| body       | 16px | 1.5         | `--text-body`       |
| subheading | 20px | 1.4         | `--text-subheading` |
| heading    | 24px | 1.3         | `--text-heading`    |
| heading-lg | 32px | 1.2         | `--text-heading-lg` |
| display    | 40px | 1.1         | `--text-display`    |

## Spacing & Shape

**Base unit:** 8px · **Density:** comfortable · **Max width:** 375

**Scale:** 4px, 8px, 12px, 16px, 24px, 32px, 48px

**Border Radius:** buttons 999px · cards 12px · inputs 10px · tags 999px · navPill 999px

**Shadows:**

- `0 4px 12px rgba(0,0,0,0.4)` (Card Shadow)

## Surfaces

| Level | Name           | Value     | Purpose                          |
| ----- | -------------- | --------- | -------------------------------- |
| 0     | App Background | `#000000` | Root canvas behind all content   |
| 1     | Card / Sheet   | `#161B22` | Primary content containers       |
| 2     | List Row       | `#21262D` | Secondary rows and grouped items |

## Components

### Primary Button — _Sign-in action_

Full-width pill button with white fill (`#FFFFFF`), black text, 999px radius, 16px vertical padding.

### Secondary Button — _Enterprise sign-in_

Dark gray (`#30363D`) pill with white text, 999px radius, used for secondary flows.

### Tab Bar — _Bottom navigation_

Dark slate bar with four icons; active label and icon use GitHub Blue (`#58A6FF`).

### Filter Pills — _Inbox filters_

Dark rounded pills (`#21262D`) with muted text; selected state uses darker fill.

### Profile Header — _User detail card_

Full-bleed dark surface containing avatar, name, bio, and stats rows with colored icons.

### Activity Card — _Repository activity_

Slate-900 card with green accent border, repo icon, and release text.

### Status Input — _Profile status_

Dark rounded input field with emoji prefix and edit icon.

## Do's and Don'ts

### Do

- Use Octocat White (`#FFFFFF`) for primary CTAs and the GitHub logo mark.
- Apply GitHub Blue (`#58A6FF`) exclusively to links, active tab labels, and icon accents.
- Maintain pure black (`#000000`) as the root background across all screens.
- Use 999px radius on all buttons and filter pills for the signature pill aesthetic.
- Keep text hierarchy strict: 32–40px headings, 16px body, 12px captions.
- Reserve colored icons (yellow star, orange org, purple repo) only for their semantic rows.

### Don't

- Never invert brand colors — white is always the action surface, never the background.
- Do not introduce light mode surfaces or any white background behind the hero.
- Avoid using GitHub Blue on non-interactive text or large fills.
- Do not add success/error semantic colors unless they appear in the extracted palette.
- Never use system blue or other accent hues for primary actions.

## Imagery

Minimal line-art illustrations (octocat, squirrel, campfire) on pure black; monochrome line
weight with selective yellow accent on the octocat's paint roller.

## Layout

Edge-to-edge mobile screens with generous vertical rhythm, 16px card padding, and a persistent
bottom tab bar. Content is left-aligned with clear hierarchy and ample breathing room.

## Similar Brands

- **Linear** — Shares the same true-black canvas and restrained blue accents on a developer-focused product.
- **Vercel** — Uses high-contrast white text on black with minimal colored accents and pill-shaped buttons.
- **Figma** — Dark theme with crisp typography, colored icon accents, and rounded cards for collaboration surfaces.
- **Notion** — Clean dark mode with subtle surface layering and blue link treatment.

## Agent Prompt Guide

**Quick Color Reference**

- text: `#C9D1D9`
- background: `#000000`
- card: `#161B22`
- border: `#30363D`
- accent: `#58A6FF`
- primary action: `#FFFFFF`

1. Create a full-width white pill button with black text reading 'Sign in' and 999px radius on a black background.
2. Build a bottom tab bar with four icons (home, bell, telescope, person) where the active label and icon are colored `#58A6FF`.
3. Design a dark slate card containing a circular avatar, bold name, and two-line bio with 12px padding and 12px corner radius.
4. Render a row of three dark rounded filter pills labeled 'Inbox', 'Unread', 'Repository' with muted gray text.
5. Construct a list row with a yellow star icon, the word 'Starred', the number '6', and a right chevron on a `#21262D` surface.

## Quick Start — CSS Variables

```css
:root {
  --color-octocat-white: #ffffff;
  --color-void-black: #000000;
  --color-slate-900: #161b22;
  --color-slate-800: #21262d;
  --color-slate-700: #30363d;
  --color-github-blue: #58a6ff;
  --color-star-yellow: #f1c40f;
  --color-org-orange: #f66a0a;
  --color-repo-purple: #a371f7;
  --color-awesome-red: #ff4757;
  --color-text-muted: #8b949e;
  --color-text-primary: #c9d1d9;
  --space-unit: 8px;
}
```

---

## 이 문서의 용도 (fe-lab 블로그 적용 노트)

이 파일은 `apps/blog/web` 리디자인의 **디자인 시스템 소스 오브 트루스**다. 블로그는
Panda CSS 프리셋(`@design-system/ui` 의 `blog-preset.ts`)의 토큰을 통해 스타일링되며,
위 GitHub 레퍼런스를 **다크 전용**으로 이식한다.

### 적용 전략 (확정)

- **토큰 리컬러 · 다크 전용**: 기존 토큰 이름(`ink.*`, `paper.*`, `accent.*`, `marker.*`,
  `moss.*`)은 유지하고 **값만** GitHub 팔레트로 교체한다. 라이트→다크로 명도 램프를 반전해
  컴포넌트(93개 파일)를 건드리지 않고 대비 방향을 보존한다. 라이트 모드는 없다.
- **본문(장문 한글 프로즈)도 GitHub 팔레트 그대로** 적용한다.
- 레퍼런스는 모바일 앱 스펙(375px, 하단 탭바)이므로 **레이아웃 껍데기는 이식하지 않고**
  색/라운드/타이포/서피스 같은 **비주얼 언어**만 가져온다.

### 토큰 매핑 기준 (blog-preset.ts)

| 역할       | 블로그 토큰                | GitHub 값                    |
| ---------- | -------------------------- | ---------------------------- |
| root bg    | `paper.50`                 | `#000000` (또는 `#0d1117`)   |
| card/sheet | `paper.100`                | `#161B22`                    |
| list row   | `paper.200`                | `#21262D`                    |
| border     | `ink.border` / `paper.300` | `#30363D`                    |
| body text  | `ink.800`                  | `#C9D1D9`                    |
| heading    | `ink.950`                  | `#F0F6FC`                    |
| muted text | `ink.500` / `ink.600`      | `#8B949E`                    |
| link       | `accent.600`               | `#58A6FF`                    |
| link hover | `accent.700`               | `#79C0FF`                    |
| highlight  | `marker.*`                 | `#F1C40F` 계열 (반투명 처리) |
| live/green | `moss.600`                 | `#3FB950`                    |

### 자동으로 안 뒤집히는 수동 교체 지점

- `src/components/Layout.tsx` — sticky 네비 블러 배경 하드코딩 `rgba(252,250,247,0.95)`
- `src/components/GiscusComments.tsx` — `theme="light"` → 다크 테마
- `src/components/post/CodeBlock.tsx` — 이미 다크(`vscDarkPlus`/`#1e1e1e`), GitHub 톤 미세조정
- `src/styles/globals.css` — selection/focus/scrollbar/marker 하드코딩 oklch 값
- `src/app/layout.tsx` — `color-scheme: dark` + `theme-color` 메타 추가
