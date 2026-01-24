# AGENTS.md - Context & Rules for AI Agents

This file provides the necessary context, commands, and standards for AI agents operating in this repository (`fe-lab`).
**READ THIS FIRST** before making changes.

## 1. Environment & Setup

- **Package Manager**: `pnpm` (v10.10.0). strictly enforce `pnpm-lock.yaml`.
- **Monorepo Tool**: `turborepo`.
- **Node Version**: >= 20.
- **Root Commands**:
  - `pnpm install`: Bootstrap dependencies.
  - `pnpm dev`: Start all apps in parallel.
  - `pnpm build`: Build all apps/packages.
  - `pnpm test`: Run all tests.
  - `pnpm lint`: Run ESLint across the repo.
  - `pnpm check-types`: Run TypeScript validation.

## 2. Project Structure

- **apps/**
  - `next.js/` (Next.js 16 + App Router): Core experimentation lab.
  - `react/` (Vite + React 19): SPA experimentation lab.
  - `typescript/` (Pure TS): Type challenges and logic experiments.
  - `blog/web/` (Next.js + MDX): Tech blog.
  - `ga-proxy/` (Next.js): Utility service.
- **packages/**
  - `@design-system/ui`: Shared React components.
  - `@design-system/ui-lib`: Panda CSS generated tokens/styles (DO NOT EDIT directly).
  - `@package/core`: Shared utilities (HTTP client, etc.).
  - `@package/config`: Shared TS/ESLint configs.

## 3. Development Commands (Crucial for Agents)

### Running Specific Apps

Do not run `pnpm dev` if you only need one app. Save resources.

- `pnpm next`: Run `apps/next.js`
- `pnpm react`: Run `apps/react`
- `pnpm typescript`: Run `apps/typescript`

### Running Tests (Targeted)

**ALWAYS** run relevant tests after changes. Do not run the full suite unless necessary.

**Pattern**: `pnpm test --filter=<app_name> -- <test_args>`

- **Single App Suite**:

  ```bash
  pnpm test --filter=next.js   # Run all Next.js tests (Jest)
  pnpm test --filter=react     # Run all React tests (Vitest)
  ```

- **Single Test File** (Best for TDD/Debugging):

  ```bash
  # Jest (Next.js)
  pnpm test --filter=next.js -- src/app/some-feature.test.tsx

  # Vitest (React)
  pnpm test --filter=react -- src/features/some-feature.test.tsx
  ```

- **Watch Mode**:
  - `pnpm --filter=next.js run test:watch`

## 4. Coding Standards

### TypeScript

- **Strictness**: `strict: true` is enabled. No `any`. Use `unknown` or specific types.
- **Interfaces**: Prefer `interface` over `type` for object definitions.
- **Exports**: Use named exports (`export const Foo = ...`) over default exports, except for Next.js Pages/Layouts.

### React & Next.js

- **Component Naming**: PascalCase (`UserCard.tsx`).
- **Structure**:
  ```text
  UserCard/
  ├── index.ts        # Export barrel
  ├── UserCard.tsx    # Component logic & view
  └── UserCard.test.tsx # Tests
  ```
- **Hooks**: Use `use` prefix. Encapsulate complex logic in custom hooks.
- **Server Components**: In `apps/next.js`, default to Server Components. Add `"use client"` only when interactive state/hooks are needed.

### Styling (Panda CSS)

- **Zero Runtime**: Use Panda CSS recipes and patterns.
- **Restricted Files**: **NEVER** edit files inside `styled-system/` or `packages/@design-system/ui-lib/dist`.
- **Tokens**: Use semantic tokens (e.g., `css({ color: "text.primary" })`) instead of raw hex values.

### Imports

- **Order**: External deps -> Internal packages (`@package/*`) -> Local absolute (`@/*`) -> Relative.
- **Absolute Imports**: Use `@/` alias for `src/` directory.

### Error Handling

- **Typed Errors**: Do not throw raw strings. Use `Error` instances or custom error classes.
- **Boundaries**: Ensure UI components are wrapped in Error Boundaries where appropriate.
- **Async**: Always handle Promise rejections (try/catch or `.catch`).

## 5. Testing Guidelines

- **Tools**:
  - `jest` + `react-testing-library` (Next.js)
  - `vitest` + `react-testing-library` (React/Vite)
  - `msw` (Network mocking)
- **Selectors**: Prefer user-centric selectors:
  1. `getByRole` (button, heading, etc.)
  2. `getByLabelText` (forms)
  3. `getByPlaceholderText`
  4. `getByText`
  5. `getByTestId` (Last resort: use `data-testid="identifier"`)
- **Mocking**: Use MSW for API calls. Avoid mocking internal hook implementations if possible (test behavior, not implementation).

## 6. Git & Workflow

- **Commit Messages**: Conventional Commits.
  - `feat(scope): ...`
  - `fix(scope): ...`
  - `docs(scope): ...`
  - `refactor(scope): ...`
  - `test(scope): ...`
- **Scope**: `next`, `react`, `ui`, `core`, etc.
- **PRs**: Self-review required. Verify `pnpm lint` and `pnpm check-types` pass before submitting.

## 7. Troubleshooting

- **Lockfile Issues**: If dependencies are weird, run `pnpm install --frozen-lockfile`.
- **Turbo Cache**: If builds are stale/broken, run `pnpm build --force`.
- **Types**: If types are missing, check `pnpm-workspace.yaml` catalog versions.

**Agent Action Checklist**:

1. Read this file.
2. Locate relevant files using `ls` and `find` (or `glob` tool).
3. `pnpm install` if new deps are needed (rare).
4. Make changes.
5. **VERIFY**: Run specific tests (`pnpm test --filter=... -- <file>`).
6. Lint/Typecheck changed files.
