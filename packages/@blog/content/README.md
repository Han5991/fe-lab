# @blog/content

`apps/blog/web`의 콘텐츠 프레임워크를 떼어 낸 패키지 — 스키마(frontmatter
서술자 테이블) · 로더 · 공개 판정 · 시리즈 선언 · URL 계약 · 빌드 스크립트 ·
2층 검증(`validate-posts`가 원문 / `check-seo`가 산출 HTML).

운영 규칙(발행 판정 축, frontmatter 키 표, `--strict` 승격 규칙, SEO 게이트)의
단일 출처는 루트 `CLAUDE.md`의 "Blog Architecture" 절이다. 여기는 **패키지의
모양**만 적는다.

## 문 두 개 (소스 익스포트 — 빌드 스텝 없음)

| 문                  | 내용                                                                  |
| :------------------ | :-------------------------------------------------------------------- |
| `@blog/content`     | 프레임워크 전체 — 타입·visibility·urls·series·로더·shared 유틸        |
| `@blog/content/seo` | SEO 빌더(`buildPostSeo` 등) — 프레임워크 중립 DTO(`PostSeoData`) 반환 |

빌드 스크립트(`src/scripts/`)는 API가 아니라 실행 파일이다 — 앱 package.json이
`npx tsx node_modules/@blog/content/src/scripts/…` 파일 경로로 직접 돌린다.
그래서 CLI 진입 가드는 `src/scripts/cliEntry.ts`의 `isCliEntry`(양쪽을 realpath로
정규화해 비교)를 쓴다 — 예전의 `import.meta.url === pathToFileURL(process.argv[1]).href`는
argv[1]이 pnpm 심링크 경로인데 ESM 로더는 모듈을 realpath로 해석해 **항상 false**였고,
모든 생성기·CLI가 무음 no-op이었다.

## 레이어 (eslint-plugin-boundaries가 강제)

```
shared → content(post) → seo → build(scripts) → render-build(scripts/render)
```

| element        | 폴더                 | 가져올 수 있는 것                                                                                           |
| :------------- | :------------------- | :---------------------------------------------------------------------------------------------------------- |
| `shared`       | `src/shared`         | node 코어만                                                                                                 |
| `content`      | `src/post`           | `shared` + node 코어 + `gray-matter`                                                                        |
| `seo`          | `src/seo`            | `shared`·`content` — 순수 계산(node 코어·외부 의존 없음)                                                    |
| `build`        | `src/scripts`        | `shared`·`content`·`seo` + node 코어 + `gray-matter`                                                        |
| `render-build` | `src/scripts/render` | 위 전부 + `react`·`react-dom`·`react-markdown`·`remark-gfm`·`rehype-raw`·`satori`·`sharp`·`@resvg/resvg-js` |

- React 스택은 `render-build`만 만질 수 있다. RSS 전문 HTML도 `generate-rss.ts`(순수
  문자열 빌더)가 `render/feedRenderer.ts`를 **주입받아** 쓴다 — 빌더를 import해도
  React가 딸려오지 않는다.
- boundaries 블록은 `src/{shared,post,seo,scripts}/**`에만 건다. 최상위 배럴
  `src/index.ts`만 그 스코프 밖이고(`src/seo/index.ts`는 `seo` element 안에서 검사된다),
  새 파일을 `src/` 바로 아래 두면 경계 검사를 아예 받지 않으니 네 폴더 중 한 곳에 둘 것.
  프로덕션은 테스트를 import 못 한다.
- 앱(`apps/blog/web`)의 eslint 설정과 **같은 엄격 수준**을 유지해야 한다 — 소스
  익스포트라 이 패키지 파일이 앱 program에 소스째 섞이기 때문. `lint`는 양쪽 다
  `--max-warnings=0`이고, `noInlineConfig` +
  `@eslint-community/eslint-comments/no-use`로 인라인 `eslint-disable` 주석이 금지다
  — 예외는 이 설정 파일에 `files` 스코프로 적는다.

## 디렉터리

```
src/
├─ index.ts · seo/index.ts        익스포트 문 둘 (내부 배럴 post/index.ts는 별개)
├─ shared/     contentConfig(defineContent) · contentValues(클라이언트 안전 리터럴) · constants(façade)
│              · contentPaths(절대 경로) · dates · format · jsonLd · url · postFiles · prismLanguages
│              · markdownHeadings(h1→h2 매핑, 사이트·RSS 공유) · viewCookie
├─ post/       repository(gray-matter 로더) · service(읽기 API) · visibility(공개 판정 한 곳)
│              · series(_series.yml) · urls(postPath·archivePath — 후행 슬래시는 여기서만) · filtering
│              · sorting · aggregate · thumbnail · assetUrl · frontmatterSchema(서술자 테이블) · diagramNames · types · utils
├─ seo/        postSeo — buildPostSeo · buildPostJsonLd · buildBreadcrumbJsonLd
└─ scripts/    build-content(진입점) · validate-posts + validate/{rules,frontmatter,body,corpus,shared}
               · check-seo · artifacts(산출물 레지스트리 7종) · generate-{sitemap,search-index,llms,llms-full}
               · sync-posts.mjs · new-post · cliEntry
               └─ render/  generate-rss · feedRenderer · generate-og-images(satori+resvg) · generate-thumbnails(sharp)
```

