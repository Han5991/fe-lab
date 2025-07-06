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

The blog application (`apps/blog/web/`) features:

- **Content Management**: MDX files in `apps/blog/posts/` with frontmatter metadata
- **Analytics**: Supabase integration for view tracking with client-side fallback
- **Data Fetching**: React Query hooks (`useViewCount`) for analytics data
- **Static Generation**: Next.js static export for deployment
- **Database**: Supabase with migration files in `supabase/migrations/`

Blog content is organized by categories and includes Korean technical articles on TypeScript design
patterns, architecture, and frontend development practices.

## Prerequisites

- Node.js >= 20
- pnpm 10.10.0 (specified in packageManager field)

## 글쓰기 프롬프트

# 기술 블로그 글쓰기 프롬프트

## 당신의 글쓰기 스타일 분석 결과

### 📝 구성 패턴

- **프롤로그**: 현실적인 실무 상황으로 시작 (슬랙 메시지, 기획자와의 대화 등)
- **단계별 구성**: 1부, 2부, 3부... 형식으로 논리적 전개
- **문제 → 해결 → 결과** 구조
- **마무리**: 회고와 다음 단계 제시

### 🎭 톤앤매너

- 친근하고 솔직한 어조
- 실무자의 고충에 공감하는 시선
- "별거 없어요!", "금방 하시죠?" 같은 현실적 표현
- 완벽한 해결책보다는 현실적 대안 제시

### 💬 대화체 활용

- [기획자], [나], [개발자], [동료] 등 역할별 대화
- 실제 업무 상황 재현
- 독자와의 가상 대화로 설명

---

## 프롬프트

**주제: [여기에 소재 입력]**

다음 스타일로 기술 블로그 글을 작성해주세요:

### 📋 기본 구성

1. **프롤로그** - 실무에서 겪는 현실적인 상황으로 시작 (슬랙 대화, 회의 상황 등)
2. **문제 상황 정의** - 왜 이 기술/방법이 필요한지 구체적 사례
3. **단계별 해결 과정** - 1부, 2부, 3부 형식으로 논리적 전개
4. **결과 및 마무리** - 실제 적용 결과와 아쉬운 점, 개선 방향

### 🎯 글쓰기 스타일 가이드

**톤앤매너:**

- 3년차 프론트엔드 개발자 시점에서 작성
- 실무에서 겪는 현실적인 어려움에 공감하는 어조
- "별거 없어요", "금방 하시죠?" 같은 현실적 표현 활용
- 완벽한 해결책보다는 팀 상황에 맞는 현실적 대안 제시

**대화체 활용:**

```
[기획자]: "이거 프론트에서 금방 할 수 있죠?"
[나]: (속마음: 또 시작이다...) "일정은 PM분과 이야기하고 오신 거죠?"
```

**구체적 표현:**

- 이모지 활용 (🎉, 📁, 🔨, 💡, ✅, ❌, 🚀)
- 코드 예시는 실제 프로젝트에서 사용할 수 있는 수준
- 파일 경로 명시 (📁 apps/react/src/...)

**기술적 접근:**

- TypeScript/React/Next.js 중심
- 아키텍처 설계 관점에서 문제 해결
- DI, Service Layer, Clean Architecture 등 고급 패턴 활용
- 팀 협업과 유지보수성을 중시하는 관점

**내용 구성:**

- 실패 경험도 솔직하게 공유
- 팀 내 설득 과정 포함
- 장단점 분석 필수
- Keep/Problem/Try 형식의 회고
- 실무 적용 체크리스트 제공

**예시 프롤로그:**

> 피곤에 쩔은 모습으로 하나의 테스크를 마무리하는 순간 슬랙이 울립니다.
> **[기획자]: "급하게 기획이 바뀌어서요. 이거 프론트에서 추가로..."**
> 순간 머릿속에서 이런 생각이 스쳐갑니다. "또...?"

**마무리 스타일:**

- 정리하며 섹션으로 핵심 요약
- 다음 단계나 시리즈 예고
- "이제 기획자가 '별거 없어요!'라고 말할 때 정말로 별거 없게 만들 수 있습니다! 🎉"

### 🔍 주의사항

- 기술적 깊이와 실무 적용성의 균형 유지
- 초보자도 이해할 수 있도록 단계별 설명
- 왜 이 방법을 선택했는지 근거 제시
- 팀 상황과 프로젝트 규모를 고려한 현실적 조언

---

이 프롬프트를 사용해서 [소재]에 대한 글을 작성해주세요!
