# 🧪 fe-lab

> **공부하고 실험하며 기록하는 프론트엔드 실험실**

프론트엔드 기술을 직접 부딪혀 보고, 실험 결과를 글로 정리해 두는 개인 작업장입니다. Turborepo 기반 모노레포로 운영 중인 기술 블로그(`blog.sangwook.dev`)와, 새 기술/패턴을 시도해 보는 실험용 앱·패키지가 한 저장소 안에 함께 있습니다.

---

## 🎯 이 저장소의 두 가지 목적

| 목적                         | 어디                                                            | 자세히                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **🚀 운영 중인 기술 블로그** | `apps/blog/web` + `apps/blog/posts`                             | Next.js SSG → GitHub Pages 배포, Supabase로 조회수/Admin/Analytics 처리. 콘텐츠 파이프라인이 깨지지 않도록 회귀 테스트로 잠가 둠. |
| **🧪 새 기술/패턴 실험실**   | `apps/{react,next.js,typescript,socket-server}` + `packages/**` | 한 가지 주제에 한 앱을 붙여 두고, 디자인 시스템·번들러·실시간 통신·타입 설계 등을 자유롭게 시도.                                  |

블로그는 실제로 쓰는 자산이라 신중하게, 그 외 워크스페이스는 부담 없이 실험합니다.

---

## 📁 워크스페이스

### apps/

| 이름            | 종류             | 핵심 스택                                         | 비고                                                                       |
| --------------- | ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| `blog/web`      | 🚀 블로그 (운영) | Next.js 16, MDX, Panda CSS, Supabase, React Query | SSG + 동적 기능 하이브리드. 도메인 `blog.sangwook.dev`.                    |
| `blog/posts`    | 📝 콘텐츠        | Markdown / MDX                                    | 주제별 폴더 구조, frontmatter 기반 메타. `_series.yml`을 둔 폴더만 시리즈. |
| `next.js`       | 🧪 실험          | Next.js 16 (App Router, Turbopack), Jest          | 서버 컴포넌트·에러 바운더리·테스팅 전략.                                   |
| `react`         | 🧪 실험          | React 19 SPA + Vite + Vitest + MSW                | React Router·커스텀 훅·API 모킹.                                           |
| `typescript`    | 🧪 실험          | Pure TypeScript + Jest                            | 도메인 모델링·타입 설계 패턴.                                              |
| `socket-server` | 🧪 실험          | Node.js + 순수 TypeScript WebSocket               | `react` 앱과 짝지어 실시간 통신 실험.                                      |

### packages/

| 이름                          | 종류               | 비고                                                                                        |
| ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| `@design-system/ui`           | 🎨 컴포넌트        | React 19 + Panda CSS. `preset` / `blog-preset` export.                                      |
| `@design-system/ui-lib`       | 🎨 토큰·유틸       | Panda CSS가 생성한 스타일 자산.                                                             |
| `@package/core`               | 🔧 코어            | HTTP 클라이언트, 상태 코드 등.                                                              |
| `@package/config`             | 🔧 설정            | 공유 `tsconfig` 베이스.                                                                     |
| `@package/bundler`            | 🧪 번들러          | Acorn + magic-string 기반 미니 번들러 구현 — [번들러 시리즈](apps/blog/posts/bundler) 자료. |
| `@package/bundler-playground` | 🧪 실험 앱         | bundler 결과 검증용.                                                                        |
| `@package/sample-lib`         | 🧪 라이브러리 빌드 | minibundler로 패키지 배포 패턴 학습.                                                        |

---

## 🛠️ 도구 체인

| 도구                      | 용도                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Turborepo**             | 빌드/테스트 파이프라인 오케스트레이션 (`turbo.json`). `apps/blog/web/turbo.json`은 블로그 전용 task override. |
| **pnpm (catalog)**        | 패키지 관리 + `catalog:react19` / `catalog:typescript5` 등으로 버전 통일.                                     |
| **Lefthook**              | Git hook 관리 — pre-commit에 prettier, pre-push에 lint/types/test. 우회는 `LEFTHOOK=0` 또는 `--no-verify`.    |
| **Prettier 3 / ESLint 9** | 포매팅 + 린트. ESLint는 플랫 설정.                                                                            |
| **Panda CSS**             | 컴포넌트 레시피 기반 스타일링. 디자인 시스템과 블로그가 공유.                                                 |
| **Renovate**              | 의존성 자동 업데이트 (`.github/renovate.json`).                                                               |
| **GitHub Actions**        | CI(`ci.yml`)와 블로그 배포(`deploy-blog.yml`) 자동화.                                                         |

