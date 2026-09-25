# AGENTS.md

Context, commands, and rules for AI agents in this repository (`fe-lab`). This is the **only** instruction file —
Claude Code, Codex and the CI reviewer all read it. Edit this file, never the root CLAUDE.md: that one is a
**symlink to this file**, and the link is load-bearing.

- Claude Code reads AGENTS.md only through its `agents-md` built-in plugin, which a server-side feature flag switches
  on (off by default in the binary). Where the flag doesn't arrive — nonessential traffic disabled, a rollout change,
  possibly CI — an AGENTS.md-only repo loads **no instructions at all** (verified on 2.1.280: the answer came back
  empty). CLAUDE.md is loaded unconditionally, so the symlink keeps this file loaded everywhere.
- Content loads **once**: with a CLAUDE.md present, the plugin doesn't add AGENTS.md on top.
- The blog app keeps the same pair: `apps/blog/web/AGENTS.md` is the Next.js block that `next dev` maintains, and
  `apps/blog/web/CLAUDE.md` (`@AGENTS.md`) is how Claude Code reads it. Working there loads both the root and the
  nested file (verified with and without the flag).
- Don't delete the symlink. Without a CLAUDE.md, loading falls back to the flag.

This file keeps only what the code cannot tell you: contracts, gotchas, rationale, and prohibitions. Code layout
and runtime data flow live in `apps/blog/web/README.md` and `packages/@blog/content/README.md`. Writing a post
(structure, tone, forbidden vocabulary) is the `tech-blog-writer` skill — the single source; do not restate it
here or anywhere else (this repo once carried four diverging copies of that prompt).

## 1. Environment

- **Versions**: Node / pnpm come from root `engines` · `.tool-versions` · `packageManager`; TypeScript from the
  `pnpm-workspace.yaml` catalog. Never copy version numbers into docs — Renovate bumps them.
- **TypeScript 6 semantics, not TS 5.x.** Before explaining or relying on compiler behavior (default `types`,
  `rootDir`, `peerDependencies` promotion vs restore, …) verify it against the actual tsconfig/source. Be precise
  about "add" vs "move" vs "promote" when describing dependency/catalog changes.
- **Catalog is the single source** for any dependency used by two or more packages: package.json says `catalog:`
  (default) or `catalog:lint` (the eslint toolchain — core and plugins move together, so single-consumer plugins
  live there too), never a number. Exception: `peerDependencies`, which declare a compatibility range.
- **Vitest everywhere.** Only the environment varies; `apps/blog/web` splits `test.projects` into `node`
  (`src/shared`·`src/domain`·`src/lib`) and `jsdom` (rest of `src`).

## 2. Commands

- There are **no per-app aliases**. Target a workspace with turbo's filter, by **package name, not folder**:
  `@blog/web`, `@blog/content`, `next.js`, `react`, `typescript`, `socket-server`.
  - `pnpm dev --filter=@blog/web` starts local Supabase (Docker). For writing only: `pnpm blog-write` (content
    build + next dev, no Docker). `pnpm new-post "제목"` scaffolds a post (`--series`, `--tags`, `--scheduled`,
    `--slug`, `--status`).
  - `pnpm test --filter=<pkg> -- <args>` — the args are part of the turbo cache key, and `test` depends on
    `^build`, so the first run may build dependencies. For one file, skip turbo:
    `pnpm --filter @blog/web exec vitest run src/components/Rail.test.tsx` (add `--project=node` for one project).
- `pnpm format:check` is a **CI gate**, next to `lint` / `check-types` / `test`.
- Blog content commands run inside `apps/blog/web`: `pnpm lint:posts` (source validation, warnings),
  `pnpm check-seo` / `pnpm check-bundle` (already the last two steps of `pnpm build` — see §8).
- **Lint tiers are intentional.** The blog stack (`apps/blog/web`, `packages/@blog/content`) runs
  `--max-warnings=0` with `noInlineConfig` + `@eslint-community/eslint-comments/no-use` — inline `eslint-disable`
  is banned; scope exceptions by `files` in `eslint.config.mts`. `apps/react`·`apps/next.js` run plain `eslint .`.
  `apps/typescript`·`apps/socket-server` are **not linted at all** (no script, no config) — don't look for
  `pnpm lint` there, and don't impose blog rules on experiment apps (the blog is the asset; experiments are a lab).

## 3. Coding Standards

