# @blog/web — Frontend Lab 블로그 앱

`https://blog.sangwook.dev`를 굽는 **Next.js 16 정적 사이트(SSG)** 앱이다. 원고는
`apps/blog/posts/`(Markdown + `_series.yml`)에 있고, 그 원고를 읽고·검증하고·산출물을
만드는 **콘텐츠 프레임워크는 `packages/@blog/content`** 로 떼어져 있다. 이 앱은 그
프레임워크의 소비자이며, 화면·런타임(Supabase·검색·테마·댓글)·배포 산출물만 담당한다.

운영 규칙(발행 판정, frontmatter 계약, SEO 게이트, 디자인 금지선)은 루트
[`CLAUDE.md`](../../../CLAUDE.md)의 "Blog Architecture" 절이 단일 출처다. 이 문서는
**코드가 어떻게 놓여 있고 어떻게 흐르는지**만 다룬다.

---

## 1. 큰 그림

```
apps/blog/posts/**            ← Markdown 원고 + _series.yml (워크스페이스 아님)
        │  읽기(gray-matter) · 공개 판정 · 시리즈 · URL 계약 · SEO DTO
        ▼
packages/@blog/content         ← 소스 익스포트 패키지. 문 두 개: `@blog/content` · `@blog/content/seo`
        │                          + 빌드 스크립트(src/scripts/*, API가 아니라 실행 파일)
        ▼
apps/blog/web  (이 앱)
  ├─ content.values.mts   ← 이 사이트의 값 (순수 리터럴). 패키지에는 이 축들의 기본값이
  │                          없다 — 값의 소유자는 앱이다. 정체성(SITE·AUTHOR·TIMEZONE)에
  │                          더해 sitemap 우선순위/정적 페이지·llms 산문까지.
  │                          (og 팔레트는 여기 없다 — 디자인 토큰에서 파생되므로
  │                           content.config.mts가 darkColor()로 뽑는다)
  │                          개별 상수(SITE_URL·SITE_NAME…)가 1차이고 그룹 객체(SITE·
  │                          AUTHOR·SITEMAP_PRIORITY…)는 설정 배선 전용이다: 화면이 그룹을
  │                          import하면 안 쓰는 값까지 번들에 실린다.
  │                          값↔원고 정합성은 src/app/contentValues.test.ts가 잠근다
  ├─ content.config.mts   ← 경로 앵커 + 배선 (root: import.meta.url — 이 파일의 위치가 앵커.
  │                          위 값 모듈을 defineContent에 넘긴다.
  │                          CLI는 cwd walk-up으로 발견, 앱은 src/content.ts가 정적 import)
  ├─ src/content.ts       ← createContent/createPostSeo 인스턴스 조립 — fs 로더·SEO 빌더의 유일한 출처(서버 전용)
  ├─ prebuild  = build-content.ts --strict   (validate-posts 게이트 → 병렬 8개: sync·sitemap·rss·
  │                                            og-images·thumbnails·search-index·llms-full·llms)
  ├─ next build (output: 'export')            → out/
  ├─ check-seo                                (out/ HTML의 SEO 계약 검사)
  └─ check-bundle                             (out/ JS 청크의 admin 코드 누수 검사 — 빌드의 마지막 게이트)
        │
        ▼
GitHub Pages (deploy-blog.yml)   +   런타임: Supabase(조회수·Admin·Analytics) · Giscus · GA4/GTM
```

- **정적 산출물**: `output: 'export'`(개발 모드에서는 해제), `trailingSlash: true` + `skipTrailingSlashRedirect: true` 짝, `images.unoptimized: true`. 내부 href는 스스로 후행 슬래시를 단다(`postPath`·`archivePath`).
- **동적 기능**만 Supabase — 조회수 RPC, 조회 이력, Admin Google OAuth, Analytics RPC(Edge Function 경유).
- **검증은 세 게이트** — `validate-posts`(frontmatter 원문, prebuild에서 `--strict`)·`check-seo`(최종 HTML)·`check-bundle`(JS 청크의 admin 코드 누수). 셋 다 `pnpm build` 안에 있어 로컬·PR CI·배포가 같은 검사를 지난다.

---

## 2. 디렉터리 구조와 레이어

