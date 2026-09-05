# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Working Notes for Claude

Operational lessons from past sessions. Follow these to avoid repeated friction.

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

## Key Design Patterns

테스트는 **사용자가 보는 것으로** 요소를 고른다 — `getByRole` → `getByLabelText` →
`getByPlaceholderText` → `getByText` 순이고 `getByTestId`는 최후 수단이다(전체 순위는
`AGENTS.md` §5가 단일 출처). 블로그 스택에는 `data-testid`가 한 건도 없다.

외부 의존성은 **mock보다 주입으로 끊는 것이 먼저다.** `@blog/content`는 설정을
`defineTestContent`로, 경로를 tmpdir로, 시각을 `isPostVisible(data, timezone, now)`의 `now`
인자로 받는다. 픽스처 값은 실제 사이트 값과 **일부러 다르게** 둬서, 소비처가 주입을 무시하고
상수를 직접 읽으면 테스트가 깨진다(`src/shared/testValues.ts`) — mock으로는 못 잡는 실패다.
`vi.mock`은 그렇게 끊을 수 없는 자리에만 쓰고, MSW는 `apps/react`에만 있다.

### Blog Architecture

The blog (`apps/blog/web/`) is a **statically generated (SSG) Next.js application** with a
**Supabase BaaS backend**, deployed to **Cloudflare Workers**(정적 자산 Worker —
`apps/blog/web/wrangler.jsonc`). The domain is `https://blog.sangwook.dev`.
**apex(`sangwook.dev`·`www`) → blog 리다이렉트는 이 저장소에 없다.** Cloudflare
**Redirect Rules**(zone `sangwook.dev`, `http_request_dynamic_redirect` 단계, 규칙 2개)가
대시보드에서 처리한다 — 플랫폼이 하는 일을 코드로 다시 만들지 않는다는 판단이다.
대가는 **테스트가 없다는 것**이고, 하필 이 판정은 과거 `sitemap.xml`을 6개월간 404로
만든 자리다. 리다이렉트가 이상하면 코드에서 찾지 말고 규칙을 먼저 볼 것:
`GET /zones/{zone_id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`.
규칙은 ① path가 `/`나 알려진 확장자로 끝나면 그대로 넘기고 ② 나머지는 후행 슬래시를
붙여 넘긴다(둘 다 308, 쿼리 보존). 예전엔 전용 Worker가 하던 일이다.
콘텐츠 프레임워크(스키마·로더·공개 판정·URL 계약·빌드 스크립트·2층 검증)는
**`packages/@blog/content`** 로 떼어져 있고, 앱은 그 소비자다. 코드 배치와 런타임 데이터
흐름은 `apps/blog/web/README.md`가, 패키지 내부는 `packages/@blog/content/README.md`가 다룬다 —
이 절은 **운영 규칙과 계약**만 적는다.

#### 레이어 경계 (lint가 강제)

세 층(원고 디렉터리 → 패키지 → 앱)이 한 방향으로만 의존한다. `eslint-plugin-boundaries`가
**폴더 단위 element**로 강제하므로 경계 위반은 `pnpm lint`에서 잡힌다 — 컨벤션이 아니다.

```
apps/blog/posts (원고)  →  packages/@blog/content  →  apps/blog/web
                            shared → post → seo →      src/shared → src/lib/platform → src/domain/{analytics,auth}
                            scripts → scripts/render     → src 나머지(app 레이어: app·components·hooks)
                            → scripts/cli
```

- **`@blog/content` 내부**: `shared`(node 코어만) → `post`(+gray-matter) → `seo`(순수 계산) →
  `scripts`(빌드) → `scripts/render`(React·satori·sharp는 여기만) → `scripts/cli`(진입점,
  단계를 동적 import로 든다). 밖으로 여는 문은 `@blog/content`·`@blog/content/seo` 둘뿐.
  빌드 스크립트는 API가 아니라 실행 파일이라 package.json `bin`의 **`blog-content`** 하나로
  나가고, 앱은 서브커맨드 이름만 안다(`blog-content build`). shebang은 `node`다 — 상대 import가
  전부 `.ts` 확장자를 달고(`allowImportingTsExtensions`, 앱 tsconfig에도 켜져 있어야 한다)
  문법은 `erasableSyntaxOnly`라, node의 type stripping만으로 로더 없이 돈다
- **앱 내부**: 레이어 전부가 `src/` 안의 형제 폴더다. `src/shared`(최하단 — 앱 소유 라우트
  경로 `routes.ts`·페이지 전환 네임스페이스 `transitions.ts`의 단일 출처. 모든 레이어가 import
  가능하고, 자신은 `@blog/content`만 연다) →
  `src/lib/platform`(Supabase 어댑터, 외부 의존은 supabase-js·postgrest-js만) →
  `src/domain/analytics`(순수 계산 + 저장소, 배럴 `index`·`admin` 둘)·`src/domain/auth`(세션·관리자
  이메일 판정) → app 레이어(`src`의 나머지 — `app`·`components`·`hooks`·`styles`·`content.ts`.
  boundaries element는 첫 매치 우선이라 `src` 폴백으로 잡는다). app 레이어는 저장소를 직접
  찌르지 않고 배럴로 — **platform 자체를 import할 수 없다**(boundaries에서 app→platform 허용이
  없다. Supabase 접근은 전부 도메인 경유고, 예전 유일한 예외였던 auth 직접 호출은
  `src/domain/auth`가 흡수했다).
  **app 레이어는 node 코어를 못 만진다** — fs 접근은 전부 `@blog/content` 로더의 일(클라이언트
  번들 누수 예방). `@blog/content`는 앱에서 외부 패키지(`content-pkg`)로 보인다.
  라우트 경로 리터럴을 화면·설정에 직접 적지 말 것 — 앱 소유 경로(`/admin`·`/about`…)는
  `@/src/shared/routes`, 글·아카이브·RSS는 패키지(`postPath`·`archivePath`·`RSS_PATH`)가 단일
  출처다(값 모듈의 사본 둘만 예외 — `contentValues.test.ts`가 잠근다)