---

## ✅ 테스트 / 검증 전략

- **블로그 회귀 가드** — `packages/@blog/content`의 `src/post/contract.test.ts` + `src/scripts/generate-*.test.ts`가 실제 `apps/blog/posts/` 디렉토리와 빌드 산출물(sitemap·RSS·search-index·llms-full) 불변식을 잠금. 리팩토링/리디자인 시 안전망.
- **테스트 러너**: 블로그는 `node:test` (Node 22.5+ glob), React는 Vitest + RTL + MSW, Next.js는 Jest + next-router-mock, TypeScript는 Jest.
- **CI**: `pnpm lint` / `check-types` / `test` 병렬 실행 + `pnpm --filter @blog/web lint:posts`로 frontmatter 무결성 확인.
- **pre-push hook**: 푸시 전 워크스페이스 전체 lint·types·test (turbo 캐시로 보통 < 5초).

---

## 🚀 시작하기

```bash
# 의존성 설치 (postinstall이 lefthook hook 자동 등록)
pnpm install

# 개발 서버
pnpm dev              # 전체
pnpm blog-web         # 블로그
pnpm react            # React 실험 + 디자인 시스템
pnpm next             # Next.js 실험 + 디자인 시스템
pnpm typescript       # TypeScript 실험

# 검증
pnpm lint             # 전체 ESLint
pnpm check-types      # 전체 tsc --noEmit
pnpm test             # 전체 테스트
pnpm format:check     # Prettier check

# 빌드
pnpm build            # 전체
pnpm blog-build       # 블로그만
```

### 블로그 글쓰기

```bash
# apps/blog/web 디렉토리에서
pnpm new-post "글 제목" --series bundler --tags a,b   # 새 포스트 스캐폴딩
pnpm new-post "예약글" --scheduled "2026-05-01T09:00+09:00"
pnpm lint:posts                                     # frontmatter 검증
```

---

## 🌐 외부 서비스 & 배포

| 서비스                     | 역할                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| **GitHub Pages**           | 블로그 정적 호스팅 — `main` 브랜치 `apps/blog/**` 변경 시 자동 배포 + KST 09:00 cron(예약 발행) |
| **Supabase Cloud**         | 블로그 조회수·Admin 인증(Google OAuth)·Analytics RPC                                            |
| **Google Analytics (GA4)** | 블로그 트래픽 분석 (`@next/third-parties`)                                                      |
| **Giscus**                 | 댓글 (GitHub Discussions 기반)                                                                  |
| **Vercel Preview**         | PR 미리보기 빌드                                                                                |

---

## ⚙️ 환경 요구사항

- **Node.js**: `>= 22` (`.tool-versions`는 24.6.0 권장 — `node:test`의 glob 지원이 22.5+부터)
- **pnpm**: `10.10.0` (`package.json`의 `packageManager`로 고정)
- **TypeScript**: `5.8.3` (pnpm catalog로 통일)

---

## 📖 이 저장소를 활용하는 법

1. **글로 정리하기** — 새 기술을 실험해 본 결과는 `apps/blog/posts/` 안에 마크다운으로 정리. 주제 단위로 폴더를 나누고, 이어서 읽는 글이면 그 폴더에 `_series.yml`을 두어 시리즈로 선언합니다.
2. **실험 앱 추가하기** — 새 주제는 `apps/<name>` 하위에 워크스페이스를 만들고 디자인 시스템(`@design-system/ui`)을 의존성으로 가져와 시작합니다.
3. **공유 가치가 생기면 패키지로** — 여러 앱이 공유할 만한 로직은 `packages/@package/<name>`으로 옮겨 catalog/workspace 프로토콜로 의존하게 합니다.

---

> "프로덕션과 실험을 한 저장소 안에서 함께 굴리는 작업장."
