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

테스트 요소 선택은 `data-testid` 속성으로 하고, 외부 의존성은 mock한다.

### Blog Architecture

The blog (`apps/blog/web/`) is a **statically generated (SSG) Next.js application** with a
**Supabase BaaS backend**, deployed to **GitHub Pages**. The domain is `https://blog.sangwook.dev`.
콘텐츠 프레임워크(스키마·로더·공개 판정·URL 계약·빌드 스크립트·2층 검증)는
**`packages/@blog/content`** 로 떼어져 있고, 앱은 그 소비자다. 코드 배치와 런타임 데이터
흐름은 `apps/blog/web/README.md`가, 패키지 내부는 `packages/@blog/content/README.md`가 다룬다 —
이 절은 **운영 규칙과 계약**만 적는다.

#### 레이어 경계 (lint가 강제)

세 층(원고 디렉터리 → 패키지 → 앱)이 한 방향으로만 의존한다. `eslint-plugin-boundaries`가
**폴더 단위 element**로 강제하므로 경계 위반은 `pnpm lint`에서 잡힌다 — 컨벤션이 아니다.

```
apps/blog/posts (원고)  →  packages/@blog/content  →  apps/blog/web
                            shared → post → seo →      lib/platform → domain/analytics → src
                            scripts → scripts/render → scripts/cli
```

- **`@blog/content` 내부**: `shared`(node 코어만) → `post`(+gray-matter) → `seo`(순수 계산) →
  `scripts`(빌드) → `scripts/render`(React·satori·sharp·resvg는 여기만) → `scripts/cli`(진입점,
  단계를 동적 import로 든다). 밖으로 여는 문은 `@blog/content`·`@blog/content/seo` 둘뿐.
  빌드 스크립트는 API가 아니라 실행 파일이라 package.json `bin`의 **`blog-content`** 하나로
  나가고, 앱은 서브커맨드 이름만 안다(`blog-content build`). shebang은 `node`다 — 상대 import가
  전부 `.ts` 확장자를 달고(`allowImportingTsExtensions`, 앱 tsconfig에도 켜져 있어야 한다)
  문법은 `erasableSyntaxOnly`라, node의 type stripping만으로 로더 없이 돈다
- **앱 내부**: `lib/platform`(Supabase 어댑터, 외부 의존은 supabase-js·postgrest-js만) →
  `domain/analytics`(순수 계산 + 저장소, 배럴 `index`·`admin` 둘) → `src`(라우트·컴포넌트·훅).
  `src`는 저장소를 직접 찌르지 않고 배럴로, `client.from()`·`.rpc()`도 직접 부르지 않는다.
  **`src`는 node 코어를 못 만진다** — fs 접근은 전부 `@blog/content` 로더의 일(클라이언트 번들
  누수 예방). `@blog/content`는 앱에서 외부 패키지(`content-pkg`)로 보인다
- **tsconfig 분할**: `tsconfig.json`(프로덕션, 엄격 플래그 전부) / `tsconfig.test.json`(테스트 —
  `noUncheckedIndexedAccess`·`noPropertyAccessFromIndexSignature`·`exactOptionalPropertyTypes` 세
  개만 끔). `check-types`와 ESLint 타입 룰이 같은 분할을 따른다