- **tsconfig 분할**: `tsconfig.json`(프로덕션, 엄격 플래그 전부) / `tsconfig.test.json`(테스트 —
  `noUncheckedIndexedAccess`·`noPropertyAccessFromIndexSignature`·`exactOptionalPropertyTypes` 세
  개만 끔). `check-types`와 ESLint 타입 룰이 같은 분할을 따른다
- **lint 임계값**: 블로그 앱·`@blog/content` 둘 다 `--max-warnings=0`. 앱에 남아 있던 jsx-a11y
  경고 5건은 설계로 풀고 룰을 에러로 되돌렸다(#289). 함께 `noInlineConfig: true` +
  `@eslint-community/eslint-comments/no-use`가 켜져 **인라인 `eslint-disable` 주석이 전면 금지**다 —
  예외가 필요하면 주석이 아니라 `eslint.config.mts`에 `files` 스코프로 적을 것.
  **이 임계값은 블로그 스택 둘에만 건다.** 실험실은 세 단이다 — `apps/react`·`apps/next.js`는
  `eslint .`(경고 허용, `noInlineConfig` 없음)이고, `apps/typescript`·`apps/socket-server`는
  **린트하지 않는다**(lint 스크립트도 eslint 설정 파일도 없다 — `check-types`·`test`만 돈다).
  저장소 전체 eslint 설정은 넷뿐이다. 규율을 자산에만 거는 건 의도된 배분이다(루트 README
  "블로그는 실제로 쓰는 자산이라 신중하게"). 실험 앱 코드를 고칠 때 블로그 기준을 강제하지
  말 것 — `apps/typescript`에서 `pnpm lint`를 찾지도 말 것

#### SSG (Static Site Generation) 전략

- **Next.js `output: 'export'`**: 프로덕션 빌드 시 완전한 정적 HTML 생성 (개발 모드에서는 해제)
- **`trailingSlash: true`**: 후행 슬래시 설정. 호스팅 쪽 짝은 `wrangler.jsonc`의 **`html_handling: force-trailing-slash`**다 — 기본값(`auto-trailing-slash`)은 슬래시 유무 양쪽에 200을 주어 정규 URL이 둘로 갈라진다. **`skipTrailingSlashRedirect: true`가 짝이다** — 없으면 next/link가 `.`이 든 slug(`turborepo-next.js-docker`)를 파일로 보고 붙인 슬래시를 도로 벗겨 링크가 301을 한 번 더 탄다. 그래서 내부 href는 전부 스스로 후행 슬래시를 달아야 하고(`postPath`·`archivePath`가 그렇게 한다), 산출물은 `check-seo`의 `link-trailing-slash` 규칙이 지킨다
- **`images.unoptimized: true`**: 정적 호스팅에서 Next.js Image Optimization 사용 불가하므로 비활성화

#### Supabase 백엔드

**역할**: 정적 사이트에서 불가능한 **동적 기능**을 담당

| 기능              | 설명                                                                                                                                                                            |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **조회수 추적**   | `increment_view_count` RPC → `post_views` 테이블에 저장                                                                                                                         |
| **조회 이력**     | `post_view_logs` 테이블에 건별 조회 기록(시간별/요일별 집계의 원천)                                                                                                             |
| **Admin 인증**    | Google OAuth를 통한 관리자 로그인                                                                                                                                               |
| **Analytics RPC** | 대시보드용 집계 함수 (트렌드, 시간별, 요일별 통계) — `anon`에는 잠겨 있고 Edge Function `admin-analytics`가 호출자 JWT를 `ADMIN_EMAIL`과 대조한 뒤 `service_role`로 대신 부른다 |

- **클라이언트 둘**: 공개 페이지는 `src/lib/platform/publicClient.ts`(`@supabase/postgrest-js`만 —
  supabase-js 전체를 끌면 Auth·Realtime·Storage·Functions 45KB gzip이 공개 페이지에 딸려오고
  그중 realtime+phoenix+storage 18.5KB는 어디서도 안 쓰는 죽은 코드였다),
  Admin은 `src/lib/platform/client.ts`(`@supabase/supabase-js`, auth 세션 + `functions.invoke`).
  둘 다 Anon Key. `src/domain/analytics`의 배럴을 `index`·`admin`으로 나눈 이유가 이 분리다
- **로컬 개발**: `supabase start/stop`으로 로컬 Supabase 인스턴스 실행 (Docker 기반, `pnpm dev`가 먼저 띄운다)
- **마이그레이션**: `supabase/migrations/` 디렉토리에 SQL 파일로 스키마 관리. Edge Function은 `supabase/functions/admin-analytics`
- **프로덕션 URL**: `.env.production`에 Supabase Cloud 프로젝트 URL/Key 설정

#### 콘텐츠 파이프라인

1. **콘텐츠 작성**: `apps/blog/posts/` 디렉토리에 Markdown 파일 작성
   - 새 포스트는 `pnpm new-post "제목"` 스캐폴딩 CLI로 시작 권장 (frontmatter 자동 생성)
   - 폴더는 그냥 폴더다. **`_series.yml`을 둔 폴더만 시리즈**가 된다 — 표시명/설명/order도 그 파일에서 정의

   **Frontmatter 전체 목록** — 여기 없는 키는 `lint:posts`가 `unknown-frontmatter-key`로
   경고합니다. `@blog/content`(`packages/@blog/content/src/post/frontmatterSchema.ts`)의 서술자 테이블이 단일
   출처입니다(`RawFrontmatter`와 허용 키 집합이 여기서 파생되고, 아래 표는
   `frontmatterSchema.test.ts`가 그 테이블과 글자 단위로 대조합니다 — 표를 고치면
   테이블의 `doc`도 함께 고칠 것).

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

   `series`는 frontmatter가 아니라 **폴더 경로**로 결정됩니다(`repository.ts`).
   다만 폴더가 있다고 시리즈가 되는 건 아닙니다 — 그 폴더에 **`_series.yml`이
   있어야** 시리즈입니다(`@blog/content`의 `isSeriesFolder` — `src/post/series.ts`). 편수는
   보지 않습니다. 예전엔 2편 이상이면 선언 없이도 시리즈가 돼서, 고쳐 쓰는
   동안 글을 한곳에 모아 두는 것만으로 배지·시리즈 목록·검색·OG 카드가
   따라붙었습니다. 시리즈에서 빼려면 `_series.yml`을 지우면 됩니다.

2. **콘텐츠 공개 제어** — 축은 `status` **하나뿐**입니다 (`@blog/content`의 `src/post/visibility.ts`):
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

3. **빌드 전 처리** (`predev:web`·`prebuild` → `blog-content build` 통합 진입점. 아래 파일 경로는 모두 `packages/@blog/content/src/scripts/` 기준이고, 괄호 안이 서브커맨드 이름이다). **2단계**로 돈다 — 1단계는 게이트, 2단계 8개는 서로 다른 파일만 쓰므로 **병렬**:
   - **1단계** `validate-posts.ts`(`validate`): frontmatter 필수 필드(`status`·`title`·`date`), 폐기된 `published` 필드, 날짜 형식/timezone 모호성, 끊긴 이미지, 중복 slug 검사. predev:web·prebuild **둘 다** 돌고, prebuild만 `--strict`(아래 인용문). 규칙 표는 `validate/rules.ts`(29개), 판정 사슬은 `validate/frontmatter.ts`·`body.ts`·`corpus.ts`
   - **2단계** (병렬):
     - `sync-posts.ts`(`sync-posts`): 포스트 디렉토리의 이미지/미디어 파일을 `public/posts/`에 복사 (mtime 기반 incremental — 변경분만 복사, orphan 삭제)
     - `generate-sitemap.ts`(`sitemap`): 발행된 글 목록으로 `sitemap.xml` 생성
     - `render/generate-rss.ts`(`rss`): RSS 피드(`rss.xml`) 생성 — 전문 HTML은 `render/feedRenderer.ts`(react-dom/server + react-markdown)를 주입받는다
     - `render/generate-og-images.ts`(`og-images`): thumbnail이 없거나 `/og/*`를 가리키는 발행 글의 OG 카드 이미지(`public/og/{slug}.png`)를 satori + sharp로 생성 (content hash 기반 incremental, `.cache/og-images.json` manifest)
     - `render/generate-thumbnails.ts`(`thumbnails`): 로컬 썸네일을 sharp로 `public/thumbs/**/*-thumb.webp`로 최적화 (`.cache/thumbnails.json` manifest, orphan 삭제). `media`·`thumbs`·`og` 출력 디렉터리는 서로 겹치면 안 된다(`assertOutputDirsExclusive`) — 각자 orphan을 지우며 병렬로 돌기 때문
     - `generate-search-index.ts`(`search-index`): 검색용 JSON 인덱스(`search-index.json`, 공개 글) + `admin-posts-index.json`(비공개 포함) 생성 — 본문 미리보기(`contentPreview`) 포함
     - `generate-llms-full.ts`(`llms-full`): AI/LLM용 통합 텍스트(`llms-full.txt`) 생성
     - `generate-llms.ts`(`llms`): AI 크롤러용 색인(`llms.txt`) 생성 — 예전엔 손으로 관리하던 정적 파일이라 글 6편이 누락되고 개수도 어긋나 있었다. 이제 sitemap·rss와 같은 소스에서 뽑는다
   - **경로 앵커는 앱 루트의 `content.config.mts`다** — `defineContent({ root: import.meta.url })`을 default export 하는 파일의 위치가 앵커라서 패키지는 모노레포 구조를 모른다. CLI는 cwd에서 위로 올라가며 이 파일을 발견하고(전역 `--config <경로>`로 명시 가능, 서브커맨드 이름 **앞**에 적는다), 폴백은 없다. 각 스텝은 같은 CLI를 `node <cli/index.ts> --config <절대경로> <서브커맨드>`로 다시 spawn하며(PATH를 타지 않는다) 부모가 발견한 설정을 자식에 명시 전달한다. 이름과 옵션을 모듈에 잇는 곳은 `src/scripts/cli/program.ts`(commander) 하나뿐이고, `build-content.test.ts`가 두 목록의 어긋남을 잡는다. 앱 코드는 `apps/blog/web/src/content.ts`가 같은 설정으로 만든 `createContent`/`createPostSeo` **인스턴스**에서 로더·SEO 빌더를 가져온다(zero-arg 전역 로더 없음).

   - **사이트 고유 값의 소유자는 앱이다** — `content.values.mts`(순수 리터럴)가 `SITE`·`AUTHOR`·`TIMEZONE`·`DIAGRAM_NAMES`에 더해 `SITEMAP_PRIORITY`·`SITEMAP_STATIC_PAGES`·`LLMS_INTRO`·`LLMS_FACTS`·`LLMS_DOCS`까지 갖고, `content.config.mts`가 그걸 `defineContent`에 넘긴다. **예외가 og 팔레트·폰트다** — 이 둘은 값 모듈이 못 푸는 파생값이라(값 import 금지) `content.config.mts`가 뽑는다: 팔레트는 디자인 토큰에서 `themeColor('dark', …)`로, 폰트는 pretendard 배포판 파일을 `join()` 경로 조립로 가리키는 서술자(`og.fonts` — name·weight·path)로. `createRequire().resolve`가 아닌 이유는 그 파일 주석에 — 이 설정 파일은 Next 서버 그래프에도 실려서 Turbopack이 resolve 호출을 정적 분석해 폰트 파일 전부를 모듈로 끌다 빌드가 깨진다. 패키지에는 이 축들의 기본값이 **없다**(`ContentValues` 계약이 필수로 강제). 소비도 전부 설정을 거친다 — `postUrl(slug, siteUrl)`·`isPostVisible(post, timezone)`처럼 인자로 받고, 빌드 스크립트는 `ctx.config`를 읽는다. 예전에는 패키지가 리터럴을 들고 소비처 20여 곳이 설정 대신 그것을 직접 import해서, `defineContent`에 오버라이드를 넣어도 화면·산출물은 그대로인 **거짓 표면**이었다. 서버 SEO 모듈은 `content.config.mts`의 해석된 설정을, 화면·클라이언트 그래프는 `content.values.mts`의 **개별 상수**를 읽는다. 설정 객체를 클라이언트로 끌면 og 팔레트·llms 산문까지 번들에 실리고, 값 모듈의 그룹 객체(`SITE`)를 끌어도 마찬가지다 — 번들러는 모듈의 named export 단위로만 털어낸다(실제로 홈 히어로 소개문이 그렇게 새서 개별 상수로 되돌렸다). 같은 이유로 클라이언트가 부르는 `resolveThumbnailSrc`는 설정 슬라이스가 아니라 `ogDefaultImage` **스칼라**를 받는다

     > 예전엔 스텝마다 스크립트 **파일 경로**를 하드코딩하고 `isCliEntry`(realpath 비교)로 "직접 실행인가"를 판정했다. pnpm 심링크 경로와 ESM 로더 realpath가 달라 순진한 `import.meta.url === argv[1]` 비교가 **항상 false**였고, 모든 생성기가 무음 no-op이던 사고에서 나온 가드다. 진입점이 하나가 되면서 가드도 그 함정도 없어졌다 — 단계 모듈은 `main`만 export하고, 부르는 일은 CLI가 한다.
4. **정적 빌드**: `next build` → `out/` 디렉토리에 정적 파일 생성 → `check-seo`·`check-bundle`(아래)
5. **배포**: GitHub Actions(`deploy-blog.yml`) → `cloudflare/wrangler-action` → Cloudflare Workers
   - `main` 브랜치 push 시 자동 빌드 — `apps/blog/**`·`packages/@blog/**` 변경일 때만
   - **매일 KST 09:00 (UTC 00:00) cron 자동 빌드** — 예약 발행 글 공개용
   - 수동 트리거(`workflow_dispatch`) 지원
   - 배포 전에 PR CI와 같은 `quality-checks` 액션을 지나고, 빌드 후 `/posts/`의 프리렌더 링크 개수를 검증한다(CSR bail-out 회귀 가드)
   - **빌드가 읽는 `NEXT_PUBLIC_*`은 전부 커밋된 `.env.production`에 있다.** 예전엔
     Supabase 둘과 `NEXT_PUBLIC_ADMIN_EMAIL`을 `github-pages` 환경 시크릿으로 덮었는데,
     이 값들은 빌드 타임에 **클라이언트 번들로 인라인**되므로 애초에 시크릿이 아니었다
     (`src/domain/auth/adminAccess.ts` 주석: 실제 강제는 Edge Function이 호출자 JWT를
     별개의 진짜 시크릿 `ADMIN_EMAIL`과 대조하며 한다). 시크릿으로 두면 값이 두 곳에
     살아 프로덕션과 프리뷰가 조용히 갈리기만 한다. 워크플로가 주입하는 건
     `NEXT_PUBLIC_PR_COUNT` 하나뿐이다
   - **`environment: github-pages`는 이름만 잔재다.** 지금 하는 일은 배포 브랜치
     게이트 하나 — 허용 브랜치가 `main`뿐이라 `workflow_dispatch`로 엉뚱한 브랜치를
     프로덕션에 올리는 걸 막는다. 개명하려면 새 환경을 만들어야 한다(GitHub은 환경
     개명을 지원하지 않는다)
   - **PR 프리뷰는 `preview-blog.yml`이 따로 낸다** — `wrangler versions upload`로
     버전만 올리고(트래픽 이동 없음) 프리뷰 URL을 PR에 코멘트한다. 이 워크플로는
     `environment:`를 쓰지 않는다(브랜치 정책에 막히고, 열면 그 환경의
     `GOOGLE_OAUTH_CLIENT_SECRET`까지 모든 PR에 노출된다). 프리뷰 URL이 나오려면
     `wrangler.jsonc`의 **`preview_urls: true`** 가 필요하다 — 기본값이 `workers_dev`를
     따라가는데 그건 false로 꺼 두었기 때문이다(중복 콘텐츠 차단). 둘은 한 짝이다

#### 글쓰기 도구 (Authoring DX)

아래 `pnpm` 스크립트는 **`apps/blog/web` 디렉터리에서** 실행한다. 가장 잦은 둘은 루트에도
단축이 있다 — `pnpm new-post "제목"`(스캐폴딩), `pnpm blog-write`(Supabase/Docker 없이
콘텐츠 빌드 + next dev만 — 글만 쓰는 날의 기본 경로).

| 도구                                          | 설명                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm new-post "제목"`                        | 새 포스트 스캐폴딩. `--series`, `--tags`, `--scheduled`, `--slug`, `--status` 옵션 지원. 한글 제목/파일명 그대로 사용 가능                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm lint:posts`                             | frontmatter 검증. 메타 노트 정책: frontmatter delimiter(`---`)가 없거나 `status`가 없으면 빌드 대상이 아닌 것으로 보고 skip                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `pnpm check-seo`                              | 산출물(`out/`) HTML의 SEO 계약 검사 — h1 1개, description 중복·길이·말줄임, `<title>` 60자, canonical 자기참조, og 태그, img alt, 산출물↔발행 글 정합성(`@blog/content`의 `src/scripts/artifacts.ts` 레지스트리 — sitemap·rss·llms·llms-full·search-index·admin-index·og 7종). **`pnpm build` 안의 게이트라 따로 부를 일은 드물다**                                                                                                                                                                                                                         |
| `pnpm check-bundle`                           | 산출물(`out/`) JS 청크의 admin 코드 누수 검사 — 공개 페이지가 도달하는 청크(HTML 참조 + 청크 간 지연 로드 폐포)에 규칙 선언(`content.values.mts`의 `BUNDLE_GUARDS`)을 평가한다 — 규칙마다 마커가 forbiddenIn 스코프(페이지·도달 청크·산출물)에 없어야 하고 requiredIn 스코프에 있어야 한다(양성 대조가 규칙마다 필수 — 마커가 죽으면 검사 무력화 대신 실패). 현재 규칙 9개: admin 전용(계산 2·Edge Function·세션 supabase-js·Recharts), 글 전용(Mermaid·Giscus), 서버 전용 값(llms 산문), 빌드 타임 구문 강조. `check-seo` 다음, `pnpm build`의 마지막 단계 |
| dev 서버 미리보기                             | draft·scheduled 글은 dev 서버가 **실제 라우트**(목록·상세)에 그대로 노출한다 — 상세엔 PreviewBanner, 목록엔 HiddenPostBadge. 게이트는 `@blog/content`(`src/post/service.ts`)의 `shouldIncludeHiddenPosts` 한 곳뿐                                                                                                                                                                                                                                                                                                                                           |
| `_series.yml`                                 | **이 파일이 있는 폴더만 시리즈다.** 두면 시리즈 nav가 `order` 기준 chronological 정렬 + 표시명을 폴더명 대신 사용. 지우면 그냥 글을 모아 둔 폴더                                                                                                                                                                                                                                                                                                                                                                                                            |
| `<callout type="warning\|info\|tip\|danger">` | 마크다운 헬퍼 컴포넌트 (raw HTML로 작성). `<figure>` + `<figcaption>`, `<file-tree>`도 지원                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `<dialogue>` · `<metrics>` · `<timeline>`     | 리뉴얼 시그니처 컴포넌트. 역시 raw HTML 커스텀 태그 — 문법은 `blog-components` 스킬                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `<diagram>` + frontmatter `hero:`             | 구조 그림. 저작법 전체는 **`apps/blog/web/design/DIAGRAM_AUTHORING.md`** — 요약은 `blog-components` 스킬                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 펜스 메타 `title=` · `<code-tabs>`            | 코드 블록에 파일명을 달거나 npm/pnpm/yarn 탭으로 묶는다. 커스텀 태그가 아니라 **코드 펜스의 메타**다 — `blog-components` 스킬                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `tech-blog-writer` 스킬                       | 글의 구조·톤·어휘 코칭. 소재를 3단계(아이디어 수집 → 아웃라인 → 섹션별 집필) 대화로 구조화한다. 구조는 소재에서 뽑고 기성 서사 틀에 끼워 맞추지 않으며, 금지 어휘 표로 장르 색을 걷어낸다 — **글쓰기 지침의 단일 출처**                                                                                                                                                                                                                                                                                                                                     |

#### 디자인 시스템 · 저작 문법 (스킬로 분리)

시각 기준은 **구현된 화면 자체**다 — 홈(`/`)과 글 상세를 dev 서버로 열어 대조한다.
수치와 그 근거, 그리고 **글 자체의 구조·톤·어휘**는 아래 세 스킬이 단일 출처이고,
이 파일에 다시 적지 않는다.

| 무엇을 고칠 때                                                                                                                                   | 스킬                 |
| :----------------------------------------------------------------------------------------------------------------------------------------------- | :------------------- |
| 색·글꼴·라운드·보더·레일 폭, `blog-preset.ts`의 semanticToken, 코드 블록 테마                                                                    | `blog-design-system` |
| 글 본문의 커스텀 태그 — `<diagram>`·`<dialogue>`·`<metrics>`·`<timeline>`·`<callout>`·`<file-tree>`·`<figure>`, 코드 펜스 `title=`·`<code-tabs>` | `blog-components`    |
| 글을 무엇부터 어떤 순서로 쓸지, 초안의 구조·톤·어휘(장르 색 걷어내기, 금지 어휘 표)                                                              | `tech-blog-writer`   |

지켜야 하는 금지선만 여기 남긴다:

- 색은 전부 `packages/@design-system/ui/src/blog-preset.ts`에서 온다.
  **컴포넌트에서 hex를 직접 쓰지 않는다.** 다이어그램 SVG도 마찬가지로
  `currentColor` 또는 Panda `css()`로 토큰에 연결한다. CSS 변수를 못 읽는
  렌더러(satori/sharp — OG 카드)는 같은 파일의 `themeColor('dark', 'paper.50')`으로
  뽑는다. **hex를 옮겨 적지 않는다**
- 레일·거터의 단일 출처는 `src/components/Rail.tsx`다. **페이지에서 `maxW`와 `px`를
  직접 쓰지 않는다.** 거터는 언제나 레일 바깥이다
- **그라데이션 · 글로우 · box-shadow 장식 금지.** 플랫 유지. **세리프 금지**
- Panda는 `strictTokens: true`다. 토큰 밖 값은 `'[12px]'`처럼 대괄호로 이스케이프해
  "여긴 의도적으로 토큰을 벗어난다"를 코드에 남긴다
- 히어로 슬롯(frontmatter `hero:`)은 이름 레지스트리에 등록된 다이어그램만 받는다
- 다이어그램 저작 가이드 전문: `apps/blog/web/design/DIAGRAM_AUTHORING.md`

#### 클라이언트 사이드 기능 (런타임)

- **조회수 카운팅**: `useViewCount` 훅 → `@blog/content`의 `viewCookie`(6시간 쿨다운, RPC 전에 쿠키를 먼저 심어 두 탭 레이스 방지) → `src/domain/analytics` → `publicClient` RPC
- **댓글**: Giscus (GitHub Discussions 기반). `NEXT_PUBLIC_GISCUS_*` 4개가 모두 있을 때만 렌더
- **Analytics 대시보드**: `/admin` 경로, React Query(`useSuspenseQuery`) + Recharts 차트. `AdminGuard`가 세션을 보고, 데이터는 Edge Function `admin-analytics` 경유
- **검색**: `SearchDialog`가 열릴 때 빌드 산출물 `/search-index.json`을 fetch — 서버 없는 클라이언트 검색
- **테마**: `layout.tsx`의 pre-paint 인라인 스크립트(쿠키 → `prefers-color-scheme` → dark)가 `html[data-theme]`를 세팅, `useTheme`가 `useSyncExternalStore`로 구독
- **페이지 전환 애니메이션**: `@ssgoi/react` + Motion 라이브러리
- **데이터 페칭**: `@tanstack/react-query`로 Supabase 데이터 캐싱/관리

#### SEO & 디스커버리

- **Sitemap**: 빌드 시 자동 생성 (`/sitemap.xml`)
- **RSS**: 빌드 시 자동 생성 (`/rss.xml`)
- **robots.txt**: `/public/robots.txt`
- **OpenGraph/Twitter Card**: `layout.tsx` 메타데이터에 설정
- **Google Analytics**: `@next/third-parties` GA4 연동 (`G-ZS9ENFSSQ0`)
- **Google Tag Manager**: `@next/third-parties` GTM 연동 (`GTM-5SMPQ23P`). GA4와 **별개로** `layout.tsx`에서 함께 로드된다(둘 다 `NODE_ENV === 'production'`일 때만)
- **검색 인증**: Naver 사이트 인증 메타태그 포함
- **검색 인덱스**: `search-index.json`으로 클라이언트 사이드 검색 지원
- **llms.txt / llms-full.txt**: 빌드 시 자동 생성 (AI 크롤러용 색인·전문)
- **산출물 검사**: `pnpm check-seo`(HTML의 SEO 계약)와 `pnpm check-bundle`(JS 청크의 admin 코드 누수 — 공개 배럴 최상위 부수효과를 막는 eslint 룰이 원인을, 이 검사가 결과를 본다). **`pnpm build`의 마지막 두 단계가 유일한 실행 지점이다**(`prebuild → next build → check-seo → check-bundle`). PR CI(`ci.yml`)와 배포(`deploy-blog.yml`)가 각각 그 `build`를 부르므로 로컬·PR·배포가 **같은 검사**를 지난다 — 워크플로에 별도 스텝을 또 두면 build에서 이미 실패해 도달하지 못하는 죽은 게이트가 된다

> **`prebuild`는 `--strict`로 돈다.** `lint:posts`(수동)와 `predev:web`은 경고로 두는
> SEO 규칙(`missing-excerpt`·`excerpt-length`·`long-title`·`missing-image-alt`·
> `truncated-excerpt`·`duplicate-description`)을, 빌드 직전에는 **에러**로 올린다.
> 발행 대상(`draft`가 아닌 글)만 해당한다. 글을 쓰는 동안 dev 서버가 막히지
> 않으면서도, 배포를 깨뜨릴 문제는 빌드를 돌리기 전에 파일·줄 번호와 함께 잡힌다.
> 에러 범위는 **`check-seo`가 보는 범위와 정확히 같다**(`isPostVisible`). 아직
> 공개 전인 예약 글은 경고다 — 로컬이 CI보다 더 엄격하면, 그 글과 상관없는 이미
> 발행된 변경까지 배포가 통째로 막힌다.

> **`lint:posts`와 `check-seo`는 보는 곳이 다르다.** 전자는 **frontmatter 원문**을,
> 후자는 **최종 HTML**을 본다. 2026-08 감사에서 나온 문제들 — 페이지 헤더 h1과 본문
> `# 제목`이 겹쳐 h1이 2개, 도입부가 같은 시리즈 글끼리 description 완전 중복,
> og:site_name이 `Frontend Lab` / `Frontend Lab Blog` 두 종류, og:locale이 46개 중
> 44개 페이지에서 누락 — 은 전부 원문만 봐서는 보이지 않는 것들이었다. 둘 중 하나만
> 돌리면 그 계열의 회귀가 다시 조용히 지나간다.

> **본문 h1은 렌더 시 h2로 강등된다**(`src/components/post/markdownHeadings.tsx`).
> 페이지의 h1은 `PostHeader`의 글 제목 하나뿐이어야 하기 때문이다. 사이트 본문과 RSS
> `content:encoded`가 **같은 매핑을 공유**하니 한쪽만 바꾸지 말 것. 원문에 `# `이
> 남아 있으면 `lint:posts`가 `body-h1` 경고로 알린다(렌더는 조용히 고쳐주므로,
> 경고가 없으면 글쓴이가 영영 모른다).

> **GTM 컨테이너는 이 저장소 밖에 있다.** 코드에 있는 건 컨테이너 ID 한 줄뿐이고,
> 어떤 태그가 실제로 발사되는지는 GTM 웹 콘솔에만 존재한다. 2026-07-30 Lighthouse
> 점검(이슈 #165)에서 이 컨테이너가 **Microsoft Clarity**(`clarity.ms`, `c.bing.com`)를
> 로드해 서드파티 쿠키 8개를 심는 것이 확인됐고, 그 때문에 Best Practices가 세 페이지
> 모두 77점이다(`third-party-cookies` 가중치 5 + `inspector-issues` 1 = 26점 중 6점 감점).
> 태그를 추가·제거할 때 여기와 `/privacy` 페이지를 함께 갱신할 것 — GTM·Clarity는
> 2026-08-21에 `/privacy`에 고지했다(서드파티 쿠키 항목 포함). Best Practices 감점을
> 없애려면 고지가 아니라 GTM 콘솔에서 Clarity 태그를 내려야 한다.

#### 주요 설정 파일

| 파일                                        | 역할                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                            | SSG output(개발 모드 제외), trailingSlash + skipTrailingSlashRedirect 짝, images.unoptimized, reactCompiler, `optimizePackageImports: ['@blog/content']`(배럴 import가 fs 모듈을 클라이언트 그래프로 끌지 않게)                                                                                                                                                                                                                                                                                                         |
| `panda.config.ts`                           | Panda CSS 설정 — preset `@design-system/ui/preset` + `blog-preset`, `strictTokens`, outdir는 `packages/@design-system/ui-lib`                                                                                                                                                                                                                                                                                                                                                                                           |
| `eslint.config.mts` (앱·패키지 각각)        | ESLint 10 flat config를 직접 조립(`eslint-config-next` 미사용) + `eslint-plugin-boundaries` 레이어 경계. 두 파일이 같은 엄격 수준을 유지해야 한다 — 패키지 소스가 앱 program에 소스째 섞이기 때문                                                                                                                                                                                                                                                                                                                       |
| `tsconfig.json` / `tsconfig.test.json`      | 프로덕션/테스트 분할(앱·패키지 동일 구조). 테스트 include는 vitest include 글롭·ESLint 테스트 블록과 대칭 — 한쪽을 고치면 셋을 함께                                                                                                                                                                                                                                                                                                                                                                                     |
| `.env.production`                           | Supabase URL/Key, Giscus 설정 — 커밋되는 유일한 env 파일(`.gitignore`의 `.env*` 예외). 로컬 `.env.local`은 커밋하지 않는다                                                                                                                                                                                                                                                                                                                                                                                              |
| `env.d.ts`                                  | `NEXT_PUBLIC_*` 8개를 `NodeJS.ProcessEnv`에 선언 — `noPropertyAccessFromIndexSignature` 아래서도 점 접근을 쓰기 위해(Next는 멤버 표현식만 인라인)                                                                                                                                                                                                                                                                                                                                                                       |
| `supabase/config.toml`                      | 로컬 Supabase 설정 (Auth, DB, Storage 등). `supabase/functions/admin-analytics`가 Admin RPC 프록시                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `vercel.json`                               | 프리뷰 배포 — `main`·`renovate/**` 비활성, `apps/blog`·`packages/@blog` 변경 없으면 `ignoreCommand`로 스킵                                                                                                                                                                                                                                                                                                                                                                                                              |
| `apps/blog/web/wrangler.jsonc`              | 블로그 정적 자산 Worker — `main` 없이 `assets.directory: ./out`만. `routes`에 `blog.sangwook.dev`를 `custom_domain: true`로 선언해 배포 대상을 저장소가 소유한다. `workers_dev: false`로 `*.workers.dev` 사본을 닫아 중복 콘텐츠를 없앴다. `html_handling: force-trailing-slash`가 `next.config.ts`의 `trailingSlash: true`와 짝이고(다만 이때 나가는 코드는 **307**이다 — Pages는 301이었다), `not_found_handling: 404-page`가 `out/404.html`을 물린다                                                                 |
| `.github/workflows/preview-blog.yml`        | PR 프리뷰 — `wrangler versions upload`로 버전만 올리고(트래픽 이동 없음) 프리뷰 URL을 PR에 sticky 코멘트. `environment:`를 쓰지 않는다                                                                                                                                                                                                                                                                                                                                                                                  |
| `.github/workflows/deploy-blog.yml`         | CI/CD 배포 워크플로우 — `cloudflare/wrangler-action`으로 Workers에 올린다. PR CI(`ci.yml`)와 `.github/actions/quality-checks` composite action을 공유한다. `environment: github-pages`는 시크릿이 그 환경에 있어 이름만 남은 것                                                                                                                                                                                                                                                                                         |
| `apps/blog/posts/{series}/_series.yml`      | 시리즈 선언 — 이 파일이 있어야 시리즈. 표시명·설명·order 메타도 여기                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `packages/@blog/content`                    | 콘텐츠 프레임워크 패키지 — 스키마·로더·공개 판정·URL 계약·빌드 스크립트·2층 검증. 문 두 개(`@blog/content` + `@blog/content/seo`) + `bin`의 `blog-content`, 소스 익스포트(빌드 스텝 없음). 내부는 `packages/@blog/content/README.md`                                                                                                                                                                                                                                                                                    |
| `…content/src/scripts/build-content.ts`     | predev:web/prebuild 통합 진입점 (validate → sync/sitemap/rss/og-images/thumbnails/search/llms-full/llms 병렬) — 앱 package.json은 `blog-content build`로 부른다                                                                                                                                                                                                                                                                                                                                                         |
| `…content/src/scripts/cli/`                 | `bin`의 진입점. `index.ts`가 실행, `program.ts`가 commander로 서브커맨드·옵션을 정의하고 단계 모듈을 동적 import한다. 단계나 플래그를 더할 때 고칠 곳                                                                                                                                                                                                                                                                                                                                                                   |
| `…content/src/scripts/check-seo.ts`         | 빌드 산출물 SEO 검사 (CI 게이트). 산출물 레지스트리는 같은 폴더의 `artifacts.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `…content/src/scripts/check-bundle.ts`      | 빌드 산출물 번들 누수 검사 (CI 게이트) — **평가기일 뿐 분류를 모른다**(admin이니 서버 전용이니 하는 어휘는 소비자의 것). 규칙(label·marker·forbiddenIn·requiredIn)은 앱 `content.values.mts`의 `BUNDLE_GUARDS`가 통째로 소유, 계약은 `contentConfig.ts`의 `BundleRule`·`MarkerScope`. 패키지에 기본 규칙 없음 — 미선언 사이트는 검사 스킵                                                                                                                                                                               |
| `…content/src/scripts/validate/rules.ts`    | `validate-posts`의 규칙 표(29개, severity·scope·`--strict` 승격 대상 6개). 판정 사슬은 옆의 `frontmatter.ts`·`body.ts`·`corpus.ts`                                                                                                                                                                                                                                                                                                                                                                                      |
| `…content/src/post/frontmatterSchema.ts`    | frontmatter 서술자 테이블 — 이 파일 위 표와 글자 단위로 대조된다(`frontmatterSchema.test.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `apps/blog/web/content.values.mts`          | **이 사이트의 값** — 순수 리터럴(값 import 없음, 타입만 `satisfies`로 계약 확인). **개별 상수(`SITE_URL`·`SITE_NAME`…)가 1차이고 그룹 객체(`SITE`·`AUTHOR`·`SITEMAP_PRIORITY`·`LLMS_*`)는 설정 배선 전용**이다 — 번들러는 객체 필드를 못 털어내서, 화면이 그룹을 들여오면 안 쓰는 값까지 클라이언트 번들에 실린다                                                                                                                                                                                                       |
| `apps/blog/web/content.config.mts`          | **경로 앵커 + 배선** — `defineContent({ root: import.meta.url, …값 모듈 })` default export. 이 파일의 위치가 `dirs.*`의 기준이고, CLI(cwd walk-up)와 앱(`src/content.ts` 정적 import)이 함께 읽는다                                                                                                                                                                                                                                                                                                                     |
| `apps/blog/web/src/content.ts`              | 콘텐츠 인스턴스 모듈 — `createContent`/`createPostSeo`로 fs 로더·SEO 빌더를 조립해 re-export(서버 전용). 페이지는 로더를 `@/src/content`에서 가져온다                                                                                                                                                                                                                                                                                                                                                                   |
| `…content/src/shared/contentConfig.ts`      | `defineContent({...})` 설정 표면 — 서버·빌드 전용. **사이트 고유 값에는 기본값이 없다**(`ContentValues` 계약: `root`·`site`·`author`·`timezone`·`registries.diagramNames`·`og.palette`·`og.fonts`가 필수). 남은 기본값은 어떤 사이트에서도 같은 값뿐이고(SEO 예산·펜스 라벨·경로 관례·OG 규격), 나머지는 비었거나(sitemap 정적 페이지·우선순위·llms facts) 파생된다(llms 소개 산문 ← `site.description`). 값은 앱의 `content.values.mts`가 소유한다. 절대 경로 해석은 `contentPaths.ts`의 `resolveContentPaths(config)` |
| `apps/blog/web/README.md`                   | 앱의 코드 배치·레이어·런타임 데이터 흐름·스크립트·env                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `apps/blog/web/design/DIAGRAM_AUTHORING.md` | 다이어그램 저작 가이드 (선언형 태그 prop 표, 복붙 예제, `hero:` 등록법)                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Prerequisites

- Node.js / pnpm 버전은 루트 `engines` · `.tool-versions` · `packageManager`가 단일
  출처다. 이 파일에 숫자를 복사해 두지 말 것 — Renovate가 올릴 때마다 어긋난다
- **두 패키지 이상이 쓰는 의존성은 `pnpm-workspace.yaml`의 catalog가 단일 출처다.**
  package.json에는 `catalog:`(기본) 또는 `catalog:lint`(eslint 툴체인 — 코어·플러그인
  버전이 서로 물려 돌아서 소비자가 하나뿐인 플러그인도 여기 둔다)만 적고 숫자는 쓰지
  않는다. 예외는 `peerDependencies` — 핀이 아니라 호환 범위 선언이라 넓게 둔다
- 테스트 러너는 워크스페이스 전부 **Vitest** 하나다. 갈리는 것은 환경뿐이고, 환경이
  둘인 `apps/blog/web`만 `test.projects`로 `node`(domain·lib) / `jsdom`(src)을 나눈다