## `build-content.ts` — 2단계

| 단계             | 스텝                                                                                                  | 비고                                                                                   |
| :--------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| 1 (게이트, 단독) | `validate-posts`                                                                                      | `--strict`를 그대로 넘긴다. `--skip-validate`로만 건너뛴다(앱 스크립트는 안 넘김)      |
| 2 (병렬 8개)     | `sync-posts` · `sitemap` · `rss` · `og-images` · `thumbnails` · `search-index` · `llms-full` · `llms` | 서로 다른 파일만 쓴다. `media`·`thumbs`·`og` 디렉터리는 겹치면 안 됨(각자 orphan 삭제) |

각 스텝은 `npx tsx <절대 경로>`로 spawn되고 cwd에 기대지 않는다 — 경로는 전부
`contentPaths`로 푼다. 앱의 `predev:web`과 `prebuild`는 같은 명령이고 `prebuild`만
`--strict`다(검증은 둘 다 돈다).

## `defineContent` (`src/shared/contentConfig.ts`)

서버·빌드 전용 설정 표면. 클라이언트가 소비하는 리터럴은 `contentValues.ts`(값-only,
import 없음)가 갖고, 설정은 그 값을 기본값으로 소비한다 — 방향은 항상
`contentConfig → contentValues`. 옵션 그룹(그룹 단위 shallow-Partial 병합 —
`og.palette`와 `llms.facts`만 한 단계 더 병합):

| 그룹         | 키                                                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `site`       | `url` · `name` · `description` · `descriptionExpanded` · `ogDefaultImage` · `rssPath` · `aboutPageModified` · `mergedPrCountFallback` |
| `author`     | `name` · `alternateName` · `role` · `github` · `linkedin`                                                                             |
| `seo`        | `titleSuffix` · `titleMaxLength`(60) · `descriptionMinLength`(120) · `descriptionMaxLength`(160, 자동 발췌 길이 겸용)                 |
| `timezone`   | `iana` · `isoOffset` · `utcOffsetMs`                                                                                                  |
| `runtime`    | `isDevelopment()` — `NODE_ENV === 'development'` 정확 비교(tsx로 도는 생성기를 dev로 오인하지 않게)                                   |
| `registries` | `diagramNames` · `supportedFenceLabels` · `seriesColors` · `seriesColorFallback`                                                      |
| `dirs`       | **앱 루트 기준 상대 경로** — `content`(`../posts`) · `public` · `cache` · `out` · `media` · `thumbs` · `og` · `ogFonts`               |
| `sitemap`    | `highPriorityFolders`(0.75) · `highPrioritySlugs`(0.8)                                                                                |
| `og`         | `width` · `height` · `palette`(satori용 hex — CSS 변수를 못 읽는다)                                                                   |
| `thumbnails` | `maxWidth` · `webpQuality`                                                                                                            |
| `llms`       | `summaryMaxLength` · `indexIntro` · `fullIntro` · `facts.*`                                                                           |

## 경로 앵커

`dirs.*` 설정은 **앱 루트(apps/blog/web) 기준 상대 경로**다. 절대 경로 해석은
`src/shared/contentPaths.ts`가 자기 위치에서 워크스페이스 루트로 올라가 앱
루트를 계산한다 — cwd 무관. 콘텐츠 원본(`apps/blog/posts`)은 이 패키지로
옮기지 않았다(설정 한 줄이므로 필요해질 때 싸게 옮긴다).

## 검증

```sh
pnpm --filter @blog/content check-types   # tsconfig.json + tsconfig.test.json
pnpm --filter @blog/content lint          # --max-warnings=0
pnpm --filter @blog/content test          # vitest run (node 환경, src/**/*.test.ts)
pnpm --filter @blog/content test:coverage # 같은 스위트 + v8 커버리지
```

계약 테스트가 실제 원고·산출물을 잠근다:

- `src/post/contract.test.ts` — 실제 `apps/blog/posts/`에 대한 불변식(slug 유일, `getAllPosts` ↔ `isPostVisible` 일치, `_series.yml` 폴더만 시리즈 …)
- `src/scripts/contract.test.ts` — 산출물 불변식(sitemap·rss·search-index·admin-index·llms-full의 포함/제외 규칙)
- `src/scripts/url-consistency.test.ts` — 비ASCII slug가 sitemap·rss·llms·llms-full·페이지 링크 다섯 곳에서 같은 인코딩인지
- `src/post/frontmatterSchema.test.ts` — 루트 `CLAUDE.md`의 frontmatter 표를 **글자 단위**로 서술자 테이블과 대조한다. 표의 `**Frontmatter 전체 목록**` 마커와 뒤따르는 `` `series`는 frontmatter가 아니라 `` 문장 사이만 읽으므로 둘 다 살아 있어야 하고, 키 순서·필수 ✅·설명 문구를 고치면 `frontmatterSchema.ts`의 `doc`도 함께 고칠 것

이 패키지의 테스트는 전부 node 환경이라 `vitest.config.mts`를 프로젝트로 나누지
않는다(앱은 `src/`가 jsdom을 요구해 갈린다). `include` 글롭은 `tsconfig.test.json`·
`eslint.config.mjs`의 테스트 블록과 **대칭**이므로 한쪽을 고치면 셋을 함께 고칠 것.
