# 🧪 fe-lab

> **공부하고 실험하며 기록하는 프론트엔드 실험실**

프론트엔드 기술을 직접 부딪혀 보고, 실험 결과를 글로 정리해 두는 개인 작업장입니다. Turborepo 기반 모노레포로 운영 중인 기술 블로그(`blog.sangwook.dev`)와, 새 기술/패턴을 시도해 보는 실험용 앱·패키지가 한 저장소 안에 함께 있습니다.

---

## 🎯 이 저장소의 두 가지 목적

| 목적                         | 어디                                                                        | 자세히                                                                                                                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **🚀 운영 중인 기술 블로그** | `apps/blog/posts` → `packages/@blog/content` → `apps/blog/web`              | Markdown 원고를 콘텐츠 프레임워크 패키지가 읽어 Next.js SSG로 굽고, Cloudflare Workers에 배포. 조회수/Admin/Analytics는 Supabase. 콘텐츠 파이프라인이 깨지지 않도록 회귀 테스트로 잠가 둠. |
| **🧪 새 기술/패턴 실험실**   | `apps/{react,next.js,typescript,socket-server}` + `packages/@package/**` 등 | 한 가지 주제에 한 앱을 붙여 두고, 디자인 시스템·번들러·실시간 통신·타입 설계 등을 자유롭게 시도.                                                                                           |

블로그는 실제로 쓰는 자산이라 신중하게, 그 외 워크스페이스는 부담 없이 실험합니다.

---

## 📁 워크스페이스

`pnpm-workspace.yaml`이 `apps/**/*`·`packages/**/*`를 워크스페이스로 잡습니다. 패키지 스코프는 셋 —
`@blog/*`(블로그 전용), `@design-system/*`(디자인 시스템), `@package/*`(범용 실험).

### apps/

| 경로            | 패키지명            | 종류             | 핵심 스택                                                                         | 비고                                                                                                                |
| --------------- | ------------------- | ---------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `blog/web`      | `@blog/web`         | 🚀 블로그 (운영) | Next.js 16 (`output: 'export'`, React Compiler), Panda CSS, Supabase, React Query | SSG + 동적 기능 하이브리드. 콘텐츠 로딩·검증·산출물 생성은 전부 `@blog/content`에 위임. 도메인 `blog.sangwook.dev`. |
| `blog/posts`    | (워크스페이스 아님) | 📝 콘텐츠        | Markdown (`.md`) + `_series.yml`                                                  | 주제별 폴더 구조, frontmatter 기반 메타. **`_series.yml`을 둔 폴더만 시리즈**. MDX 아님.                            |
| `next.js`       | `next.js`           | 🧪 실험          | Next.js 16 (App Router, Turbopack), Vitest + RTL + next-router-mock               | 서버 컴포넌트·에러 바운더리·테스팅 전략.                                                                            |
| `react`         | `react`             | 🧪 실험          | React 19 SPA + Vite 8 + React Router 8 + TanStack Query, Vitest + RTL + MSW       | 라우팅·커스텀 훅·API 모킹·타입 설계 실험(`apps/react/src/pages/typescript-project-design`).                         |
| `typescript`    | `typescript`        | 🧪 실험          | Pure TypeScript + Vitest                                                          | 에러 모델링 등 순수 타입/로직 실험.                                                                                 |
| `socket-server` | `socket-server`     | 🧪 실험          | Node.js + 의존성 0의 순수 TypeScript WebSocket 서버                               | `react` 앱과 짝지어 실시간 통신 실험(`pnpm dev --filter=socket-server --filter=react`). lint/test 스크립트 없음.    |

### packages/

