# Repository Guidelines

## Project Structure & Module Organization
- `apps/next.js/`: App Router lab; routes in `src/app`, shared UI in `src/components`, Jest specs in `test/` and `src/app/__tests__`.
- `apps/react/`: Vite SPA; screens in `src/pages`, services in `src/service`, Vitest specs in `src/test` or adjacent `*.test.tsx`.
- `apps/typescript/`: Type-only experiments; use the `error/` module and `jest.config.ts` as the template.
- `apps/blog/web/`: MDX blog; posts in `apps/blog/posts/`, Supabase SQL in `supabase/`.
- `apps/ga-proxy/`: Next.js proxy; handlers in `src/app` with shared utilities in `lib/`.
- Shared packages: UI in `packages/@design-system/ui`, Panda CSS tokens in `packages/@design-system/ui-lib`, configs/utilities in `packages/@package/*`.

## Architecture & Shared Practices
- Turborepo + pnpm workspaces coordinate builds; edit `turbo.json` and `pnpm-workspace.yaml` together.
- Use `workspace:` protocol for internal deps and catalog aliases (`catalog:react19`, `catalog:typescript5`, `catalog:` for Panda CSS).
- Component folders follow the three-file pattern (`Component.tsx`, `Component.test.tsx`, `index.ts`).
- Panda CSS tokens are generated; rerun Panda instead of editing `packages/@design-system/ui-lib`.

## Build, Test, and Development Commands
- `pnpm install` (Node 20+, pnpm 10.10.0) to bootstrap.
- `pnpm dev` runs everything; use `pnpm next`, `pnpm react`, `pnpm typescript`, or `pnpm blog-web` for focused dev.
- `pnpm build`, `pnpm lint`, and `pnpm check-types` run repo-wide gates; `pnpm blog-build` exports the blog.
- `pnpm test` runs all suites; add `--filter=next.js`, `--filter=react`, etc., when iterating.

## Coding Style & Naming Conventions
- Prettier (2 spaces) plus per-app ESLint configs set formatting—run `pnpm lint` regularly.
- Components use PascalCase (`ArticleCard.tsx`), utilities camelCase, route folders and MDX slugs kebab-case.
- Use `data-testid` for critical selectors and promote reusable code into `packages/`.

## Testing Guidelines
- Next.js → Jest + React Testing Library (`apps/next.js/test`, `src/app/__tests__`).
- React SPA → Vitest + MSW (`src/test`).
- TypeScript experiments → Jest + Babel (`apps/typescript`).
- Save specs as `*.test.ts` or `*.test.tsx`, extend existing MSW handlers, and update snapshots deliberately.

## Commit & Pull Request Guidelines
- Follow `type(scope): summary` (e.g., `docs(blog): 내용 보강`); Korean summaries are fine if clear.
- Keep commits focused and note validation commands (`pnpm test --filter=next.js`) when behavior changes.
- PRs must include summary, impacted areas, validation steps, linked issue/doc, and screenshots or logs for UI work.
- Ensure Turbo, lint, and type checks succeed locally before requesting review.

## Security & Configuration Tips
- Store Supabase keys, proxy tokens, and other secrets in local `.env.local`.
- Respect `pnpm.onlyBuiltDependencies`; avoid global installs or editing `node_modules`.
- Flag cascading impacts when tweaking `turbo.json`, workspace filters, or catalog entries.
