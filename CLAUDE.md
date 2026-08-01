# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

If the user's prompt starts with “EP:”, then the user wants to enhance the prompt. Read the
PROMPT_ENHANCER.md file and follow the guidelines to enhance the user's prompt. Show the user the
enhancement and get their permission to run it before taking action on the enhanced prompt.

The enhanced prompts will follow the language of the original prompt (e.g., Korean prompt input will
output Korean prompt enhancements, English prompt input will output English prompt enhancements,
etc.)

## Working Notes for Claude

Operational lessons from past sessions. Follow these to avoid repeated friction.

### Shell Environment

The user's interactive shell runs **scm_breeze + zsh plugins that wrap and sometimes intercept
`git`, `grep`, `ls`, `cat`, `rm`** and mangle heredocs, pipes, and escapes. Therefore:

- **Commits**: never use heredocs for commit messages — use `git commit -F <file>` or multiple
  `-m` flags.
- **Full output matters**: do not pipe to `head`/`tail` when you need the complete result (e.g. PR
  review comments). Write to a file, then read/count it. A past session silently dropped ~22 review
  comments to a `head -200`.
- **Intercepted builtins**: if `ls`/`cat`/`grep`/`git` fail oddly (e.g. exit 127), re-run with
  `command ls`, `command grep`, or the absolute binary (`/usr/bin/git`). Prefer the dedicated
  Read/Grep/Glob tools over shell builtins.

### TypeScript / Project Conventions

This repo targets **TypeScript 6 semantics, not TS5.x**. Before explaining or relying on compiler
behavior (default `types`, `rootDir`, `peerDependencies` promotion vs restore, etc.), **verify it
against the actual tsconfig/source in this repo** — never carry over TS5 assumptions. Be precise
about "add" vs "move" vs "promote" when describing dependency/catalog changes; confirm the intent
rather than guessing.

### Testing & Review

Before committing PR fixes:

1. Run an **adversarial self-review** of your own diff (hunt for regressions, edge cases, broken
   snapshots/fixtures) — not just a sanity pass. Consider a dedicated reviewer subagent.
2. Run the **full relevant test suite + lint + typecheck**, and verify **every** sibling/fixture
   file you touched rather than generalizing from one — past "fixes" broke tests (ENOENT, snapshot
   drift, suite-end vs suite-start timestamps) that only adversarial review caught.
3. Produce **clean, separated commits**.

See the `/pr-fix` skill for the full reviewed-PR loop.

### Response Style

When output would be large, chunk it and summarize rather than dumping everything in one message.
Prefer writing big intermediate results (logs, full comment lists, diffs) to a file and reporting
the key findings.

## Repository Overview

This is a Turborepo monorepo containing multiple frontend applications and shared packages for
experimenting with different frontend technologies and design patterns.

### Architecture

- **Monorepo structure**: Uses Turborepo for build orchestration and pnpm workspaces for dependency
  management
- **Applications**: Independent React, Next.js, and TypeScript applications in `apps/` directory
- **Shared packages**: Design system components and utilities in `packages/` directory
- **Design system**: Built with Panda CSS for styling and component generation

### Applications

- `apps/next.js/`: Next.js application with App Router, Jest testing, and Turbopack for development
- `apps/react/`: React SPA using Vite, Vitest for testing, and React Router for navigation
- `apps/typescript/`: Pure TypeScript application for experimenting with type design patterns
- `apps/blog/web/`: Next.js-based blog with Markdown content, Supabase analytics, and React Query for
  data fetching

### Shared Packages

- `@design-system/ui`: Component library with button components and shared UI elements
- `@design-system/ui-lib`: Generated Panda CSS utilities, patterns, and tokens
- `@package/core`: Core utilities including HTTP client and status code definitions
- `@package/config`: Shared TypeScript configurations

## Development Commands

### Starting Development

