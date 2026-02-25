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

