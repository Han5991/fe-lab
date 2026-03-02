# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

If the user's prompt starts with “EP:”, then the user wants to enhance the prompt. Read the
PROMPT_ENHANCER.md file and follow the guidelines to enhance the user's prompt. Show the user the
enhancement and get their permission to run it before taking action on the enhanced prompt.

The enhanced prompts will follow the language of the original prompt (e.g., Korean prompt input will
output Korean prompt enhancements, English prompt input will output English prompt enhancements,
etc.)

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
- `apps/blog/web/`: Next.js-based blog with MDX support, Supabase analytics, and React Query for
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
│  (Markdown/MDX)    ──→  generate-sitemap.mjs     ──→  sitemap.xml   │
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
- **MDX 지원**: `@next/mdx` 플러그인으로 `.mdx` 파일을 페이지로 처리

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
   - Frontmatter: `title`, `date`, `slug`, `excerpt`, `thumbnail`, `tags`, `published`
   - `published: true`인 글만 빌드에 포함
   - 폴더 구조로 시리즈(series) 자동 분류
2. **빌드 전 처리** (`prebuild`):
   - `sync-posts.mjs`: 포스트 디렉토리의 이미지/미디어 파일을 `public/posts/`에 복사
   - `generate-sitemap.mjs`: 발행된 글 목록으로 `sitemap.xml` 생성
   - `generate-rss.mjs`: RSS 피드(`rss.xml`) 생성
   - `generate-search-index.ts`: 검색용 JSON 인덱스(`search-index.json`) 생성
3. **정적 빌드**: `next build` → `out/` 디렉토리에 정적 파일 생성
4. **배포**: GitHub Actions → GitHub Pages

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

| 파일                                | 역할                                         |
| :---------------------------------- | :------------------------------------------- |
| `next.config.ts`                    | SSG output, MDX, trailingSlash 설정          |
| `panda.config.ts`                   | Panda CSS 스타일 설정                        |
| `.env.production`                   | Supabase URL/Key, Giscus 설정                |
| `.env.local`                        | 로컬 개발용 환경변수 (GA, Supabase local 등) |
| `supabase/config.toml`              | 로컬 Supabase 설정 (Auth, DB, Storage 등)    |
| `.github/workflows/deploy-blog.yml` | CI/CD 배포 워크플로우                        |

## Prerequisites

- Node.js >= 20
- pnpm 10.10.0 (specified in packageManager field)
