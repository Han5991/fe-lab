# AGENTS.md - Context & Rules for AI Agents

This file provides the necessary context, commands, and standards for AI agents operating in this repository (`fe-lab`).
**READ THIS FIRST** before making changes. Blog-specific rules (publishing, frontmatter contract, SEO gates,
design guardrails) live in `CLAUDE.md` → "Blog Architecture"; the blog app's code layout is in
`apps/blog/web/README.md`. Writing a post itself (structure, tone, forbidden genre vocabulary) is the
`tech-blog-writer` skill in `.claude/skills/` — the single source. Do not restate its rules here, and do not
add a second copy elsewhere: this repo already carried four diverging copies of that coaching prompt, two of
which still taught the Hero's Journey template the skill exists to forbid.

## 1. Environment & Setup

- **Package Manager**: `pnpm` — version pinned by root `packageManager` (also in `.tool-versions`). Strictly enforce `pnpm-lock.yaml`.
- **Monorepo Tool**: `turborepo`.
- **Node Version**: root `engines.node` / `.tool-versions` are the single source (Node 24 line as of 2026-08). Do not copy numbers into docs — Renovate bumps them.
- **TypeScript**: `pnpm-workspace.yaml` catalog (TypeScript 6 line). Verify TS6 semantics against the actual tsconfig — do not carry over TS5 assumptions.
- **Root Commands**:
  - `pnpm install`: Bootstrap dependencies (`prepare` installs lefthook hooks).
  - `pnpm dev`: Start all apps in parallel.
  - `pnpm build`: Build all apps/packages.
  - `pnpm test` / `pnpm lint` / `pnpm check-types`: Run across the repo (turbo).
  - `pnpm format` / `pnpm format:check`: Prettier write / check — **`format:check` is a CI gate.**
  - `pnpm new-post "제목"` / `pnpm blog-write`: The two writing entrances (scaffold a post / preview without Docker).
  - There are **no per-app aliases**. Target one app with the filter pattern: `pnpm dev --filter=react`,
    `pnpm build --filter=@blog/web`, `pnpm dev --filter=socket-server --filter=react` (turbo runs both).
  - `pnpm clean` (`clean:dist` + `clean:modules`).

## 2. Project Structure