```bash
# Install dependencies
pnpm install

# Start all applications
pnpm dev

# Start specific applications
pnpm react    # React app + design system
pnpm next     # Next.js app + design system
pnpm typescript # TypeScript app
pnpm blog-web # Blog app + design system
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific app
cd apps/react && pnpm test
cd apps/next.js && pnpm test
cd apps/typescript && pnpm test

# Watch mode for Next.js
cd apps/next.js && pnpm test:watch
```

### Building and Quality Checks

```bash
# Build all applications
pnpm build

# Lint all applications
pnpm lint

# Type checking
pnpm check-types

# Blog-specific commands
pnpm blog-build  # Build blog application

# 블로그 글쓰기 도구 (apps/blog/web 디렉토리에서 실행)
pnpm new-post "글 제목" --series bundler --tags a,b      # 새 포스트 스캐폴딩
pnpm new-post "예약글" --scheduled 2026-05-01            # 예약 발행 글 (KST 자정 공개)
pnpm lint:posts                                          # frontmatter 검증 (필수 필드, 끊긴 이미지, 중복 slug 등)
```

## Key Design Patterns

### Workspace Dependencies

Use `workspace:` protocol for internal package dependencies:

```json
{
  "dependencies": {
    "@design-system/ui": "workspace:^"
  }
}
```

### Catalog Dependencies

The project uses pnpm catalog feature for consistent version management across apps:

- `catalog:react19` - React 19.1.0 and related types
- `catalog:typescript5` - TypeScript 5.8.3
- `catalog:` - Panda CSS dev dependencies

Reference in package.json as `"react": "catalog:react19"`

### Component Structure

Components follow this pattern:

```
components/ComponentName/
├── ComponentName.tsx
├── ComponentName.test.tsx
└── index.ts
```

### Testing Approach

- **React app**: Vitest + React Testing Library + MSW for API mocking
- **Next.js app**: Jest + React Testing Library + next-router-mock
- **TypeScript app**: Jest with Babel preset for TypeScript

Use `data-testid` attributes for test element selection and mock external dependencies.

### Styling System

Uses Panda CSS with:

- Generated CSS utilities in `@design-system/ui-lib`
- Component recipes for consistent styling
- JSX patterns for layout components (Box, Flex, Stack, etc.)

### Blog Architecture

The blog (`apps/blog/web/`) is a **statically generated (SSG) Next.js application** with a
**Supabase BaaS backend**, deployed to **GitHub Pages**. The domain is `https://blog.sangwook.dev`.

#### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Build Time (CI/CD)                          │
│                                                                     │
│  apps/blog/posts/  ──→  sync-posts.mjs (이미지)  ──→  public/posts/ │
│  (Markdown)        ──→  generate-sitemap.mjs     ──→  sitemap.xml   │
│                    ──→  generate-rss.mjs         ──→  rss.xml       │
│                    ──→  generate-search-index.ts  ──→ search-index  │
│                    ──→  next build (output: export) ──→ out/        │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────────────────────────┐
│  GitHub Pages    │     │  Supabase (Cloud)                        │
│  (Static Host)   │     │  ┌─────────────────────────────────────┐ │
│                  │     │  │ PostgreSQL                          │ │
│  - HTML/CSS/JS   │     │  │  - post_views (조회수)              │ │
│  - Images        │◄───►│  │  - view_history (조회 이력)         │ │
│  - sitemap.xml   │     │  │  - RPC functions (analytics)       │ │
│  - rss.xml       │     │  ├─────────────────────────────────────┤ │
│  - robots.txt    │     │  │ Auth (Google OAuth)                 │ │
│                  │     │  │  - Admin 인증                       │ │
│                  │     │  └─────────────────────────────────────┘ │
└──────────────────┘     └──────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────────────────────────┐
│  Google Analytics│     │  GA Proxy (apps/ga-proxy/)               │
│  (GA4)           │◄────│  - Velog 등 외부 플랫폼 조회수 추적      │
└──────────────────┘     └──────────────────────────────────────────┘
```

#### Deployment (GitHub Pages)

- **CI/CD**: `.github/workflows/deploy-blog.yml`로 자동 배포
- **Trigger**: `main` 브랜치에 `apps/blog/**` 경로 변경 시 자동 빌드 + 수동 트리거 지원
- **빌드 명령**: `pnpm build --filter=@blog/web --no-cache`
- **출력 디렉토리**: `apps/blog/web/out/` → GitHub Pages artifact로 업로드
- **환경변수**: GitHub Secrets에서 Supabase URL/Key, Admin Email 주입
- **캐싱**: Turborepo 캐시(`rharkor/caching-for-turbo`) + pnpm 캐시 활용

#### SSG (Static Site Generation) 전략

- **Next.js `output: 'export'`**: 프로덕션 빌드 시 완전한 정적 HTML 생성 (개발 모드에서는 해제)
- **`trailingSlash: true`**: GitHub Pages 호환을 위한 후행 슬래시 설정
- **`images.unoptimized: true`**: 정적 호스팅에서 Next.js Image Optimization 사용 불가하므로 비활성화

#### Supabase 백엔드

**역할**: 정적 사이트에서 불가능한 **동적 기능**을 담당

| 기능              | 설명                                                    |
| :---------------- | :------------------------------------------------------ |
| **조회수 추적**   | `increment_view_count` RPC → `post_views` 테이블에 저장 |
| **조회 이력**     | `view_history` 테이블에 시간별/일별 조회 기록           |
| **Admin 인증**    | Google OAuth를 통한 관리자 로그인                       |
| **Analytics RPC** | 대시보드용 집계 함수 (트렌드, 시간별, 요일별 통계)      |

- **클라이언트**: `@supabase/supabase-js`로 브라우저에서 직접 연결 (Anon Key 사용)
- **로컬 개발**: `supabase start/stop`으로 로컬 Supabase 인스턴스 실행 (Docker 기반)
- **마이그레이션**: `supabase/migrations/` 디렉토리에 SQL 파일로 스키마 관리
- **프로덕션 URL**: `.env.production`에 Supabase Cloud 프로젝트 URL/Key 설정

#### 콘텐츠 파이프라인

1. **콘텐츠 작성**: `apps/blog/posts/` 디렉토리에 Markdown 파일 작성
   - 새 포스트는 `pnpm new-post "제목"` 스캐폴딩 CLI로 시작 권장 (frontmatter 자동 생성)
   - 폴더 구조로 시리즈(series) 자동 분류 — `posts/{series}/` 폴더에 `_series.yml`을 두면 표시명/설명/order 정의 가능

   **Frontmatter 전체 목록** — 여기 없는 키는 `lint:posts`가 `unknown-frontmatter-key`로
   경고합니다. `domain/post/types.ts`의 `RawFrontmatter`가 단일 출처입니다.

   | 키              | 필수 | 설명                                                                                                                                                                                                        |
   | :-------------- | :--: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `status`        |  ✅  | `published` \| `draft` \| `scheduled`. **이 키가 없으면 포스트가 아니라 메타 노트로 간주되어 빌드에서 통째로 제외됩니다.**                                                                                  |
   | `title`         |  ✅  | 없으면 파일명으로 폴백하지만 `lint:posts`가 에러                                                                                                                                                            |
   | `date`          |  ✅  | `'YYYY-MM-DD'`. 목록 정렬·아카이브·sitemap·RSS가 모두 사용하고, `scheduled`일 때는 공개 시각이기도 함. 없으면 `missing-date` 에러                                                                           |
   | `slug`          |      | URL. 없으면 파일 경로에서 유도                                                                                                                                                                              |
   | `excerpt`       |      | 없으면 본문 앞 160자                                                                                                                                                                                        |
   | `thumbnail`     |      | 없으면 빌드 시 OG 카드(`/og/{slug}.png`) 자동 생성                                                                                                                                                          |
   | `hero`          |      | 히어로 슬롯에 꽂을 **등록된 다이어그램 이름**(현재 `deploy-pipeline`). 있으면 썸네일 대신 이 SVG가 그려진다. 렌더는 fail-soft(미등록 → 썸네일 폴백)지만 `lint:posts`가 `unknown-hero-diagram` 에러로 막는다 |
   | `tags`          |      | 문자열 배열. 문자열 아닌 원소가 섞이면 태그 전체가 무시됨                                                                                                                                                   |
   | `updatedAt`     |      | Schema.org `dateModified`, sitemap `lastmod`에 사용                                                                                                                                                         |
   | `scheduledDate` |      | **시각까지 지정할 때만.** 날짜만이면 `date`로 충분. 이걸 써도 `date`는 여전히 필수                                                                                                                          |

   `series`는 frontmatter가 아니라 **폴더 경로**로 결정됩니다(`repository.ts`).

2. **콘텐츠 공개 제어** — 축은 `status` **하나뿐**입니다 (`domain/post/visibility.ts`):
   - `status: published` — 공개
   - `status: draft` — 비공개 (빌드에서 제외)
   - `status: scheduled` — 공개 시각이 지나면 공개. 공개 시각은 `scheduledDate ?? date`
   - status가 없거나 enum 밖 → **비공개**(fail-closed)이자 아예 포스트로 취급되지 않음

   `status`는 **발행 의도**이고 실제 공개 여부는 `isPostVisible()`의 계산 결과입니다.
   예약일이 지난 글의 `status`를 손으로 `published`로 되돌릴 필요는 없습니다.

   > 예전 `published: boolean` 필드는 **제거**되었습니다. `status`와 공존하면 조용히
   > 무시되는 구조였고, 판정 규칙이 `repository.ts`와 `validate-posts.ts`에 따로
   > 존재해 어긋나 있었습니다. 지금은 `isPostFile()` 하나를 양쪽이 공유하고,
   > `published`가 남아 있으면 `lint:posts`가 `legacy-published-field` 에러를 냅니다.

3. **빌드 전 처리** (`prebuild` → `scripts/build-content.ts` 통합 진입점):
   - `validate-posts.ts`: frontmatter 필수 필드(`status`·`title`·`date`), 폐기된 `published` 필드, 날짜 형식/timezone 모호성, 끊긴 이미지, 중복 slug 검사 (prebuild에서만 실행, predev에서는 skip)
   - `sync-posts.mjs`: 포스트 디렉토리의 이미지/미디어 파일을 `public/posts/`에 복사 (mtime 기반 incremental — 변경분만 복사)
   - `generate-sitemap.ts`: 발행된 글 목록으로 `sitemap.xml` 생성
   - `generate-rss.ts`: RSS 피드(`rss.xml`) 생성
   - `generate-og-images.ts`: thumbnail이 없거나 `/og/*`를 가리키는 발행 글의 OG 카드 이미지(`public/og/{slug}.png`)를 satori + resvg로 생성 (content hash 기반 incremental, `.cache/og-images.json` manifest)
   - `generate-search-index.ts`: 검색용 JSON 인덱스(`search-index.json`) 생성 — 본문 미리보기(`contentPreview`) 포함
   - `generate-llms-full.ts`: AI/LLM용 통합 텍스트(`llms-full.txt`) 생성
4. **정적 빌드**: `next build` → `out/` 디렉토리에 정적 파일 생성
5. **배포**: GitHub Actions → GitHub Pages
   - `main` 브랜치 push 시 자동 빌드
   - **매일 KST 09:00 (UTC 00:00) cron 자동 빌드** — 예약 발행 글 공개용
   - 수동 트리거(`workflow_dispatch`) 지원

#### 글쓰기 도구 (Authoring DX)

| 도구                                          | 설명                                                                                                                        |
| :-------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| `pnpm new-post "제목"`                        | 새 포스트 스캐폴딩. `--series`, `--tags`, `--scheduled`, `--slug`, `--status` 옵션 지원. 한글 제목/파일명 그대로 사용 가능  |
| `pnpm lint:posts`                             | frontmatter 검증. 메타 노트 정책: frontmatter delimiter(`---`)가 없거나 `status`가 없으면 빌드 대상이 아닌 것으로 보고 skip |
| `/preview/[...slug]` 라우트                   | dev 환경에서만 동작하는 draft·scheduled 글 미리보기. prod 빌드는 placeholder 1개(`__disabled__`) + 즉시 `notFound`로 차단   |
| `_series.yml`                                 | 시리즈 폴더에 두면 시리즈 nav가 `order` 기준 chronological 정렬 + 표시명을 폴더명 대신 사용                                 |
| `<callout type="warning\|info\|tip\|danger">` | 마크다운 헬퍼 컴포넌트 (raw HTML로 작성). `<figure>` + `<figcaption>`, `<file-tree>`도 지원                                 |
| `<dialogue>` · `<metrics>` · `<timeline>`     | 리뉴얼 시그니처 컴포넌트. 역시 raw HTML 커스텀 태그 — 아래 "디자인 시스템" 참고                                             |
| `<diagram>` + frontmatter `hero:`             | 구조 그림. 저작법 전체는 **`apps/blog/web/design/DIAGRAM_AUTHORING.md`** — 아래 "다이어그램 문법" 참고                      |

#### 디자인 시스템 (리뉴얼 기준)

리뉴얼 때 쓰던 시각 기준 파일(`design-reference.html`)은 구현이 끝나 **삭제했다.**
이제 기준은 **구현된 화면 자체**다 — 홈(`/`)과 글 상세를 dev 서버로 열어 대조한다.
원래의 디자인 의도와 결정 배경은 `design/blog-redesign-handoff.md`에 남아 있고,
수치는 아래 항목들이 단일 출처다.

> `design/github-style-reference.md`는 **폐기된 이전 방향**(GitHub 스타일 다크 전용)이다.
> 참고 자료로 남겨둔 것뿐이니 새 작업의 근거로 쓰지 말 것.

##### 컬러 토큰

색은 전부 `packages/@design-system/ui/src/blog-preset.ts`의 semanticTokens로 정의돼
라이트/다크가 자동 전환된다. **컴포넌트에서 hex를 직접 쓰지 않는다.**

| 레퍼런스 CSS 변수                     | 토큰                             | 라이트 / 다크                                   |
| :------------------------------------ | :------------------------------- | :---------------------------------------------- |
| `--bg`                                | `paper.50`                       | `#FFFFFF` / `#0B0D10`                           |
| `--bg-sub`                            | `paper.100`                      | `#F7F7F5` / `#14171C`                           |
| `--page` ⚠️                           | `paper.200`                      | `#EDEDEA` / `#1B1F26`                           |
| `--fg`                                | `ink.950`                        | `#1A1A1A` / `#E6E8EB`                           |
| `--fg-sub`                            | `ink.600`                        | `#6B7280` / `#8B919A`                           |
| `--fg-sub` (서브 서피스 위 12px 메타) | `ink.500`                        | `#656C77` / `#8B919A`                           |
| `--accent` (**비텍스트** — 선·아이콘) | `accent.500`                     | `#1D9E75` / `#5DCAA5`                           |
| `--accent` (**텍스트·링크**)          | `accent.600`                     | `#157F5E` / `#5DCAA5`                           |
| `--accent-bg`                         | `accent.50`                      | `rgba(29,158,117,.10)` / `rgba(93,202,165,.14)` |
| `--border`                            | `ink.border`                     | `rgba(0,0,0,.10)` / `rgba(255,255,255,.12)`     |
| `--danger`                            | `danger.text` / `danger.border`  | `#C81E1E`·`#DC2626` / `#F09595`                 |
| `--success`                           | `moss.600` (텍스트는 `moss.700`) | `#16A34A` / `#97C459`                           |
| `--warn-bg` / `--warn-fg`             | `warn.bg` / `warn.text`          | `#FAEEDA`·`#854F0B` / `#3A2A10`·`#FAC775`       |

> ⚠️ **`paper.200` 다크만 시안(`#060809`)을 따르지 않는다.** 시안의 `--page`는 목업
> 카드 **뒤쪽 바깥 배경**이라 다크에서 `--bg`보다 더 어둡다. 실제 사이트엔 그 바깥
> 배경이 없고 `paper.200`은 인라인 코드·콜아웃처럼 지면에서 **한 단계 떠 있는**
> 서피스라, 시안 값을 쓰면 코드 배경이 본문보다 어두워져 파여 보인다.

> **글자엔 `accent.600`, 선·아이콘·다이어그램 스트로크엔 `accent.500`.**
> 레퍼런스 HTML은 둘 다 `--accent` 한 색이지만, 라이트 모드에서 `#1D9E75` **글자**는
> 흰 배경 위 3.4:1로 WCAG AA(4.5:1) 미달이다. 그래서 색상각은 유지한 채 명도만 낮춘
> 톤을 텍스트 전용으로 따로 뒀다. 비텍스트는 3:1 기준이라 원색 그대로 써도 통과한다.
> 같은 이유로 `moss.600`(배경·아이콘) ↔ `moss.700`(텍스트)도 분리돼 있다.

포인트색은 **링크 · 시리즈 배지 · 다이어그램의 핵심 경로**에만 쓴다. 그 외에는 무채색.

##### 타이포그래피

- 본문/UI: `fontFamily: 'sans'` (Pretendard Variable)
- **메타 정보는 `fontFamily: 'mono'`** (JetBrains Mono) — 날짜, 읽기 시간, 조회수,
  태그, 코드, 로고, 오픈소스 칩. "측정하는 엔지니어" 무드의 핵심이다
- 단, **시리즈 배지는 sans**다. `시리즈 · Turborepo 인프라 3/3` 처럼 안에 숫자가
  있어도 본문 성격의 라벨이고, 레퍼런스 `.badge`도 `font-family`를 지정하지 않아
  sans로 렌더된다. 홈·글 상세·`/series` 세 곳이 모두 sans로 맞춰져 있으니
  한 곳만 mono로 바꾸지 말 것 (숫자가 있다고 기계적으로 mono를 적용하지 않는다)
- 세리프 금지. `serif` 토큰은 sans로 매핑돼 있어 실수로 써도 세리프가 나오지 않는다

##### 형태

- 라운드: `radii.card`(12px, 카드) · `radii.control`(8px, 작은 요소) ·
  `radii.pill`(원형 아바타·아이콘·히어로 pill). **시리즈 배지는 `[6px]`** —
  레퍼런스 `.badge`가 6px이라 pill이 아니다
- 보더: `borderWidths.hairline`(1px) 단일 소스. **위계는 그림자가 아니라 보더로 표현한다**
- **그라데이션 · 글로우 · box-shadow 장식 금지.** 플랫 유지
- Panda는 `strictTokens: true`다. 토큰 밖 값은 `fontSize: '[12px]'`, `shadow: '[none]'`처럼
  대괄호로 이스케이프해 "여긴 의도적으로 토큰을 벗어난다"를 코드에 남긴다

##### 다이어그램 문법 (모든 글 공통)

- **이미지가 아니라 SVG React 컴포넌트**로 그린다 → 다크 모드 색 전환이 자동으로 따라온다.
  프리미티브는 `src/components/diagram`(`DiagramFrame` / `DiagramNode` / `DiagramEdge` /
  `DiagramLabel`)에 있고, 글별 다이어그램도 이 프리미티브 위에 올린다
- SVG 안에 **색을 하드코딩하지 않는다.** `currentColor` 또는 Panda `css()` 클래스로
  `fill`/`stroke`를 토큰에 연결한다
- 노드: 라운드 사각형 `rx=8`, 스트로크 1px(`borderWidths.hairline` 고정)
- 선: **실선 = 동기 호출**, **점선(`stroke-dasharray: 3 3`) = 비동기/데이터 흐름**
- 색은 **2색만**: 구조는 회색(fill `paper.100` / stroke `ink.border`),
  핵심 경로는 틸(fill `accent.50` / stroke `accent.500`)
- 라벨: 노드 제목 12px/600 + 부제 11px, **부제는 5단어 이내**

**글에 다이어그램을 붙이는 두 갈래** — 저작 가이드는
**`apps/blog/web/design/DIAGRAM_AUTHORING.md`** 에 전부 있다(prop 표, 복붙 예제, 함정).
여기엔 어느 쪽을 쓸지 고르는 기준만 남긴다.

1. **선언형 태그** — 노드를 나열하면 좌표가 자동으로 잡힌다. 좌→우 체인(`row`)과
   팬아웃(`fan`) 두 모양만 지원하고, 그 이상 복잡하면 대개 그림을 쪼개야 한다는 신호다.

   ```html
   <diagram label="스크린리더가 읽을 한 문장" caption="아래 중앙 주석">
     <diagram-node id="a" title="첫 단계" desc="부제 5단어 이내"></diagram-node>
     <diagram-node id="b" title="두 번째" tone="teal"></diagram-node>
     <diagram-edge from="a" to="b" flow="async" emphasis="true"></diagram-edge>
   </diagram>
   ```

   가장 자주 걸리는 규칙 둘: **엣지를 하나라도 쓰면 자동 연결이 꺼진다**(쓸 거면 전부 쓴다),
   그리고 시그니처 컴포넌트와 마찬가지로 **self-closing이 안 된다**(`<diagram-node />`로
   쓰면 뒤따르는 노드가 그 안에 중첩돼 조용히 사라진다).

2. **이름 레지스트리** — 분기·회귀처럼 자동 레이아웃으로 안 되는 그림은 손으로 그린
   컴포넌트를 `domain/post/diagramNames.ts`(이름)와 `src/components/diagram/registry.ts`
   (맵)에 각각 한 줄씩 등록하고 `<diagram name="deploy-pipeline">` 또는 frontmatter
   `hero:` 로 부른다. 타입이 `Record<DiagramName, …>`이라 한쪽만 하면 컴파일이 막는다.
   **히어로 슬롯은 이 갈래만 받는다.**

##### 시그니처 컴포넌트

velite/contentlayer/MDX는 도입하지 않는다. 로더는 `gray-matter` + `react-markdown` +
`rehype-raw` 그대로이고, 시그니처 컴포넌트도 `<callout>`·`<file-tree>`와 **똑같은 raw HTML
소문자 커스텀 태그**로 쓴다(`PostClient.tsx`의 `components` 맵에 등록돼 있다).

HTML 파서를 거치므로 **self-closing(`<metrics />`)은 동작하지 않는다.** 내용이 없어도
여는 태그와 닫는 태그를 모두 쓴다. 속성 값은 항상 문자열이라, 배열을 넘길 때는 JSON
문자열로 준다.

```html
<dialogue>
  <msg from="PM">배포하다 서비스 죽으면 어떡해요?</msg>
  <msg from="me">아니요, 점심에 합니다.</msg>
</dialogue>

<metrics
  items='[{"label":"배포 소요","value":"22분 → 8분"},{"label":"롤백","value":"자동","tone":"success"}]'
></metrics>

<timeline>
  <step
    title="시도 1 · pm2 롤링 재시작"
    desc="전환 순간 504"
    result="fail"
  ></step>
  <step
    title="시도 3 · blue/green"
    desc="실패 시 자동 롤백"
    result="success"
  ></step>
</timeline>
```

| 태그         | 용도                    | 핵심 속성                                                        |
| :----------- | :---------------------- | :--------------------------------------------------------------- |
| `<dialogue>` | 도입부 대화 재현        | 자식 `<msg from="...">`. `from="me"`면 우측 정렬 + 포인트색 버블 |
| `<metrics>`  | before/after 수치 강조  | `items` JSON 문자열 또는 자식 `<metric label value tone>`        |
| `<timeline>` | 시도 → 실패 → 해결 서사 | `steps` JSON 문자열 또는 자식 `<step title desc result>`         |

#### 클라이언트 사이드 기능 (런타임)

- **조회수 카운팅**: `useViewCount` 훅 → Supabase RPC 호출 (6시간 쿨다운, 쿠키 기반 중복 방지)
- **댓글**: Giscus (GitHub Discussions 기반)
- **Analytics 대시보드**: `/admin` 경로, React Query(`useSuspenseQuery`) + Recharts 차트
- **페이지 전환 애니메이션**: `@ssgoi/react` + Motion 라이브러리
- **데이터 페칭**: `@tanstack/react-query`로 Supabase 데이터 캐싱/관리

#### SEO & 디스커버리

- **Sitemap**: 빌드 시 자동 생성 (`/sitemap.xml`)
- **RSS**: 빌드 시 자동 생성 (`/rss.xml`)
- **robots.txt**: `/public/robots.txt`
- **OpenGraph/Twitter Card**: `layout.tsx` 메타데이터에 설정
- **Google Analytics**: `@next/third-parties` GA4 연동 (`G-ZS9ENFSSQ0`)
- **Google Tag Manager**: `@next/third-parties` GTM 연동 (`GTM-5SMPQ23P`). GA4와 **별개로** `layout.tsx`에서 함께 로드된다
- **GA Proxy**: `apps/ga-proxy/`로 Velog 등 외부 플랫폼 조회수 추적
- **검색 인증**: Naver 사이트 인증 메타태그 포함
- **검색 인덱스**: `search-index.json`으로 클라이언트 사이드 검색 지원

> **GTM 컨테이너는 이 저장소 밖에 있다.** 코드에 있는 건 컨테이너 ID 한 줄뿐이고,
> 어떤 태그가 실제로 발사되는지는 GTM 웹 콘솔에만 존재한다. 2026-07-30 Lighthouse
> 점검(이슈 #165)에서 이 컨테이너가 **Microsoft Clarity**(`clarity.ms`, `c.bing.com`)를
> 로드해 서드파티 쿠키 8개를 심는 것이 확인됐고, 그 때문에 Best Practices가 세 페이지
> 모두 77점이다(`third-party-cookies` 가중치 5 + `inspector-issues` 1 = 26점 중 6점 감점).
> 태그를 추가·제거할 때 여기와 `/privacy` 페이지를 함께 갱신할 것 — 현재 개인정보처리방침은
> GA4만 고지하고 있어 Clarity가 누락된 상태다.

#### 인증 & Admin

- **Admin 페이지**: `/admin` (로그인), `/admin/analytics` (상세 분석)
- **인증 방식**: Supabase Auth + Google OAuth
- **접근 제어**: `NEXT_PUBLIC_ADMIN_EMAIL` 환경변수에 등록된 이메일만 Admin 접근 허용

#### 주요 설정 파일

| 파일                                        | 역할                                                                    |
| :------------------------------------------ | :---------------------------------------------------------------------- |
| `next.config.ts`                            | SSG output, trailingSlash 설정                                          |
| `panda.config.ts`                           | Panda CSS 스타일 설정                                                   |
| `.env.production`                           | Supabase URL/Key, Giscus 설정                                           |
| `.env.local`                                | 로컬 개발용 환경변수 (GA, Supabase local 등)                            |
| `supabase/config.toml`                      | 로컬 Supabase 설정 (Auth, DB, Storage 등)                               |
| `.github/workflows/deploy-blog.yml`         | CI/CD 배포 워크플로우                                                   |
| `apps/blog/posts/{series}/_series.yml`      | (선택) 시리즈 표시명·설명·order 메타                                    |
| `apps/blog/web/scripts/build-content.ts`    | predev/prebuild 통합 진입점 (validate/sync/sitemap/rss/search/llms)     |
| `apps/blog/web/design/DIAGRAM_AUTHORING.md` | 다이어그램 저작 가이드 (선언형 태그 prop 표, 복붙 예제, `hero:` 등록법) |

## Prerequisites

- Node.js >= 24 (루트 `engines` 및 `.tool-versions` 기준 24.6.0; `apps/blog/web`의 `node --test '<glob>'` 글롭 패턴이 22.5+ 필요)
- pnpm 11.6.0 (specified in packageManager field)
