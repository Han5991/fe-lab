# @blog/content

`apps/blog/web`의 콘텐츠 프레임워크를 떼어 낸 패키지 — 스키마(frontmatter
서술자 테이블) · 로더 · 공개 판정 · 시리즈 선언 · URL 계약 · 빌드 스크립트 ·
2층 검증(`validate-posts`가 원문 / `check-seo`가 산출 HTML).

## 문 두 개 (소스 익스포트 — 빌드 스텝 없음)

| 문                  | 내용                                                                  |
| :------------------ | :-------------------------------------------------------------------- |
| `@blog/content`     | 프레임워크 전체 — 타입·visibility·urls·series·로더·shared 유틸        |
| `@blog/content/seo` | SEO 빌더(`buildPostSeo` 등) — 프레임워크 중립 DTO(`PostSeoData`) 반환 |

빌드 스크립트(`src/scripts/`)는 API가 아니라 실행 파일이다 — 앱 package.json이
`npx tsx node_modules/@blog/content/src/scripts/…` 파일 경로로 직접 돌린다.

## 레이어 (eslint-plugin-boundaries가 강제)

```
shared → content(post) → seo → build(scripts) → render-build(scripts/render)
```

- `shared`: node 코어만. `content`: + gray-matter. `seo`: 순수 계산.
- React 스택(react-markdown·satori·sharp·resvg)은 `render-build`만 만질 수 있다.

## 경로 앵커

`dirs.*` 설정은 **앱 루트(apps/blog/web) 기준 상대 경로**다. 절대 경로 해석은
`src/shared/contentPaths.ts`가 자기 위치에서 워크스페이스 루트로 올라가 앱
루트를 계산한다 — cwd 무관. 콘텐츠 원본(`apps/blog/posts`)은 이 패키지로
옮기지 않았다(설정 한 줄이므로 필요해질 때 싸게 옮긴다).

## 검증

```sh
pnpm --filter @blog/content check-types   # tsconfig.json + tsconfig.test.json
pnpm --filter @blog/content lint          # --max-warnings=0
pnpm --filter @blog/content test          # node --test (src/**/*.test.ts)
```

주의: `node --test`는 글롭 매칭이 0개여도 exit 0이다. 테스트 파일을 옮기거나
글롭을 고칠 때는 **실행된 테스트 개수**를 눈으로 확인할 것.