| 패키지명                      | 종류                 | 비고                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@blog/content`               | 📚 콘텐츠 프레임워크 | 블로그의 스키마·로더·공개 판정·URL 계약·빌드 스크립트·2층 검증(`validate-posts` 원문 / `check-seo` 산출 HTML). 문 두 개(`@blog/content`, `@blog/content/seo`) + 빌드 스크립트를 내놓는 `blog-content` bin, **소스 익스포트(빌드 스텝 없음 — node가 `.ts`를 그대로 실행)**. 자세히는 [패키지 README](packages/@blog/content/README.md). |
| `@design-system/ui`           | 🎨 컴포넌트·프리셋   | React 19 컴포넌트 + Panda preset. exports `.` / `./preset` / `./blog-preset`(블로그 토큰의 단일 출처). tsdown 빌드.                                                                                                                                                                                                                    |
| `@design-system/ui-lib`       | 🎨 생성물            | Panda CSS codegen 산출물(css/jsx/patterns/recipes/tokens). **직접 수정 금지.**                                                                                                                                                                                                                                                         |
| `@package/core`               | 🔧 코어              | HTTP 클라이언트, 상태 코드, 에러 타입.                                                                                                                                                                                                                                                                                                 |
| `@package/config`             | 🔧 설정              | 공유 `tsconfig` 베이스 하나. (ESLint 설정은 워크스페이스마다 flat config를 따로 가진다.)                                                                                                                                                                                                                                               |
| `@package/bundler`            | 🧪 번들러            | Acorn + magic-string 기반 미니 번들러(`minibundler`) — [번들러 시리즈](apps/blog/posts/bundler) 자료.                                                                                                                                                                                                                                  |
| `@package/bundler-playground` | 🧪 실험 앱           | bundler 결과 검증용.                                                                                                                                                                                                                                                                                                                   |
| `@package/sample-lib`         | 🧪 라이브러리 빌드   | minibundler로 패키지 배포 패턴 학습.                                                                                                                                                                                                                                                                                                   |

---

## 🏗️ 블로그 아키텍처 한눈에

```
apps/blog/posts/**/*.md ─┐
apps/blog/posts/**/_series.yml ─┤
                                ▼
            packages/@blog/content            (shared → post → seo → scripts → scripts/render → scripts/cli)
            ├─ 로더·공개 판정·시리즈·URL 계약  ─▶  apps/blog/web  (src/shared → src/lib/platform
            │                                 ─▶   → src/domain/{analytics,auth} → app 레이어)
            ├─ SEO 빌더 (@blog/content/seo)    ─▶     ├─ next build (output: 'export')  ─▶  out/  ─▶  Cloudflare Workers
            └─ 빌드 스크립트 (build-content)   ─▶     │     ├─ check-seo    (산출 HTML 게이트)
                 validate-posts 게이트 → 병렬 8개     │     └─ check-bundle (JS 청크 누수 게이트)
                 (sync·sitemap·rss·og-images·          └─ 런타임: Supabase (조회수·Admin·Analytics), Giscus, GA4/GTM
                  thumbnails·search-index·llms-full·llms)