- `strict: true` everywhere. The blog stack's production tsconfig adds `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, `exactOptionalPropertyTypes`; `tsconfig.test.json` turns exactly those
  three off. `check-types` and the ESLint type rules follow the same split. Test includes are symmetric across
  tsconfig, vitest globs and the ESLint test block — change all three together.
- Prefer `interface` over `type` for objects (lint-enforced in the blog stack), named exports over default
  (except Next.js pages/layouts), `import type`. No `any`.
- **`@/` differs per app**: `apps/next.js`·`apps/react` map it to `src/*`; `apps/blog/web` maps it to the
  **app root** (`@/src/...`).
- **Never edit generated code**: `styled-system/`, `packages/@design-system/ui-lib`.
- Panda runs `strictTokens: true` — off-token values are escaped on purpose as `'[12px]'`.

## 4. Testing

- Select by what the user sees: `getByRole` → `getByLabelText` → `getByPlaceholderText` → `getByText` →
  `getByTestId` (last resort). The blog stack has zero `data-testid`.
- **Injection before mocking.** `@blog/content` takes its config through `defineTestContent`, its paths through a
  tmpdir, and its clock through the `now` argument of `isPostVisible(data, timezone, now)`. Fixture values are
  deliberately different from the real site values (`src/shared/testValues.ts`), so a consumer that ignores the
  injection and reads a constant directly fails — a failure a mock cannot catch. `vi.mock` only where no seam can
  be injected; MSW exists in `apps/react` only.
- **Tests that read this file**: `frontmatterSchema.test.ts` diffs the frontmatter table in §8 character-for-
  character against the descriptor table (edit both together), and `docPaths.test.ts` checks that every
  backticked path in the docs exists. `contract.test.ts` (post and scripts) read the real `apps/blog/posts/` and
  are the safety net for content/pipeline refactors.

## 5. Git & PR Workflow

- **Commits**: Conventional Commits, Korean subject, declarative (`~한다`) — the subject states the rule the commit
  establishes, not the files it touched. Two non-standard types on purpose: `strict(scope)` for a TS/lint
  tightening step, `blog(scope)` for work whose point is the writing (the post plus whatever tooling it needed).
  Don't invent others. Blog scopes split by package: `blog` (posts/authoring), `blog-web`, `blog-content`.
- **No AI attribution trailers** (`Co-Authored-By: Claude`, `Claude-Session:`, …). Nothing enforces this, and
  squash merge is how it leaks in — strip it from every sub-commit before the PR is squashed.
- **Hooks (lefthook)**: `pre-commit` runs prettier on staged files (`apps/blog/posts/**` excluded); `pre-push` runs
  lint / check-types / test. There is no `commit-msg` hook — message rules are held by hand.
- **Before committing PR fixes**: (1) adversarial self-review of your own diff — hunt regressions, edge cases,
  broken snapshots/fixtures, not a sanity pass; (2) run the full relevant suite + lint + typecheck and verify
  **every** sibling/fixture file you touched (past "fixes" broke tests — ENOENT, snapshot drift, suite-end vs
  suite-start timestamps — that only adversarial review caught); (3) clean, separated commits.
- **PR skills**: `/pr-fix` (breadth — every review comment) and `/repair-pr` (one mechanical pass to green) don't
  overlap; if both apply, `/pr-fix` first. `/add-issue` and `/write-prd` run **only when the user names them** —
  both create real issues.
- **Review verdict = 👍 on the PR.** `claude-code-review.yml` removes the old 👍 when a run starts and derives the new
  one from the comment that run actually posted (PASS only with no critical/high finding) — fail-closed. Gotchas:
  its prompt has a **21,000-byte limit** — over it, GitHub rejects the workflow silently and it vanishes from the PR
  checks (`workflowPromptSize.test.ts` holds a 20,500B budget); a PR that edits that workflow **skips its own
  review**. Missing 👍 ≠ findings — the `/list-good-prs` skill has the table for telling the cases apart.
- Large outputs (logs, comment lists, diffs): write to a file, report the key findings.

## 6. Troubleshooting

- **Stale blog artifacts**: `public/{sitemap.xml,rss.xml,search-index.json,…}`, `public/og`, `public/thumbs`,
  `public/posts` are regenerated by `blog-content build` (`predev:web` / `prebuild`). A stale `public/` can hide a
  no-op generator — verify with a clean clone when touching the pipeline.