```
apps/blog/web/
├─ src/                 app 레이어 (Next App Router · 컴포넌트 · 훅 · 스타일)
│  ├─ app/              라우트 — /, /posts/, /posts/[...slug]/, /series/, /about/, /privacy/, /admin/**
│  ├─ components/       blog(목록·아카이브) · post(상세·markdown 커스텀 태그) · diagram · home · admin · mobile · search · preview · shared · Rail · Layout …
│  ├─ hooks/            useTheme · useViewCount · useRecentViews · useAdminViews · useAnalyticsOverview · usePostDetailStats · useAdminLogout
│  └─ styles/globals.css
├─ domain/analytics/    analytics 레이어 — 순수 계산(service) + 저장소(repository·adminRepository) + 배럴 2개(index · admin)
├─ domain/auth/         auth 레이어 — 세션 저장소(repository, DI 팩토리) + 관리자 이메일 판정(adminAccess) + 배럴 1개
├─ lib/platform/        platform 레이어 — Supabase 어댑터(client · publicClient · adminApi · database.types)
├─ shared/              최하단 레이어 — 앱 소유 라우트 경로의 단일 출처(routes) + 페이지 전환 네임스페이스(transitions). 모든 레이어가 import 가능
├─ supabase/            로컬 Supabase 프로젝트 — config.toml · migrations/ · functions/admin-analytics · seed.sql
├─ public/              robots.txt · favicon · og-default.jpg … (+ 빌드가 생성하는 sitemap/rss/search-index/llms/og/thumbs/posts는 .gitignore)
├─ design/              DIAGRAM_AUTHORING.md(현행) · blog-redesign-handoff.md · github-style-reference.md(둘 다 이력)
├─ next.config.ts · panda.config.ts · postcss.config.cjs · vitest.config.mts · vitest.setup.ts
├─ tsconfig.json(프로덕션) · tsconfig.test.json(테스트) · eslint.config.mjs · turbo.json · vercel.json · env.d.ts
└─ .env.production      (커밋된 유일한 env — Supabase URL/anon key, Giscus)
```

`@/` 별칭은 **앱 루트**를 가리킨다(`tsconfig.json` `paths: {"@/*": ["./*"]}`) — `@/src/components/...`, `@/domain/analytics`, `@/domain/auth`. vitest alias도 같다.

### 레이어 경계 — 컨벤션이 아니라 lint

`eslint.config.mjs`의 `eslint-plugin-boundaries`가 **폴더 단위 element**로 의존 방향을 강제한다(`shared`·`domain`·`lib`·`src` 네 폴더에만 건다). 기준 경로는 워크스페이스 루트 — `@blog/content`가 pnpm 심링크 realpath로 해석되기 때문.