```

- **레이어 경계는 컨벤션이 아니라 lint다.** 두 워크스페이스 모두 `eslint-plugin-boundaries`가 폴더 단위 element로
  의존 방향을 강제한다 — 앱은 `src/shared`(최하단, 라우트 경로·전환 네임스페이스) → `src/lib/platform`(Supabase
  어댑터) → `src/domain/{analytics,auth}` → app 레이어(`src`의 나머지), 패키지는
  `shared → post → seo → scripts → scripts/render → scripts/cli`. 앱 레이어는 platform을 직접 import할 수 없다.
  콘텐츠 원본(`apps/blog/posts`)은 패키지로 옮기지 않았다 — 위치는 앱 루트 `content.config.mts`(경로 앵커,
  `defineContent({ root: import.meta.url })`)의 설정 한 줄이다.
- **검증은 두 층 + 번들 게이트.** `validate-posts`가 frontmatter 원문을, `check-seo`가 최종 HTML을,
  `check-bundle`이 공개 페이지 JS 청크의 admin·서버 전용 코드 누수를 본다. 셋 다
  `pnpm build`(prebuild → next build → check-seo → check-bundle) 안에 있어 로컬·PR·배포가 같은 검사를 지난다.
- 자세한 구조·스크립트·데이터 흐름은 [`apps/blog/web/README.md`](apps/blog/web/README.md), 운영 규칙과 콘텐츠 계약은 [`CLAUDE.md`](CLAUDE.md)의 "Blog Architecture" 절.

---

## 🛠️ 도구 체인

| 도구                       | 용도                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Turborepo**              | 빌드/테스트 파이프라인 오케스트레이션(`turbo.json`). `apps/blog/posts/**`를 입력에 추가하는 override가 둘 — 웹은 build·test, 콘텐츠 패키지는 test(빌드 스텝이 없다).                                                              |
| **pnpm (catalog)**         | 패키지 관리 + 기본 `catalog:` 하나로 `typescript`·`next`·`react`·`@types/*`·`@pandacss/dev` 버전 통일. `overrides`(postcss 단일화)·`allowBuilds`(네이티브 postinstall 허용 목록)도 여기.                                          |
| **Lefthook**               | Git hook — pre-commit에 staged 파일 prettier(`apps/blog/posts/**` 제외), pre-push에 lint/check-types/test 병렬. 우회는 `LEFTHOOK=0` 또는 `--no-verify`.                                                                           |
| **Prettier 3 / ESLint 10** | 포매팅 + 린트. flat config는 워크스페이스마다 따로다. 블로그와 `@blog/content`는 `eslint-config-next` 없이 직접 조립하고(`apps/next.js`는 계속 사용) typescript-eslint strict + 타입 정보 룰 + `eslint-plugin-boundaries`를 켠다. |
| **Panda CSS**              | 컴포넌트 레시피 기반 스타일링. 블로그는 `@design-system/ui/blog-preset` 토큰을 쓰고 `strictTokens: true`.                                                                                                                         |
| **Renovate**               | 의존성 자동 업데이트(루트 `renovate.json`). automerge는 devDependencies minor/patch · 프로덕션 patch · catalog/overrides minor/patch까지 — 프로덕션 minor와 major는 사람이 본다.                                                  |
| **GitHub Actions**         | 아래 "CI / 자동화" 참조.                                                                                                                                                                                                          |

---

## ✅ 테스트 / 검증 전략

- **블로그 회귀 가드** — `packages/@blog/content`의 `src/post/contract.test.ts`·`src/scripts/contract.test.ts`·`src/scripts/url-consistency.test.ts`·`src/scripts/generate-*.test.ts`가 실제 `apps/blog/posts/` 디렉토리와 빌드 산출물(sitemap·RSS·search-index·llms·llms-full·OG)의 불변식을 잠금. 리팩토링/리디자인 시 안전망.
- **테스트 러너**:

  **러너는 모든 워크스페이스에서 Vitest 하나다.** 갈리는 것은 러너가 아니라 **환경**이고, 환경이 둘인 곳은 `test.projects`로 나눈다.

  | 워크스페이스    | 환경                                                                                          |
  | --------------- | --------------------------------------------------------------------------------------------- |
  | `@blog/content` | node (`src/**/*.test.ts`)                                                                     |
  | `@blog/web`     | projects 둘 — `node`(`domain/**`·`lib/**`) + `jsdom`(`src/**`, RTL). `pnpm test` 한 번에 실행 |
  | `next.js`       | jsdom + RTL + next-router-mock (`test:watch` 있음)                                            |
  | `react`         | jsdom + RTL + MSW                                                                             |
  | `typescript`    | node                                                                                          |

  예전에는 `@blog/content`와 `@blog/web`의 순수 로직이 `node --test`(+`node:assert/strict`)로 돌았다. 러너가 갈리면 단언 API·커버리지 도구·ESLint 인가가 두 벌이 되고, `node --test '<glob>'`은 **매치가 0개여도 exit 0**이라 테스트가 조용히 사라질 수 있었다. Vitest는 매치 0개면 실패한다.

- **CI**(`.github/actions/quality-checks` 공용 composite action): ① `pnpm turbo run lint check-types test` ② `pnpm --filter @blog/web lint:posts` ③ `pnpm format:check` ④ `pnpm build --filter=@blog/web`(prebuild → next build → check-seo → check-bundle). PR CI와 배포 워크플로가 같은 액션을 부른다.
- **pre-push hook**: 푸시 전 워크스페이스 전체 lint·types·test (turbo 캐시로 보통 < 5초).

---

## 🚀 시작하기

```bash
# 의존성 설치 (prepare 스크립트가 lefthook hook 자동 등록)
pnpm install

# 글쓰기 (이 저장소의 목적 — 루트 진입로 둘)
pnpm new-post "제목"              # 새 포스트 스캐폴딩
pnpm blog-write                   # 글 미리보기 — 콘텐츠 빌드 후 next dev만, Supabase(Docker) 없음

# 개발 서버 — 앱별 별칭은 없다. turbo 동사 + --filter 패턴 하나뿐:
pnpm dev --filter=@blog/web       # 블로그 풀스택 (로컬 Supabase를 먼저 띄운다)
pnpm dev --filter=react           # 실험 앱 (react / next.js / typescript / socket-server 동일)
pnpm dev --filter=socket-server --filter=react   # 짝지어 실행 (turbo가 병렬로 띄운다)

# 검증
pnpm lint             # 전체 ESLint
pnpm check-types      # 전체 tsc --noEmit
pnpm test             # 전체 테스트
pnpm format:check     # Prettier check (pnpm format = write)

# 빌드
pnpm build                        # 전체
pnpm build --filter=@blog/web     # 블로그만 (prebuild → next build → check-seo → check-bundle) — CI와 같은 형태

# 정리
pnpm clean            # dist/.next/out/.turbo + node_modules 제거 (clean:dist / clean:modules 따로도 가능)
```

### 블로그 글쓰기

```bash
# new-post·blog-write는 루트에서 바로 된다. 나머지는 apps/blog/web에서.
pnpm new-post "글 제목" --series bundler --tags a,b   # 새 포스트 스캐폴딩 (루트 OK)
pnpm blog-write                                     # 글 미리보기 — Supabase(Docker) 없이 next dev만 (루트 OK)
pnpm new-post "예약글" --scheduled "2026-05-01T09:00+09:00"
pnpm lint:posts                                     # frontmatter·본문 검증 (경고 수준)
pnpm check-seo                                      # 빌드 산출물(out/) SEO 검사 — pnpm build 안의 게이트
```

---

## 🌐 외부 서비스 & 배포

| 서비스                     | 역할                                                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers**     | 블로그 정적 호스팅(`apps/blog/web/wrangler.jsonc`) — `main` push(`apps/blog/**`·`packages/@blog/**` 변경 시) + 매일 KST 09:00 cron(예약 발행) + 수동 실행(`workflow_dispatch`). apex 리다이렉트는 별도 Worker(`apps/blog/redirect`) |
| **Supabase Cloud**         | 블로그 조회수·Admin 인증(Google OAuth)·Analytics RPC. 로컬은 `supabase start`(Docker)                                                                                                                                               |
| **Google Analytics / GTM** | GA4(`G-ZS9ENFSSQ0`) + GTM(`GTM-5SMPQ23P`), 둘 다 `@next/third-parties`로 로드. GTM 컨테이너 내용은 저장소 밖(웹 콘솔)                                                                                                               |
| **Giscus**                 | 댓글 (GitHub Discussions 기반)                                                                                                                                                                                                      |
| **Vercel Preview**         | 블로그 PR 미리보기 — `main`·`renovate/**` 브랜치 제외, `apps/blog`·`packages/@blog` 변경이 없으면 `ignoreCommand`로 스킵(`apps/blog/web/vercel.json`)                                                                               |

### CI / 자동화 (`.github/workflows/`)

| 워크플로                    | 트리거                                                | 하는 일                                                                         |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `ci.yml`                    | `pull_request`, `push: main`                          | quality-checks 4단계 + Next 빌드 캐시 복원                                      |
| `deploy-blog.yml`           | `push: main`(블로그 경로), cron `0 0 * * *`, dispatch | quality-checks → 시크릿 주입 빌드 → `/posts/` 프리렌더 링크 검증 → Workers 배포 |
| `deploy-redirect.yml`       | `push: main`(`apps/blog/redirect/**`), dispatch       | 리다이렉트 규칙 테스트 → apex Worker 배포                                       |
| `claude.yml`                | `@claude` 멘션 · 라벨                                 | 온디맨드 Claude Code 에이전트                                                   |
| `claude-code-review.yml`    | PR opened/synchronize                                 | PR 자동 코드 리뷰                                                               |
| `claude-deps-audit.yml`     | 매주 월 cron                                          | 죽은 `pnpm overrides` 정리 + `pnpm audit` 후속 PR                               |
| `claude-link-rot.yml`       | 매월 1일 cron                                         | 발행 글 외부 링크 검사 → 교체 PR                                                |
| `claude-post-inventory.yml` | `deploy-blog.yml` 완료 시(workflow_run), dispatch     | draft/scheduled 글 현황 이슈 갱신                                               |
| `claude-site-smoke.yml`     | 매일 cron                                             | 배포된 HTML/sitemap/rss 스모크 검사                                             |

---

## ⚙️ 환경 요구사항

버전의 단일 출처는 파일이다 — 여기 숫자를 복사해 두지 않는다(Renovate가 올릴 때마다 어긋난다).

- **Node.js**: 루트 `package.json`의 `engines.node` / `.tool-versions` (2026-08 기준 Node 24 계열)
- **pnpm**: 루트 `package.json`의 `packageManager` / `.tool-versions` (pnpm 11 계열)
- **TypeScript**: `pnpm-workspace.yaml` catalog (TypeScript 6 계열 — TS5 의미론을 가정하지 말 것)

---

## 📖 이 저장소를 활용하는 법

1. **글로 정리하기** — 새 기술을 실험해 본 결과는 `apps/blog/posts/` 안에 마크다운으로 정리. 주제 단위로 폴더를 나누고, 이어서 읽는 글이면 그 폴더에 `_series.yml`을 두어 시리즈로 선언합니다.
2. **실험 앱 추가하기** — 새 주제는 `apps/<name>` 하위에 워크스페이스를 만들고 디자인 시스템(`@design-system/ui`)을 의존성으로 가져와 시작합니다.
3. **공유 가치가 생기면 패키지로** — 여러 앱이 공유할 만한 로직은 `packages/@package/<name>`으로, 특정 앱의 프레임워크 층이 자립하면 그 앱의 스코프(`packages/@blog/<name>`처럼)로 옮겨 catalog/workspace 프로토콜로 의존하게 합니다. 옮기기 전에 `eslint-plugin-boundaries`로 자립성을 먼저 증명하면 이사는 `git mv`가 됩니다.

---

> "프로덕션과 실험을 한 저장소 안에서 함께 굴리는 작업장."