## 7. Blog — hosting and runtime

Static export (`output: 'export'`) Next.js at `https://blog.sangwook.dev`, served by a Cloudflare static-assets
Worker (`apps/blog/web/wrangler.jsonc`), Supabase for the dynamic bits.

- **apex(`sangwook.dev`·`www`) → blog 리다이렉트는 이 저장소에 없다.** Cloudflare Redirect Rules(zone
  `sangwook.dev`, `http_request_dynamic_redirect` 단계, 규칙 2개)가 대시보드에서 처리한다 — 테스트가 없고, 과거
  `sitemap.xml`을 6개월간 404로 만든 자리다. 이상하면 코드보다 규칙을 먼저 볼 것:
  `GET /zones/{zone_id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`. 규칙은 path가 `/`나 **알려진
  확장자 31종**으로 끝나면 그대로, 나머지는 후행 슬래시를 붙여 308(쿼리 보존). "마지막 세그먼트에 점이 있으면
  파일"이라는 정규식이 아니라 allowlist인 이유는 `vue-3.0`·`next-15.2` 같은 버전 슬러그를 파일로 오분류해 404를
  내기 때문이다. 대가로 **목록에 없는 확장자는 조용히 404**다(2026-09-05 `site.webmanifest`) — 새 종류의 파일을
  내보내면 목록에 추가할 것. 회귀는 `site-smoke-collect.py`의 apex probe가 잡는다.
- **후행 슬래시는 셋이 한 짝이다**: `trailingSlash: true` + `wrangler.jsonc`의 `html_handling: force-trailing-slash`
  (기본값은 양쪽에 200을 줘 정규 URL이 갈라진다) + `skipTrailingSlashRedirect: true`(없으면 next/link가 `.`이 든
  slug의 슬래시를 도로 벗겨 리다이렉트를 한 번 더 탄다 — 지금 그 코드는 307). 그래서 내부 href는 전부 스스로
  후행 슬래시를 단다(`postPath`·`archivePath`). 산출물은 `check-seo`의 `link-trailing-slash`가 지킨다.
- `workers_dev: false`로 `*.workers.dev` 사본을 닫았고, PR 프리뷰(`preview-blog.yml`, `wrangler versions upload`)는
  `preview_urls: true`가 있어야 URL이 나온다 — 둘은 한 짝이고, 프리뷰는 `_headers`의 `X-Robots-Tag: noindex`로
  색인에서 뺀다. `_headers`는 해시가 박힌 `/_next/static/*`에만 `immutable`을 걸고 **HTML은 일부러 캐시하지
  않는다**(새 글 반영이 늦어진다).
- **`NEXT_PUBLIC_*`은 전부 커밋된 `.env.production`에 있다** — 빌드 타임에 클라이언트 번들로 인라인되니 애초에
  시크릿이 아니다. 실제 admin 강제는 Edge Function `admin-analytics`가 호출자 JWT를 진짜 시크릿 `ADMIN_EMAIL`과
  대조하며 한다. 워크플로가 주입하는 건 `NEXT_PUBLIC_PR_COUNT` 하나뿐.
- `deploy-blog.yml`의 `environment: github-pages`는 **이름만 잔재**다 — 하는 일은 배포 브랜치 게이트(`main`만)
  하나, 시크릿은 0개. 개명은 새 환경을 만들어야 한다. `preview-blog.yml`은 `environment:`를 쓰지 않는다.
  두 워크플로 모두 **빌드와 업로드가 잡이 나뉜다** — 의존성 코드를 실행하는 빌드 잡은 시크릿 없이 `out/`만
  넘기고, `CLOUDFLARE_API_TOKEN`을 쥔 잡은 `--ignore-scripts`로 깐 wrangler만 돌린다. 토큰 잡에 빌드·테스트나
  스크립트가 도는 install을 다시 넣지 말 것(프리뷰는 머지 전 Renovate PR에서도 돈다).
  배포는 `main` push(블로그의 실제 입력 — `apps/blog/**`·`packages/@blog/**`·`packages/@design-system/**`·catalog·
  lockfile·툴체인·배포 워크플로 자신), **매일 cron `13 0 * * *`(KST 09:13)**(예약 글 공개), 수동
  실행. 정각을 피한 건 `0 0` 슬롯이 붐벼 실제로 KST 11:36~12:00에 돌았기 때문이다. GitHub cron은 정시를
  보장하지 않고 하루 한 번이라, `scheduledDate`에 적은 시각은 "그 뒤 첫 배포"(push 배포나 다음 날 cron)에서
  나간다. 배포 결과물 스모크(`claude-site-smoke.yml`)는 이 cron 배포가 끝나면 `workflow_run`으로 이어 돈다.