| element (아래 → 위) | 폴더                     | 가져올 수 있는 것                                                                                                                                                                            |
| :------------------ | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content-pkg`       | `packages/@blog/content` | (이 앱에서는 외부 패키지처럼 보인다 — 내부 경계는 패키지 자신의 eslint 설정이 강제)                                                                                                          |
| `shared`            | `shared`                 | `content-pkg`만(라우트 계약 `encodePostSlug`·`POSTS_PATH`) — 앱 내부 어디에도 기대지 않는 최하단. 라우트 경로·전환 네임스페이스의 단일 출처                                                  |
| `platform`          | `lib/platform`           | `shared`, 외부 `@supabase/supabase-js`·`@supabase/postgrest-js`                                                                                                                              |
| `analytics`         | `domain/analytics`       | `shared`, `platform`, `content-pkg`(날짜 유틸 등)                                                                                                                                            |
| `auth`              | `domain/auth`            | `shared`, `platform` — supabase 타입은 이 레이어에서 구조적 부분형으로 끝낸다                                                                                                                |
| `app`               | `src`                    | `shared`, `analytics`, `auth`, `content-pkg`, 임의 외부 패키지. **platform·node 코어 금지** — Supabase 접근은 도메인 경유, fs는 `src/content.ts`가 조립한 `@blog/content` 로더 인스턴스의 일 |

추가 규칙: 프로덕션 코드는 `*.test.*`를 import 못 함 / `src`는 `domain/*/…Repository`를 직접 찌르지 말고 배럴(`@/domain/analytics`, `@/domain/analytics/admin`)로 / `src`에서 `client.from()`·`.rpc()` 직접 호출 금지(`no-restricted-syntax`) / `domain`은 `src`를, `lib`은 `domain`·`src`를, `shared`는 `lib`·`domain`·`src`를 import 못 함. `shared`는 모든 레이어가 여는 유일한 폴더라 모듈 **모양**까지 잠근다 — 재수출(`export … from`)·모듈 최상위 문(부수효과, `'use client'` 포함)·`.tsx` 전면 금지. 입장 기준은 [`shared/README.md`](./shared/README.md).

`lint`는 `--max-warnings=0`이고, `noInlineConfig: true` + `@eslint-community/eslint-comments/no-use`로 **인라인 `eslint-disable` 주석이 전면 금지**다. 예외는 주석이 아니라 `eslint.config.mjs`에 `files` 스코프로 적는다.

### tsconfig 분할

`tsconfig.json`(프로덕션)은 `strict`에 더해 `noUncheckedIndexedAccess`·`noPropertyAccessFromIndexSignature`·`exactOptionalPropertyTypes`·`verbatimModuleSyntax`·`erasableSyntaxOnly` 등을 켠다. `tsconfig.test.json`은 이를 extends하되 include를 테스트 파일로 뒤집고 **앞의 세 플래그만 끈다**. `check-types`는 두 프로그램을 다 돈다. ESLint의 타입 정보 룰도 같은 분할을 따른다(프로덕션은 `projectService`, 테스트는 `project: tsconfig.test.json`).

---

## 3. 런타임 데이터 흐름

- **글 상세** — `src/app/posts/[...slug]/page.tsx`(서버)가 `@/src/content`(콘텐츠 인스턴스)의 `getPostBySlug`·`getAdjacentPosts`·`getSeriesAdjacentPosts`와 `@blog/content`의 순수 유틸(`resolveThumbnailUrl`·`isPostVisible`)을 부르고, `generateMetadata`는 같은 인스턴스 모듈의 `buildPostSeo` DTO를 `nextMetadata.ts`로 1:1 변환한다. **본문 컴파일은 빌드 타임의 일이다** — 같은 폴더의 `PostBody.tsx`(서버 컴포넌트)가 `react-markdown`(`remark-gfm` → `rehypeCodeMeta` → `rehype-raw` → `rehype-slug`, **순서 고정** — `rehype-raw`가 hast `data.meta`를 버리므로 코드 펜스 메타를 먼저 `data-*`로 옮긴다)으로 렌더하므로, 마크다운 파이프라인과 구문 강조(react-syntax-highlighter)는 클라이언트 번들에 실리지 않는다. 상호작용은 잎으로 내려간 클라이언트 컴포넌트가 각자 진다 — `PostRuntime`(조회수·최근 본 글 부수효과)·`CopyButton`·`CodeTabsPanels`(탭 상태 — 자식 훑기는 서버 파서 `CodeTabs`가 한다)·`MermaidLazy`(ssr:false 동적 로드)·`MarkdownImage`(줌)·`TOC`. 커스텀 소문자 태그(`callout`·`code-tabs`·`file-tree`·`figure`·`dialogue`·`metrics`·`timeline`·`diagram*`)는 `src/components/post/markdown/`·`diagram/`. 본문 `h1`은 `markdownHeadings.tsx`가 `h2`로 강등하며 RSS 렌더러와 같은 `HEADING_TAG_MAP`을 공유한다.
- **조회수** — `useViewCount` → `@blog/content`의 `viewCookie`(6시간 쿨다운, RPC 전에 쿠키를 먼저 심어 두 탭 레이스 방지) → `domain/analytics/repository.incrementViewCount` → `lib/platform/publicClient`(PostgREST-only 경량 클라이언트)로 `increment_view_count` RPC.
- **Admin** — `AdminLayoutClient` → `AdminGuard`(세션 `useSuspenseQuery`, dev에서만 bypass) → React Query 훅 → `@/domain/analytics/admin` 배럴 → `adminRepository` → `lib/platform/adminApi` → Supabase Edge Function `admin-analytics`(호출자 JWT를 `ADMIN_EMAIL`과 대조 후 `service_role`로 RPC). 세션·로그인·로그아웃과 관리자 이메일 판정은 전부 `@/domain/auth` 배럴 경유 — 가드·로그인 페이지가 `client.auth`를 직접 만지지 않는다. 로그인 **경로** 계약(`ADMIN_LOGIN_PATH`·`isAdminLoginPath`…)은 `@/shared/routes`가 단일 출처다. 글 목록은 빌드가 만든 `/admin-posts-index.json`(`getAdminPostsIndex` 한 곳이 읽는다). `domain/analytics/index.ts`와 `admin.ts`를 **일부러 두 배럴**로 나눠 공개 페이지가 auth 세션 supabase-js를 끌고 오지 않게 한다.
- **검색** — `SearchDialog`가 열릴 때 `/search-index.json`(빌드 산출물)을 fetch + localStorage 최근 본 글.
- **테마** — `layout.tsx`의 pre-paint 인라인 스크립트(쿠키 → `prefers-color-scheme` → dark)가 `html[data-theme]`를 세팅, `useTheme`가 `useSyncExternalStore`로 구독, `setTheme`은 View Transitions로 전환.
- **페이지 전환** — `@ssgoi/react`(`PageTransition.tsx`): 썸네일 있는 글은 `/posts/{slug}` hero morph, 없으면 fade.
- **댓글** — Giscus. `NEXT_PUBLIC_GISCUS_*` 4개가 모두 있을 때만 렌더.

---

## 4. 스크립트

모두 `apps/blog/web`에서 실행(`new-post`·글 미리보기는 루트 `pnpm new-post`·`pnpm blog-write` 단축도 있다). 콘텐츠 스크립트는 `@blog/content`가 `bin`으로 내놓는 **`blog-content` 하나**로 실행한다 — 앱은 서브커맨드 이름만 안다(`blog-content build`).

| 스크립트                   | 하는 일                                                                                                                                                                                                                                                                  |
| :------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                 | `supabase start`(Docker) → `next dev`. `predev:web`이 먼저 `build-content.ts`(경고 수준)를 돌린다. Next만 띄우려면 `pnpm dev:web`                                                                                                                                        |
| `pnpm build`               | `prebuild`(`blog-content build --strict`) → `next build` → `check-seo` → `check-bundle`. **이 넷이 한 덩어리** — CI·배포도 이 스크립트 하나를 부른다                                                                                                                     |
| `pnpm lint`                | `eslint . --max-warnings=0` (인라인 `eslint-disable` 금지)                                                                                                                                                                                                               |
| `pnpm check-types`         | `tsc -p tsconfig.json` + `tsc -p tsconfig.test.json`                                                                                                                                                                                                                     |
| `pnpm test`                | `vitest run` — projects 둘(`node`: `shared/**`·`domain/**`·`lib/**`, `jsdom`: `src/**`)을 한 번에. `test:watch`, `test:coverage`(v8)                                                                                                                                     |
| `pnpm lint:posts`          | frontmatter·본문 검증(수동, 경고 수준). prebuild에서는 같은 규칙이 `--strict`로 승격                                                                                                                                                                                     |
| `pnpm check-seo`           | `out/` HTML 검사 — h1 1개, description 중복·길이, `<title>` 60자, canonical, og, img alt, `link-trailing-slash`, 산출물↔발행 글 정합성(7종)                                                                                                                              |
| `pnpm check-bundle`        | `out/` 번들 규칙 평가 — 규칙마다 마커가 forbiddenIn 스코프(페이지·도달 청크·산출물)에 없고 requiredIn 스코프에 있어야 한다(양성 대조 필수). 규칙 9개(admin 전용·글 전용 Mermaid/Giscus·서버 전용 값·빌드 타임 구문 강조)는 `content.values.mts`의 `BUNDLE_GUARDS`가 소유 |
| `pnpm new-post "제목"`     | 스캐폴딩. `--series` `--tags` `--scheduled` `--slug` `--status`                                                                                                                                                                                                          |
| `pnpm supabase-start/stop` | 로컬 Supabase 기동/정지                                                                                                                                                                                                                                                  |

위 스크립트들은 전부 `@blog/content`가 `bin`으로 내놓는 **`blog-content`** 한 진입점을 부른다(`blog-content build`·`validate`·`check-seo`·`check-bundle`·`new-post`) — 앱은 서브커맨드 이름만 알고, 패키지 내부 파일 배치는 모른다.

`blog-content build`는 **2단계** — 1단계 `validate-posts`(게이트), 2단계 `sync-posts`·`sitemap`·`rss`·`og-images`·`thumbnails`·`search-index`·`llms-full`·`llms` 8개 **병렬**. 경로 앵커는 앱 루트의 `content.config.mts`다 — CLI가 cwd에서 위로 올라가며 발견하고(전역 `--config`로 명시 가능), build는 자식 spawn에 그 절대 경로를 `--config`로 재전달하므로 cwd에 기대지 않는다.

---

## 5. 환경 변수

`env.d.ts`가 `NodeJS.ProcessEnv`에 선언한다(`noPropertyAccessFromIndexSignature` 아래서도 `process.env.X` 점 접근을 쓰기 위해 — Next는 멤버 표현식만 인라인한다).

| 변수                                                                  | 용도                                 | 어디서 오나                            |
| :-------------------------------------------------------------------- | :----------------------------------- | :------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY`          | Supabase 클라이언트                  | `.env.production` / 배포 시크릿        |
| `NEXT_PUBLIC_ADMIN_EMAIL`                                             | Admin 가드                           | 배포 시크릿                            |
| `NEXT_PUBLIC_GISCUS_REPO` · `_REPO_ID` · `_CATEGORY` · `_CATEGORY_ID` | 댓글                                 | `.env.production`                      |
| `NEXT_PUBLIC_PR_COUNT`                                                | About의 머지 PR 수(없으면 상수 폴백) | 배포 워크플로가 GitHub에서 가져와 주입 |

로컬 개발용 `.env.local`은 커밋하지 않는다(`.gitignore`의 `.env*`, 예외는 `.env.production`뿐).

---

## 6. 테스트

러너는 **Vitest 하나**고, `vitest.config.mts`의 `test.projects`가 환경만 둘로 나눈다.

- **`node` 프로젝트** (`shared/**`, `domain/**`, `lib/**`): 순수 로직 — analytics service, publicClient가 supabase-js와 바이트 동일한 요청을 만드는지, adminApi 언래핑. jsdom을 띄우지 않는다(이 앱의 jsdom 부팅은 파일당 1초 안팎이라 DOM이 필요 없는 테스트까지 태우면 그대로 낭비다).
- **`jsdom` 프로젝트** (`src/**/*.{test,spec}.{ts,tsx}`): 컴포넌트·훅·라우트 헬퍼. RTL·jest-dom 매처와 `vitest.setup.ts`가 여기에만 붙는다 — 그 셋업이 `next.config`를 읽어 `<Link>`가 실제 빌드와 같은 후행 슬래시 href를 내게 맞춘다.
- 콘텐츠 계약(실제 `apps/blog/posts` 대상 불변식, 산출물 정합성, URL 인코딩 일관성)은 **`packages/@blog/content`** 의 테스트가 잠근다 — `pnpm --filter @blog/content test`.
- `include` 글롭은 `tsconfig.test.json`·`eslint.config.mjs`의 테스트 블록과 **대칭**이다. 한쪽을 고치면 셋을 함께 고칠 것.

---

## 7. 배포 · CI

- **PR / main push**: `.github/workflows/ci.yml` → 공용 `.github/actions/quality-checks`(turbo lint·check-types·test → `lint:posts` → `format:check` → `pnpm build --filter=@blog/web`).
- **배포**: `.github/workflows/deploy-blog.yml` — `main` push(`apps/blog/**`·`packages/@blog/**`), 매일 KST 09:00 cron(예약 발행), 수동. quality-checks → 시크릿 주입 `--no-cache` 빌드 → `/posts/` 프리렌더 링크 개수 검증(CSR bail-out 회귀 가드) → GitHub Pages.
- **Vercel 프리뷰**: `vercel.json` — `main`·`renovate/**` 비활성, `apps/blog`·`packages/@blog` 변경 없으면 `ignoreCommand`로 스킵.
- **Supabase**: 스키마는 `supabase/migrations/`(조회수 테이블·이력·대시보드 RPC·KST 보정·권한 잠금 순), Admin RPC 프록시는 `supabase/functions/admin-analytics`.

---

## 8. 더 읽을 것

| 무엇                                                      | 어디                                                                                          |
| :-------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| 발행 판정 · frontmatter 계약 · SEO 게이트 · 디자인 금지선 | 루트 [`CLAUDE.md`](../../../CLAUDE.md) "Blog Architecture"                                    |
| 콘텐츠 프레임워크 내부(레이어·`defineContent`·스크립트)   | [`packages/@blog/content/README.md`](../../../packages/@blog/content/README.md)               |
| 색·글꼴·레일·코드 블록 테마                               | `.claude/skills/blog-design-system/SKILL.md`, `packages/@design-system/ui/src/blog-preset.ts` |
| 본문 커스텀 태그 문법                                     | `.claude/skills/blog-components/SKILL.md`                                                     |
| 다이어그램 저작 · `hero:` 등록법                          | [`design/DIAGRAM_AUTHORING.md`](design/DIAGRAM_AUTHORING.md)                                  |
