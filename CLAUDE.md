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

   | 키 | 필수 | 설명 |
   | :--- | :---: | :--- |
   | `status` | ✅ | `published` \| `draft` \| `scheduled`. **이 키가 없으면 포스트가 아니라 메타 노트로 간주되어 빌드에서 통째로 제외됩니다.** |
   | `title` | ✅ | 없으면 파일명으로 폴백하지만 `lint:posts`가 에러 |
   | `date` |  | `'YYYY-MM-DD'`. `scheduled`일 때는 공개 시각으로도 쓰임 |
   | `slug` |  | URL. 없으면 파일 경로에서 유도 |
   | `excerpt` |  | 없으면 본문 앞 160자 |
   | `thumbnail` |  | 없으면 빌드 시 OG 카드(`/og/{slug}.png`) 자동 생성 |
   | `tags` |  | 문자열 배열. 문자열 아닌 원소가 섞이면 태그 전체가 무시됨 |
   | `updatedAt` |  | Schema.org `dateModified`, sitemap `lastmod`에 사용 |
   | `scheduledDate` |  | **시각까지 지정할 때만.** 날짜만이면 `date`로 충분 |

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
   - `validate-posts.ts`: frontmatter 필수 필드, 폐기된 `published` 필드, `scheduled`의 공개 시각 존재 여부, 끊긴 이미지, 중복 slug 검사 (prebuild에서만 실행, predev에서는 skip)
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

| 도구                                          | 설명                                                                                                                       |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `pnpm new-post "제목"`                        | 새 포스트 스캐폴딩. `--series`, `--tags`, `--scheduled`, `--slug`, `--status` 옵션 지원. 한글 제목/파일명 그대로 사용 가능 |
| `pnpm lint:posts`                             | frontmatter 검증. 메타 노트 정책: frontmatter delimiter(`---`)가 없거나 `status`가 없으면 빌드 대상이 아닌 것으로 보고 skip |
| `/preview/[...slug]` 라우트                   | dev 환경에서만 동작하는 draft·scheduled 글 미리보기. prod 빌드는 placeholder 1개(`__disabled__`) + 즉시 `notFound`로 차단  |
| `_series.yml`                                 | 시리즈 폴더에 두면 시리즈 nav가 `order` 기준 chronological 정렬 + 표시명을 폴더명 대신 사용                                |
| `<callout type="warning\|info\|tip\|danger">` | 마크다운 헬퍼 컴포넌트 (raw HTML로 작성). `<figure>` + `<figcaption>`, `<file-tree>`도 지원                                |

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
- **GA Proxy**: `apps/ga-proxy/`로 Velog 등 외부 플랫폼 조회수 추적
- **검색 인증**: Naver 사이트 인증 메타태그 포함
- **검색 인덱스**: `search-index.json`으로 클라이언트 사이드 검색 지원

#### 인증 & Admin

- **Admin 페이지**: `/admin` (로그인), `/admin/analytics` (상세 분석)
- **인증 방식**: Supabase Auth + Google OAuth
- **접근 제어**: `NEXT_PUBLIC_ADMIN_EMAIL` 환경변수에 등록된 이메일만 Admin 접근 허용

#### 주요 설정 파일

| 파일                                     | 역할                                                                |
| :--------------------------------------- | :------------------------------------------------------------------ |
| `next.config.ts`                         | SSG output, trailingSlash 설정                                      |
| `panda.config.ts`                        | Panda CSS 스타일 설정                                               |
| `.env.production`                        | Supabase URL/Key, Giscus 설정                                       |
| `.env.local`                             | 로컬 개발용 환경변수 (GA, Supabase local 등)                        |
| `supabase/config.toml`                   | 로컬 Supabase 설정 (Auth, DB, Storage 등)                           |
| `.github/workflows/deploy-blog.yml`      | CI/CD 배포 워크플로우                                               |
| `apps/blog/posts/{series}/_series.yml`   | (선택) 시리즈 표시명·설명·order 메타                                |
| `apps/blog/web/scripts/build-content.ts` | predev/prebuild 통합 진입점 (validate/sync/sitemap/rss/search/llms) |

## Prerequisites

- Node.js >= 24 (루트 `engines` 및 `.tool-versions` 기준 24.6.0; `apps/blog/web`의 `node --test '<glob>'` 글롭 패턴이 22.5+ 필요)
- pnpm 11.6.0 (specified in packageManager field)