- **apps/**
  - `blog/web/` (`@blog/web`, Next.js 16, static export): Tech blog. Layers `src/shared → src/lib/platform → src/domain/{analytics,auth}` → app layer
    enforced by `eslint-plugin-boundaries`. Content loading/validation/artifact generation is **not** here — it lives in
    `packages/@blog/content`, whose scripts the app runs through the `blog-content` bin (`blog-content build`, `… validate`, `… check-seo`).
    Markdown is `gray-matter` + `react-markdown` — **not** MDX/velite/contentlayer.
  - `blog/posts/` (not a workspace): Markdown sources + `_series.yml`. Only folders with `_series.yml` are series.
  - `next.js/` (Next.js 16 + App Router + Turbopack): Core experimentation lab.
  - `react/` (Vite 8 + React 19 + React Router 8 + TanStack Query): SPA experimentation lab.
  - `typescript/` (Pure TS): Type challenges and logic experiments.
  - `socket-server/`: Dependency-free TypeScript WebSocket server (no lint/test scripts).
- **packages/**
  - `@blog/content`: Blog content framework — schema (frontmatter descriptor table), loader, visibility, series, URL
    contract, SEO builders (`@blog/content/seo`), build scripts, two-layer validation (`validate-posts` on sources /
    `check-seo` on built HTML). Source export, no build step — the `blog-content` bin runs the `.ts` sources on plain node
    (type stripping; every relative import carries a `.ts` extension). Internal layers
    `shared → post → seo → scripts → scripts/render → scripts/cli` enforced by boundaries. See `packages/@blog/content/README.md`.
  - `@design-system/ui`: Shared React components + Panda presets (`./preset`, `./blog-preset` = blog token source of truth).
  - `@design-system/ui-lib`: Panda CSS generated tokens/styles (DO NOT EDIT directly).
  - `@package/core`: Shared utilities (HTTP client, status codes, errors).
  - `@package/config`: Shared **tsconfig** base only (ESLint is a per-workspace flat config).
  - `@package/bundler` + `@package/bundler-playground` + `@package/sample-lib`:
    Minimal bundler built for the bundler blog series.

## 3. Development Commands (Crucial for Agents)

### Running Specific Apps

Do not run `pnpm dev` if you only need one app. Save resources.

- `pnpm dev --filter=@blog/web`: Run `apps/blog/web` (starts local Supabase; writing-only: `pnpm blog-write`)
- `pnpm dev --filter=<pkg>`: Run one experiment app (`react`, `next.js`, `typescript`, `socket-server`)
- `pnpm dev --filter=socket-server --filter=react`: WebSocket server paired with the react client

### Running Tests (Targeted)

**ALWAYS** run relevant tests after changes. Do not run the full suite unless necessary.

**Pattern**: `pnpm test --filter=<package_name> -- <test_args>` (turbo passthrough; the args are hashed into the task
key, so a run with new args is a cache miss while identical re-runs still hit, and `test` depends on `^build`, so the
first run may build dependencies). Package names are `@blog/web`, `@blog/content`, `next.js`, `react`, `typescript` —
**not** folder paths.

- **Single Workspace Suite**:

  ```bash
  pnpm --filter @blog/content test   # Vitest, node env — content contracts, generators, validation
  pnpm --filter @blog/web test       # Vitest, two projects: node (src/shared, src/domain, src/lib) + jsdom (rest of src)
  pnpm test --filter=next.js         # Vitest (jsdom + RTL + next-router-mock)
  pnpm test --filter=react           # Vitest (jsdom + RTL + MSW)
  pnpm test --filter=typescript      # Vitest (node)
  ```

- **Single Test File** (Best for TDD/Debugging):

  ```bash
  pnpm test --filter=next.js -- src/app/some-feature.test.tsx
  pnpm --filter @blog/web exec vitest run src/components/Rail.test.tsx
  pnpm --filter @blog/content exec vitest run src/post/urls.test.ts

  # One project only (blog/web has two)
  pnpm --filter @blog/web exec vitest run --project=node
  ```

- **Watch Mode**: `pnpm --filter=next.js run test:watch`, `pnpm --filter @blog/web run test:watch`.

### Blog Content Commands (run in `apps/blog/web`)

- `pnpm lint:posts` — frontmatter/body validation (warnings). `prebuild` runs the same rules with `--strict`.
- `pnpm check-seo` — built-HTML SEO gate; already the last step of `pnpm build`.
- `pnpm new-post "제목" --series … --tags … --scheduled …` — scaffold a post.

## 4. Coding Standards

### TypeScript

- **Strictness**: `strict: true` everywhere. `apps/blog/web` and `packages/@blog/content` additionally enable
  `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `exactOptionalPropertyTypes` (production tsconfig only;
  `tsconfig.test.json` turns those three off). No `any`. Use `unknown` or specific types.
- **Interfaces**: Prefer `interface` over `type` for object definitions (lint-enforced via typescript-eslint `stylistic` in
  `@blog/web`/`@blog/content`; convention elsewhere).
- **Exports**: Use named exports (`export const Foo = ...`) over default exports, except for Next.js Pages/Layouts.
- **Type imports**: `import type` (`consistent-type-imports` warns).

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
- **Server Components**: In `apps/next.js` and `apps/blog/web`, default to Server Components. Add `"use client"` only when
  interactive state/hooks are needed.

### Styling (Panda CSS)

- **Zero Runtime**: Use Panda CSS recipes and patterns.
- **Restricted Files**: **NEVER** edit files inside `styled-system/` or `packages/@design-system/ui-lib`.
- **Tokens**: Use semantic tokens (e.g., `css({ color: "text.primary" })`) instead of raw hex values. The blog runs
  `strictTokens: true` — off-token values must be escaped as `'[12px]'` on purpose.

### Imports

- **Order**: External deps -> Internal packages (`@package/*`, `@blog/*`, `@design-system/*`) -> Local absolute (`@/*`) -> Relative.
- **Absolute Imports**: `@/` alias differs per app — `apps/next.js`, `apps/react`: `@/*` → `src/*`;
  **`apps/blog/web`: `@/*` → app root** (`@/src/...`, `@/domain/...`, `@/lib/...`).
- **Layer boundaries (blog)**: `src` must go through the `domain/analytics` barrels (never import `*Repository` directly, never
  call `client.from()`/`.rpc()` in `src`); `domain` may not import `src`; `lib` may not import `domain`/`src`; `src` may not
  import node core (fs belongs to `@blog/content`). Inside `@blog/content`: `shared → post → seo → scripts → scripts/render`,
  React/satori/sharp only in `scripts/render`. All of this is lint (`eslint-plugin-boundaries`), so run `pnpm lint`.

### Error Handling

- **Typed Errors**: Do not throw raw strings. Use `Error` instances or custom error classes.
- **Boundaries**: Ensure UI components are wrapped in Error Boundaries where appropriate.
- **Async**: Always handle Promise rejections (try/catch or `.catch`).

## 5. Testing Guidelines

- **Tools**:
  - `vitest` everywhere — the runner never varies, only the environment does
  - `react-testing-library` in the jsdom environments (Next.js, React/Vite, blog/web `src/**`)
  - node environment for pure logic (blog/web `src/shared`·`src/domain`·`src/lib`; `@blog/content` `src/**` — all content/scripts tests live there now)
  - `msw` (Network mocking — `apps/react`)
- **Selectors**: Prefer user-centric selectors:
  1. `getByRole` (button, heading, etc.)
  2. `getByLabelText` (forms)
  3. `getByPlaceholderText`
  4. `getByText`
  5. `getByTestId` (Last resort: use `data-testid="identifier"`)
- **Mocking**: Prefer **injection over mocking**. `@blog/content` takes its config through `defineTestContent`, its
  paths through a tmpdir, and its clock through the `now` argument of `isPostVisible(data, timezone, now)`; the
  fixture values are deliberately different from the real site values (`src/shared/testValues.ts`), so a consumer
  that ignores the injection and reads a constant directly fails the test — a failure a mock cannot catch. Reach for
  `vi.mock` only where a seam cannot be injected, and never to stub internal hook implementations (test behavior, not
  implementation). MSW exists in `apps/react` only.
- **Contract tests**: `packages/@blog/content/src/post/contract.test.ts` and `src/scripts/contract.test.ts` read the real
  `apps/blog/posts/` — they are the safety net for content/pipeline refactors. `src/post/frontmatterSchema.test.ts` diffs the
  frontmatter table in root `CLAUDE.md` character-for-character against the descriptor table; edit both together.

## 6. Git & Workflow

- **Commit Messages**: Conventional Commits, Korean subject line, declarative (`~한다`) — the subject states the rule
  the commit establishes, not a summary of the files it touched.
  - `feat(scope): ...` / `fix(scope): ...` / `docs(scope): ...` / `refactor(scope): ...` / `test(scope): ...`
  - Two non-standard types are used on purpose: `strict(scope)` for a TypeScript/lint tightening step, and
    `blog(scope)` for work whose point is the writing — the post itself, plus whatever rendering or tooling that post
    needed (e.g. `728d021` moved series resolution to one place while finishing a series). Do not invent others.
  - **No AI attribution trailers** (`Co-Authored-By: Claude`, `Claude-Session:`, …). Nothing enforces this, and
    squash merge is how it leaks in — the trailer rides along in a sub-commit body and lands on `main`. Strip it
    from every sub-commit before the PR is squashed, not after.
- **Scope**: the workspace or area the change lands in. Blog work splits by package: `blog` (posts/authoring),
  `blog-web` (the Next.js app), `blog-content` (`@blog/content`). Also in active use: `ci`, `deps`, `claude`,
  `bundler`, `supabase`, `react`, `next`, `renovate`, `vercel`, `turbo`.
- **Hooks (lefthook)**: `pre-commit` runs prettier on staged files (`apps/blog/posts/**` excluded); `pre-push` runs
  `pnpm lint` / `check-types` / `test` in parallel. There is no `commit-msg` hook — the message rules above are
  held by hand. Bypass only when necessary: `LEFTHOOK=0` or `--no-verify`.
- **PRs**: Self-review required. Verify `pnpm lint`, `pnpm check-types`, `pnpm test`, `pnpm format:check` pass before
  submitting — CI (`.github/actions/quality-checks`) runs those plus `lint:posts` and the blog build
  (`prebuild → next build → check-seo → check-bundle`).

## 7. Troubleshooting

- **Lockfile Issues**: If dependencies are weird, run `pnpm install --frozen-lockfile`.
- **Turbo Cache**: If builds are stale/broken, run `pnpm build --force` (or `pnpm clean:dist`).
- **Types**: If types are missing, check `pnpm-workspace.yaml` catalog versions.
- **Blog artifacts look stale**: `public/{sitemap.xml,rss.xml,search-index.json,…}`, `public/og`, `public/thumbs`,
  `public/posts` are regenerated by `build-content.ts` (`predev:web` / `prebuild`) — a stale `public/` can hide a no-op
  generator; verify with a clean clone when touching the pipeline.

**Agent Action Checklist**:

1. Read this file (and `CLAUDE.md` for blog work).
2. Locate relevant files using `ls` and `find` (or `glob` tool).
3. `pnpm install` if new deps are needed (rare).
4. Make changes.
5. **VERIFY**: Run specific tests (`pnpm test --filter=... -- <file>` / `pnpm --filter <pkg> test`).
6. Lint/Typecheck changed files (`pnpm lint`, `pnpm check-types`, `pnpm format:check`).