- **lint 임계값**: 앱·패키지 모두 `--max-warnings=0`. 앱에 남아 있던 jsx-a11y 경고 5건은 설계로
  풀고 룰을 에러로 되돌렸다(#289). 함께 `noInlineConfig: true` +
  `@eslint-community/eslint-comments/no-use`가 켜져 **인라인 `eslint-disable` 주석이 전면 금지**다 —
  예외가 필요하면 주석이 아니라 `eslint.config.mjs`에 `files` 스코프로 적을 것

#### SSG (Static Site Generation) 전략

- **Next.js `output: 'export'`**: 프로덕션 빌드 시 완전한 정적 HTML 생성 (개발 모드에서는 해제)
- **`trailingSlash: true`**: GitHub Pages 호환을 위한 후행 슬래시 설정. **`skipTrailingSlashRedirect: true`가 짝이다** — 없으면 next/link가 `.`이 든 slug(`turborepo-next.js-docker`)를 파일로 보고 붙인 슬래시를 도로 벗겨 링크가 301을 한 번 더 탄다. 그래서 내부 href는 전부 스스로 후행 슬래시를 달아야 하고(`postPath`·`archivePath`가 그렇게 한다), 산출물은 `check-seo`의 `link-trailing-slash` 규칙이 지킨다
- **`images.unoptimized: true`**: 정적 호스팅에서 Next.js Image Optimization 사용 불가하므로 비활성화

#### Supabase 백엔드

**역할**: 정적 사이트에서 불가능한 **동적 기능**을 담당

| 기능              | 설명                                                                                                                                                                            |
| :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **조회수 추적**   | `increment_view_count` RPC → `post_views` 테이블에 저장                                                                                                                         |
| **조회 이력**     | `post_view_logs` 테이블에 건별 조회 기록(시간별/요일별 집계의 원천)                                                                                                             |
| **Admin 인증**    | Google OAuth를 통한 관리자 로그인                                                                                                                                               |
| **Analytics RPC** | 대시보드용 집계 함수 (트렌드, 시간별, 요일별 통계) — `anon`에는 잠겨 있고 Edge Function `admin-analytics`가 호출자 JWT를 `ADMIN_EMAIL`과 대조한 뒤 `service_role`로 대신 부른다 |

- **클라이언트 둘**: 공개 페이지는 `lib/platform/publicClient.ts`(`@supabase/postgrest-js`만 —
  supabase-js 전체를 끌면 Auth·Realtime·Storage·Functions 45KB gzip이 공개 페이지에 딸려오고
  그중 realtime+phoenix+storage 18.5KB는 어디서도 안 쓰는 죽은 코드였다),
  Admin은 `lib/platform/client.ts`(`@supabase/supabase-js`, auth 세션 + `functions.invoke`).
  둘 다 Anon Key. `domain/analytics`의 배럴을 `index`·`admin`으로 나눈 이유가 이 분리다
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
   | `seoTitle`      |      | **`<title>` 전용**의 짧은 제목. 화면 제목·OG 카드·JSON-LD headline은 계속 `title`을 쓴다. `{seoTitle ?? title} \| Frontend Lab`이 60자를 넘으면 `lint:posts`가 `long-title` 경고                            |
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
     - `render/generate-og-images.ts`(`og-images`): thumbnail이 없거나 `/og/*`를 가리키는 발행 글의 OG 카드 이미지(`public/og/{slug}.png`)를 satori + resvg로 생성 (content hash 기반 incremental, `.cache/og-images.json` manifest)
     - `render/generate-thumbnails.ts`(`thumbnails`): 로컬 썸네일을 sharp로 `public/thumbs/**/*-thumb.webp`로 최적화 (`.cache/thumbnails.json` manifest, orphan 삭제). `media`·`thumbs`·`og` 출력 디렉터리는 서로 겹치면 안 된다(`assertOutputDirsExclusive`) — 각자 orphan을 지우며 병렬로 돌기 때문
     - `generate-search-index.ts`(`search-index`): 검색용 JSON 인덱스(`search-index.json`, 공개 글) + `admin-posts-index.json`(비공개 포함) 생성 — 본문 미리보기(`contentPreview`) 포함
     - `generate-llms-full.ts`(`llms-full`): AI/LLM용 통합 텍스트(`llms-full.txt`) 생성
     - `generate-llms.ts`(`llms`): AI 크롤러용 색인(`llms.txt`) 생성 — 예전엔 손으로 관리하던 정적 파일이라 글 6편이 누락되고 개수도 어긋나 있었다. 이제 sitemap·rss와 같은 소스에서 뽑는다
   - 각 스텝은 같은 CLI를 `node <cli/index.ts> <서브커맨드>`로 다시 spawn하며(PATH를 타지 않는다), cwd에 기대지 않고 `src/shared/contentPaths.ts`로 경로를 푼다. 이름과 옵션을 모듈에 잇는 곳은 `src/scripts/cli/program.ts`(commander) 하나뿐이고, `build-content.test.ts`가 두 목록의 어긋남을 잡는다.

     > 예전엔 스텝마다 스크립트 **파일 경로**를 하드코딩하고 `isCliEntry`(realpath 비교)로 "직접 실행인가"를 판정했다. pnpm 심링크 경로와 ESM 로더 realpath가 달라 순진한 `import.meta.url === argv[1]` 비교가 **항상 false**였고, 모든 생성기가 무음 no-op이던 사고에서 나온 가드다. 진입점이 하나가 되면서 가드도 그 함정도 없어졌다 — 단계 모듈은 `main`만 export하고, 부르는 일은 CLI가 한다.
4. **정적 빌드**: `next build` → `out/` 디렉토리에 정적 파일 생성 → `check-seo`(아래)
5. **배포**: GitHub Actions(`deploy-blog.yml`) → GitHub Pages
   - `main` 브랜치 push 시 자동 빌드 — `apps/blog/**`·`packages/@blog/**` 변경일 때만
   - **매일 KST 09:00 (UTC 00:00) cron 자동 빌드** — 예약 발행 글 공개용
   - 수동 트리거(`workflow_dispatch`) 지원
   - 배포 전에 PR CI와 같은 `quality-checks` 액션을 지나고, 빌드 후 `/posts/`의 프리렌더 링크 개수를 검증한다(CSR bail-out 회귀 가드)

#### 글쓰기 도구 (Authoring DX)

아래 `pnpm` 스크립트는 **`apps/blog/web` 디렉터리에서** 실행한다. 가장 잦은 둘은 루트에도
단축이 있다 — `pnpm new-post "제목"`(스캐폴딩), `pnpm blog-write`(Supabase/Docker 없이
콘텐츠 빌드 + next dev만 — 글만 쓰는 날의 기본 경로).

| 도구                                          | 설명                                                                                                                                                                                                                                                                                                                                  |
| :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm new-post "제목"`                        | 새 포스트 스캐폴딩. `--series`, `--tags`, `--scheduled`, `--slug`, `--status` 옵션 지원. 한글 제목/파일명 그대로 사용 가능                                                                                                                                                                                                            |
| `pnpm lint:posts`                             | frontmatter 검증. 메타 노트 정책: frontmatter delimiter(`---`)가 없거나 `status`가 없으면 빌드 대상이 아닌 것으로 보고 skip                                                                                                                                                                                                           |
| `pnpm check-seo`                              | 산출물(`out/`) HTML의 SEO 계약 검사 — h1 1개, description 중복·길이·말줄임, `<title>` 60자, canonical 자기참조, og 태그, img alt, 산출물↔발행 글 정합성(`@blog/content`의 `src/scripts/artifacts.ts` 레지스트리 — sitemap·rss·llms·llms-full·search-index·admin-index·og 7종). **`pnpm build`의 마지막 단계라 따로 부를 일은 드물다** |
| dev 서버 미리보기                             | draft·scheduled 글은 dev 서버가 **실제 라우트**(목록·상세)에 그대로 노출한다 — 상세엔 PreviewBanner, 목록엔 HiddenPostBadge. 게이트는 `@blog/content`(`src/post/service.ts`)의 `shouldIncludeHiddenPosts` 한 곳뿐                                                                                                                     |
| `_series.yml`                                 | **이 파일이 있는 폴더만 시리즈다.** 두면 시리즈 nav가 `order` 기준 chronological 정렬 + 표시명을 폴더명 대신 사용. 지우면 그냥 글을 모아 둔 폴더                                                                                                                                                                                      |
| `<callout type="warning\|info\|tip\|danger">` | 마크다운 헬퍼 컴포넌트 (raw HTML로 작성). `<figure>` + `<figcaption>`, `<file-tree>`도 지원                                                                                                                                                                                                                                           |
| `<dialogue>` · `<metrics>` · `<timeline>`     | 리뉴얼 시그니처 컴포넌트. 역시 raw HTML 커스텀 태그 — 문법은 `blog-components` 스킬                                                                                                                                                                                                                                                   |
| `<diagram>` + frontmatter `hero:`             | 구조 그림. 저작법 전체는 **`apps/blog/web/design/DIAGRAM_AUTHORING.md`** — 요약은 `blog-components` 스킬                                                                                                                                                                                                                              |
| 펜스 메타 `title=` · `<code-tabs>`            | 코드 블록에 파일명을 달거나 npm/pnpm/yarn 탭으로 묶는다. 커스텀 태그가 아니라 **코드 펜스의 메타**다 — `blog-components` 스킬                                                                                                                                                                                                         |
| `tech-blog-writer` 스킬                       | 글의 구조·톤·어휘 코칭. 소재를 3단계(아이디어 수집 → 아웃라인 → 섹션별 집필) 대화로 구조화한다. 구조는 소재에서 뽑고 기성 서사 틀에 끼워 맞추지 않으며, 금지 어휘 표로 장르 색을 걷어낸다 — **글쓰기 지침의 단일 출처**                                                                                                               |

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
  `currentColor` 또는 Panda `css()`로 토큰에 연결한다
- 레일·거터의 단일 출처는 `src/components/Rail.tsx`다. **페이지에서 `maxW`와 `px`를
  직접 쓰지 않는다.** 거터는 언제나 레일 바깥이다
- **그라데이션 · 글로우 · box-shadow 장식 금지.** 플랫 유지. **세리프 금지**
- Panda는 `strictTokens: true`다. 토큰 밖 값은 `'[12px]'`처럼 대괄호로 이스케이프해
  "여긴 의도적으로 토큰을 벗어난다"를 코드에 남긴다
- 히어로 슬롯(frontmatter `hero:`)은 이름 레지스트리에 등록된 다이어그램만 받는다
- 다이어그램 저작 가이드 전문: `apps/blog/web/design/DIAGRAM_AUTHORING.md`

#### 클라이언트 사이드 기능 (런타임)

- **조회수 카운팅**: `useViewCount` 훅 → `@blog/content`의 `viewCookie`(6시간 쿨다운, RPC 전에 쿠키를 먼저 심어 두 탭 레이스 방지) → `domain/analytics` → `publicClient` RPC
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
- **산출물 검사**: `pnpm check-seo` — 빌드된 HTML을 파싱해 SEO 계약을 검사하고 위반 시 실패한다. **`pnpm build`의 마지막 단계 하나가 유일한 실행 지점이다**(`prebuild → next build → check-seo`). PR CI(`ci.yml`)와 배포(`deploy-blog.yml`)가 각각 그 `build`를 부르므로 로컬·PR·배포가 **같은 검사**를 지난다 — 워크플로에 별도 스텝을 또 두면 build에서 이미 실패해 도달하지 못하는 죽은 게이트가 된다

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

| 파일                                        | 역할                                                                                                                                                                                                                                 |
| :------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                            | SSG output(개발 모드 제외), trailingSlash + skipTrailingSlashRedirect 짝, images.unoptimized, reactCompiler, `optimizePackageImports: ['@blog/content']`(배럴 import가 fs 모듈을 클라이언트 그래프로 끌지 않게)                      |
| `panda.config.ts`                           | Panda CSS 설정 — preset `@design-system/ui/preset` + `blog-preset`, `strictTokens`, outdir는 `packages/@design-system/ui-lib`                                                                                                        |
| `eslint.config.mjs` (앱·패키지 각각)        | ESLint 10 flat config를 직접 조립(`eslint-config-next` 미사용) + `eslint-plugin-boundaries` 레이어 경계. 두 파일이 같은 엄격 수준을 유지해야 한다 — 패키지 소스가 앱 program에 소스째 섞이기 때문                                    |
| `tsconfig.json` / `tsconfig.test.json`      | 프로덕션/테스트 분할(앱·패키지 동일 구조). 테스트 include는 vitest include 글롭·ESLint 테스트 블록과 대칭 — 한쪽을 고치면 셋을 함께                                                                                                  |
| `.env.production`                           | Supabase URL/Key, Giscus 설정 — 커밋되는 유일한 env 파일(`.gitignore`의 `.env*` 예외). 로컬 `.env.local`은 커밋하지 않는다                                                                                                           |
| `env.d.ts`                                  | `NEXT_PUBLIC_*` 8개를 `NodeJS.ProcessEnv`에 선언 — `noPropertyAccessFromIndexSignature` 아래서도 점 접근을 쓰기 위해(Next는 멤버 표현식만 인라인)                                                                                    |
| `supabase/config.toml`                      | 로컬 Supabase 설정 (Auth, DB, Storage 등). `supabase/functions/admin-analytics`가 Admin RPC 프록시                                                                                                                                   |
| `vercel.json`                               | 프리뷰 배포 — `main`·`renovate/**` 비활성, `apps/blog`·`packages/@blog` 변경 없으면 `ignoreCommand`로 스킵                                                                                                                           |
| `.github/workflows/deploy-blog.yml`         | CI/CD 배포 워크플로우. PR CI(`ci.yml`)와 `.github/actions/quality-checks` composite action을 공유한다                                                                                                                                |
| `apps/blog/posts/{series}/_series.yml`      | 시리즈 선언 — 이 파일이 있어야 시리즈. 표시명·설명·order 메타도 여기                                                                                                                                                                 |
| `packages/@blog/content`                    | 콘텐츠 프레임워크 패키지 — 스키마·로더·공개 판정·URL 계약·빌드 스크립트·2층 검증. 문 두 개(`@blog/content` + `@blog/content/seo`) + `bin`의 `blog-content`, 소스 익스포트(빌드 스텝 없음). 내부는 `packages/@blog/content/README.md` |
| `…content/src/scripts/build-content.ts`     | predev:web/prebuild 통합 진입점 (validate → sync/sitemap/rss/og-images/thumbnails/search/llms-full/llms 병렬) — 앱 package.json은 `blog-content build`로 부른다                                                                      |
| `…content/src/scripts/cli/`                 | `bin`의 진입점. `index.ts`가 실행, `program.ts`가 commander로 서브커맨드·옵션을 정의하고 단계 모듈을 동적 import한다. 단계나 플래그를 더할 때 고칠 곳                                                                                |
| `…content/src/scripts/check-seo.ts`         | 빌드 산출물 SEO 검사 (CI 게이트). 산출물 레지스트리는 같은 폴더의 `artifacts.ts`                                                                                                                                                     |
| `…content/src/scripts/validate/rules.ts`    | `validate-posts`의 규칙 표(29개, severity·scope·`--strict` 승격 대상 6개). 판정 사슬은 옆의 `frontmatter.ts`·`body.ts`·`corpus.ts`                                                                                                   |
| `…content/src/post/frontmatterSchema.ts`    | frontmatter 서술자 테이블 — 이 파일 위 표와 글자 단위로 대조된다(`frontmatterSchema.test.ts`)                                                                                                                                        |
| `…content/src/shared/contentConfig.ts`      | `defineContent({...})` 설정 표면 — 서버·빌드 전용. 클라이언트가 소비하는 리터럴은 `contentValues.ts`(값-only 모듈, `constants.ts`가 재수출)가 갖고, 설정은 그 값을 기본값으로 소비한다. 절대 경로 해석은 `contentPaths.ts`           |
| `apps/blog/web/README.md`                   | 앱의 코드 배치·레이어·런타임 데이터 흐름·스크립트·env                                                                                                                                                                                |
| `apps/blog/web/design/DIAGRAM_AUTHORING.md` | 다이어그램 저작 가이드 (선언형 태그 prop 표, 복붙 예제, `hero:` 등록법)                                                                                                                                                              |

## Prerequisites

- Node.js / pnpm 버전은 루트 `engines` · `.tool-versions` · `packageManager`가 단일
  출처다. 이 파일에 숫자를 복사해 두지 말 것 — Renovate가 올릴 때마다 어긋난다
- **두 패키지 이상이 쓰는 의존성은 `pnpm-workspace.yaml`의 catalog가 단일 출처다.**
  package.json에는 `catalog:`(기본) 또는 `catalog:lint`(eslint 툴체인 — 코어·플러그인
  버전이 서로 물려 돌아서 소비자가 하나뿐인 플러그인도 여기 둔다)만 적고 숫자는 쓰지
  않는다. 예외는 `peerDependencies` — 핀이 아니라 호환 범위 선언이라 넓게 둔다
- 테스트 러너는 워크스페이스 전부 **Vitest** 하나다. 갈리는 것은 환경뿐이고, 환경이
  둘인 `apps/blog/web`만 `test.projects`로 `node`(domain·lib) / `jsdom`(src)을 나눈다