- 스키마는 `supabase-migrations.yml`로만 적용한다(대시보드 SQL 에디터 금지). 배포와 분리한 이유는 배포가 매일
  cron으로 돌아 스키마 변경 없는 날에도 프로덕션 DB에 붙고, 발행과 스키마가 한 실패 지점에 묶이기 때문이다.
  커밋된 Supabase MCP(`.mcp.json`)가 `read_only=true`·`project_ref`로 묶여 있는 것도 같은 규칙이다 — 에이전트가
  `execute_sql`·`apply_migration`으로 프로덕션을 "잠깐" 고치면 원장이 다시 어긋난다. 쓰기 기능을 되살리지 말 것.
- **Supabase 클라이언트는 둘이다**: 공개 페이지는 `src/lib/platform/publicClient.ts`(`@supabase/postgrest-js`만 —
  supabase-js 전체는 45KB gzip이고 그중 18.5KB가 죽은 코드였다), admin은 `src/lib/platform/client.ts`.
  `src/domain/analytics` 배럴이 `index`·`admin` 둘로 나뉜 이유다. Analytics RPC는 `anon`에 잠겨 있다.
- **분석 태그는 코드에 둘이다.** `apps/blog/web/src/app/layout.tsx`가 프로덕션에서 GA4(`GoogleAnalytics`)와
  GTM(`GoogleTagManager`)을 **둘 다 직접** 로드한다. GTM 컨테이너는 저장소 밖(웹 콘솔)이라 내용을 여기서 확인할 수
  없다 — 컨테이너 안에 GA4 태그가 또 있으면 페이지뷰가 두 번 집계되니 GA는 한쪽에만 둘 것. 그 컨테이너가
  **Microsoft Clarity**를 로드해 서드파티 쿠키 8개를 심는다(이슈 #165 — Best Practices 77점의 원인). 태그를 바꾸면
  이 문단과 `/privacy`를 함께 갱신할 것. 감점을 없애려면 고지가 아니라 GTM 콘솔에서 Clarity를 내려야 한다.

## 8. Blog — layers and content contract

**레이어는 lint가 강제한다**(`eslint-plugin-boundaries`, 폴더 단위 element — `pnpm lint`에서 잡힌다). 방향은
원고(`apps/blog/posts`) → `packages/@blog/content` → `apps/blog/web`. 코드만 봐선 안 보이는 규칙:

- `@blog/content` 밖으로 여는 문은 `@blog/content`·`@blog/content/seo` 둘과 bin **`blog-content`** 하나뿐이다.
  satori·sharp는 `scripts/render`에만. React는 의존하지 않는다(satori 입력 모양은 `OgNode`가 직접 선언). 상대 import가 전부 `.ts` 확장자를 달고 `erasableSyntaxOnly`라,
  shebang `node`의 type stripping만으로 로더 없이 돈다(앱 tsconfig에도 `allowImportingTsExtensions`가 필요).
- 앱의 **app 레이어는 platform을 import할 수 없다** — Supabase 접근은 전부 `src/domain/*` 배럴 경유. **node 코어도
  못 만진다** — fs는 `@blog/content` 로더의 일(클라이언트 번들 누수 예방).
- 라우트 경로 리터럴을 직접 적지 말 것 — 앱 소유 경로는 `@/src/shared/routes`, 글·아카이브·RSS는 패키지의
  `postPath`·`archivePath`·`RSS_PATH`가 단일 출처다(값 모듈의 사본 둘만 예외 — `contentValues.test.ts`가 잠근다).
- **경로 앵커는 `content.config.mts`**(`defineContent({ root: import.meta.url })`) — CLI가 cwd에서 위로 올라가며
  찾고 폴백은 없다(`--config <경로>`는 서브커맨드 이름 **앞**에). 서브커맨드 이름과 모듈을 잇는 곳은
  `src/scripts/cli/program.ts` 하나뿐이다.
- **사이트 값의 소유자는 앱의 `content.values.mts`**(순수 리터럴)이고 패키지에는 기본값이 없다(`ContentValues`
  계약이 필수로 강제). 예외인 og 팔레트·폰트는 `content.config.mts`가 뽑는다 — 폰트를 `createRequire().resolve`가
  아닌 `join()`으로 가리키는 이유는 Turbopack이 resolve를 정적 분석해 폰트 전부를 끌다 빌드가 깨지기 때문.
  **화면·클라이언트는 개별 상수(`SITE_URL`…)만 import한다** — 그룹 객체(`SITE`)나 설정 객체를 끌면 번들러가
  필드를 못 털어내 og 팔레트·llms 산문까지 번들에 실린다(홈 히어로 소개문이 실제로 샜다). 같은 이유로
  `resolveThumbnailSrc`는 `ogDefaultImage` 스칼라를 받는다.
- 로더·SEO 빌더는 `apps/blog/web/src/content.ts`의 인스턴스에서 가져온다(zero-arg 전역 로더 없음).

**Frontmatter 전체 목록** — 여기 없는 키는 `lint:posts`가 `unknown-frontmatter-key`로 경고한다.
`packages/@blog/content/src/post/frontmatterSchema.ts`의 서술자 테이블이 단일 출처이고, 이 표는
`frontmatterSchema.test.ts`가 글자 단위로 대조한다 — 표를 고치면 테이블의 `doc`도 함께 고칠 것.

| 키              | 필수 | 설명                                                                                                                                                                                                        |
| :-------------- | :--: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`        |  ✅  | `published` \| `draft` \| `scheduled`. **이 키가 없으면 포스트가 아니라 메타 노트로 간주되어 빌드에서 통째로 제외됩니다.**                                                                                  |
| `title`         |  ✅  | 없으면 파일명으로 폴백하지만 `lint:posts`가 에러                                                                                                                                                            |
| `seoTitle`      |      | **`<title>` 전용**의 짧은 제목. 화면 제목·OG 카드·JSON-LD headline은 계속 `title`을 쓴다. `{seoTitle ?? title} \| {site.name}`이 seo.titleMaxLength(기본 60자)를 넘으면 `lint:posts`가 `long-title` 경고    |
| `date`          |  ✅  | `'YYYY-MM-DD'`. 목록 정렬·아카이브·sitemap·RSS가 모두 사용하고, `scheduled`일 때는 공개 시각이기도 함. 없으면 `missing-date` 에러                                                                           |
| `slug`          |      | URL. 없으면 파일 경로에서 유도                                                                                                                                                                              |
| `excerpt`       |      | meta description. **사실상 필수** — 없으면 본문 앞 160자 자동 발췌가 나가는데, 도입부가 비슷한 글끼리 description이 글자 단위로 겹친다(`missing-excerpt` 경고). 권장 120~160자(`excerpt-length` 경고)       |
| `thumbnail`     |      | 없으면 빌드 시 OG 카드(`/og/{slug}.png`) 자동 생성                                                                                                                                                          |
| `hero`          |      | 히어로 슬롯에 꽂을 **등록된 다이어그램 이름**(현재 `deploy-pipeline`). 있으면 썸네일 대신 이 SVG가 그려진다. 렌더는 fail-soft(미등록 → 썸네일 폴백)지만 `lint:posts`가 `unknown-hero-diagram` 에러로 막는다 |
| `tags`          |      | 문자열 배열. 문자열 아닌 원소가 섞이면 태그 전체가 무시됨                                                                                                                                                   |
| `updatedAt`     |      | Schema.org `dateModified`, sitemap `lastmod`에 사용                                                                                                                                                         |
| `scheduledDate` |      | **시각까지 지정할 때만.** 날짜만이면 `date`로 충분. 이걸 써도 `date`는 여전히 필수                                                                                                                          |

`series`는 frontmatter가 아니라 **폴더 경로**로 결정되고, 그 폴더에 **`_series.yml`이 있어야** 시리즈다
(`src/post/series.ts`의 `isSeriesFolder`, 편수는 보지 않는다). 예전엔 2편 이상이면 선언 없이 시리즈가 돼서,
글을 모아 두기만 해도 배지·시리즈 목록·OG 카드가 따라붙었다. 빼려면 `_series.yml`을 지운다.

- **공개 축은 `status` 하나뿐**(`src/post/visibility.ts`). `scheduled`는 `scheduledDate ?? date`가 지나면 공개되고,
  예약일이 지난 글을 손으로 `published`로 바꿀 필요는 없다. status가 없거나 enum 밖이면 비공개이자 포스트가
  아니다(fail-closed). 옛 `published: boolean`은 제거됐고 남아 있으면 `legacy-published-field` 에러.
- dev 서버는 draft·scheduled 글을 실제 라우트에 노출한다(PreviewBanner·HiddenPostBadge). 게이트는
  `src/post/service.ts`의 `getAllPosts` 안 `isDevelopment` 한 곳뿐이어야 한다(늘리면 판정 규칙이 두 벌이 된다).
  판정은 `=== 'development'` 정확 비교다 — prebuild 스크립트는 `NODE_ENV`가 undefined라 느슨한 비교는 draft를
  sitemap·RSS에 실어 보낸다.
- 커스텀 태그(`<callout>`·`<diagram>`·`<dialogue>`·`<metrics>`·`<timeline>`·`<file-tree>`·`<figure>`), 코드 펜스
  `title=`·`<code-tabs>`는 `blog-components` 스킬, 구조 그림과 `hero:`는 `blog-diagrams` 스킬.

> **`prebuild`는 `--strict`로 돈다.** `lint:posts`와 `predev:web`은 경고로 두는 SEO 규칙(`missing-excerpt`·
> `excerpt-length`·`long-title`·`missing-image-alt`·`truncated-excerpt`·`duplicate-description`)을 빌드 직전에는
> **에러**로 올린다(`rules.test.ts`가 이 6개를 잠근다). 범위는 `check-seo`와 정확히 같은
> `isPostVisible` — 아직 공개 전인 예약 글은 경고다. 로컬이 CI보다 엄격하면 그 글과 상관없는 배포까지 막힌다.

> **`lint:posts`와 `check-seo`는 보는 곳이 다르다** — 전자는 frontmatter 원문, 후자는 최종 HTML. h1 2개,
> 시리즈 글끼리 description 완전 중복, og 태그 누락 같은 2026-08 감사 결과는 전부 원문만으로는 안 보였다. 둘 중
> 하나만 돌리면 그 계열의 회귀가 조용히 지나간다.

> **`check-seo`·`check-bundle`은 `pnpm build`의 마지막 두 단계가 유일한 실행 지점이다**
> (`prebuild → next build → check-seo → check-bundle`). PR CI와 배포가 같은 `build`를 부르므로, 워크플로에 별도
> 스텝을 두면 도달하지 못하는 죽은 게이트가 된다. `check-bundle`의 규칙은 `content.values.mts`의
> `BUNDLE_GUARDS`가 소유하고, 규칙마다 양성 대조(requiredIn)가 필수다.

> **본문 h1은 렌더 시 h2로 강등된다**(`src/components/post/markdownHeadings.tsx`) — 페이지 h1은 `PostHeader`
> 하나여야 한다. 원문의 `# `은 `lint:posts`가 `body-h1` 경고로 알린다.

> **RSS는 요약만 싣는다**(제목·링크·날짜·`excerpt`). 본문 전문(`content:encoded`)은 일부러 뺐다 — 리더에서 읽히면
> 조회수·댓글이 보지 못하고, 사이트 전용 커스텀 태그를 피드용으로 따로 매핑해야 해서 새 태그마다 어긋났다
> (`<diagram>`이 리더에서 사라졌다). 되살리기 전에 `generate-rss.ts` 머리 주석을 볼 것.

## 9. Blog — design guardrails

시각 기준은 구현된 화면(홈과 글 상세를 dev 서버로 대조)이고, 수치와 근거는 `blog-design-system` 스킬이
단일 출처다. 금지선:

- 색은 전부 `packages/@design-system/ui/src/blog-preset.ts`에서 온다. **컴포넌트에서 hex를 쓰지 않는다** —
  다이어그램 SVG도 `currentColor`나 Panda `css()`로 토큰에 잇는다. CSS 변수를 못 읽는 satori/sharp는
  `themeColor('dark', 'paper.50')`으로 뽑는다. hex를 옮겨 적지 않는다.
- 레일·거터의 단일 출처는 `src/components/Rail.tsx`다. **페이지에서 `maxW`·`px`를 직접 쓰지 않는다.** 거터는
  언제나 레일 바깥이다.
- **그라데이션·글로우·box-shadow 장식 금지, 세리프 금지.** 플랫 유지.
- 히어로 슬롯(`hero:`)은 이름 레지스트리에 등록된 다이어그램만 받는다.
