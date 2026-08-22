# @blog/content

`apps/blog/web`의 콘텐츠 프레임워크를 떼어 낸 패키지 — 스키마(frontmatter
서술자 테이블) · 로더 · 공개 판정 · 시리즈 선언 · URL 계약 · 빌드 스크립트 ·
2층 검증(`validate-posts`가 원문 / `check-seo`가 산출 HTML).

운영 규칙(발행 판정 축, frontmatter 키 표, `--strict` 승격 규칙, SEO 게이트)의
단일 출처는 루트 `CLAUDE.md`의 "Blog Architecture" 절이다. 여기는 **패키지의
모양**만 적는다.

## 문 두 개 (소스 익스포트 — 빌드 스텝 없음)

| 문                  | 내용                                                                                    |
| :------------------ | :-------------------------------------------------------------------------------------- |
| `@blog/content`     | 프레임워크 전체 — `createContent`(로더 인스턴스 factory)·타입·visibility·urls·순수 유틸 |
| `@blog/content/seo` | SEO 빌더 factory(`createPostSeo`) + 순수 계산 — 프레임워크 중립 DTO(`PostSeoData`) 반환 |

fs를 읽는 API는 전부 **인스턴스**다 — 소비자가 `content.config.mts`로 만든
설정을 `createContent(config)`에 넘겨 로더 묶음(getAllPosts·getPostBySlug·
getSeriesMeta·getAllSeries…)을 받는다. 캐시는 인스턴스 안에 살아서 루트가
다른 인스턴스끼리 섞이지 않는다. zero-arg 전역 로더는 없다.

```mermaid
flowchart LR
  posts(["apps/blog/posts<br/>원고 · Markdown"])
  pkg[["packages/@blog/content"]]
  app(["apps/blog/web<br/>Next.js SSG"])
  posts -->|"gray-matter 로더"| pkg
  pkg -->|"@blog/content<br/>createContent()"| app
  pkg -.->|"@blog/content/seo<br/>createPostSeo()"| app
```

실선은 로더 인스턴스가 나가는 문, 점선은 SEO 빌더가 나가는 문이다.

빌드 스크립트(`src/scripts/`)는 API가 아니라 실행 파일이고, package.json의
`bin`에 걸린 **`blog-content` 하나**로만 나간다. 앱은 서브커맨드 이름만 안다
(`blog-content sitemap`) — 이름과 옵션을 단계 모듈에 잇는 곳은
`src/scripts/cli/program.ts`(commander) 하나뿐이라, 패키지 안에서 파일을 옮겨도
앱은 그대로다. 인자 파싱이 cli 레이어에만 있는 것도 경계다 — 단계 모듈은
commander를 모른 채 **이미 파싱된 값**을 받고, 도메인 규칙(`--scheduled`를 주면
status가 scheduled가 된다 같은)은 파싱이 아니므로 단계 쪽에 남는다.

> 예전에는 앱이 `npx tsx node_modules/@blog/content/src/scripts/…`처럼 **파일
> 경로를 직접** 지목했다. 패키지 내부 배치가 앱 스크립트에 새어 나오는 계약이라
> 파일을 옮기면 앱이 조용히 깨졌고, "직접 실행인가"를 판정하는 가드
> (`cliEntry.ts`)까지 따로 필요했다 — pnpm은 심링크 경로로 부르는데 ESM 로더는
> 모듈을 realpath로 해석해서, 순진한 `import.meta.url === argv[1]` 비교가 **항상
> false**였고 모든 생성기가 무음 no-op이던 사고가 있었다. 진입점이 하나가 되면서
> 가드도, 그 함정도 사라졌다.

**로더 없이 node로 그대로 돈다.** shebang이 `#!/usr/bin/env node`다 — 상대
import가 전부 `.ts` 확장자를 달고 있고(`allowImportingTsExtensions`), 문법은
`erasableSyntaxOnly`로 묶여 있어 node의 type stripping만으로 실행된다. 빌드
산출물도, tsx 같은 별도 로더도 없다. 앱 tsconfig에도 같은 플래그가 켜져 있어야
한다 — 이 소스가 앱 program에 섞이기 때문이다.

## 레이어 (eslint-plugin-boundaries가 강제)

```
shared → content(post) → seo → build(scripts) → render-build(scripts/render) → cli(scripts/cli)
```

| element        | 폴더                 | 가져올 수 있는 것                                                                                           |
| :------------- | :------------------- | :---------------------------------------------------------------------------------------------------------- |
| `shared`       | `src/shared`         | node 코어만                                                                                                 |
| `content`      | `src/post`           | `shared` + node 코어 + `gray-matter`                                                                        |
| `seo`          | `src/seo`            | `shared`·`content` — 순수 계산(node 코어·외부 의존 없음)                                                    |
| `build`        | `src/scripts`        | `shared`·`content`·`seo` + node 코어 + `gray-matter`                                                        |
| `render-build` | `src/scripts/render` | 위 전부 + `react`·`react-dom`·`react-markdown`·`remark-gfm`·`rehype-raw`·`satori`·`sharp`·`@resvg/resvg-js` |

```mermaid
flowchart LR
  L1["shared<br/>node 코어만"]
  L2["content · post<br/>+ gray-matter"]
  L3["seo<br/>순수 계산"]
  L4["build · scripts<br/>+ gray-matter"]
  L5["render-build<br/>react · satori · sharp"]
  L6["cli · scripts/cli<br/>commander 진입점"]
  L1 --> L2 --> L3 --> L4 --> L5
  L4 --> L6
  L5 --> L6
  classDef highlight fill:#0E8FA3,stroke:#0E8FA3,color:#ffffff;
  class L5 highlight;
```

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
├─ shared/     contentConfig(defineContent + ContentValues 계약) · contentPaths(절대 경로)
│              · testValues(테스트 픽스처 — 패키지 안의 유일한 "어떤 사이트")
│              · dates · format · jsonLd · url · postFiles · prismLanguages
│              · markdownHeadings(h1→h2 매핑, 사이트·RSS 공유) · viewCookie
├─ post/       createContent(인스턴스 조립) · repository(gray-matter 로더 factory) · service(읽기 API factory)
│              · visibility(공개 판정 한 곳) · series(_series.yml factory) · urls(postPath·archivePath — 후행 슬래시는 여기서만)
│              · filtering · sorting · aggregate · thumbnail · assetUrl · frontmatterSchema(서술자 테이블)
│              · types · utils · testing(테스트 픽스처 인스턴스)
├─ seo/        postSeo — createPostSeo(buildPostSeo·buildPostJsonLd·buildBreadcrumbJsonLd) + 순수 계산
└─ scripts/    build-content(진입점) · validate-posts + validate/{rules,frontmatter,body,corpus,shared}
               · check-seo · artifacts(산출물 레지스트리 7종) · generate-{sitemap,search-index,llms,llms-full}
               · sync-posts · new-post
               · context(ContentContext — 스텝이 받는 실행 컨텍스트)
               ├─ cli/     index(bin 진입점) · program(commander 서브커맨드·옵션 정의) · discoverConfig(설정 발견·로드)
               └─ render/  generate-rss · feedRenderer · generate-og-images(satori+resvg) · generate-thumbnails(sharp)
```

## `build-content.ts` — 2단계

| 단계             | 스텝                                                                                                  | 비고                                                                                   |
| :--------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------- |
| 1 (게이트, 단독) | `validate-posts`                                                                                      | `--strict`를 그대로 넘긴다. `--skip-validate`로만 건너뛴다(앱 스크립트는 안 넘김)      |
| 2 (병렬 8개)     | `sync-posts` · `sitemap` · `rss` · `og-images` · `thumbnails` · `search-index` · `llms-full` · `llms` | 서로 다른 파일만 쓴다. `media`·`thumbs`·`og` 디렉터리는 겹치면 안 됨(각자 orphan 삭제) |

각 스텝은 `node <cli/index.ts> --config <절대경로> <서브커맨드>`로 spawn되고
cwd·PATH 어디에도 기대지 않는다 — 부모가 발견한 설정 파일을 자식에 명시
전달하므로(`stepArgv`) 부모와 자식이 다른 설정을 잡을 수 없다. 앱의
`predev:web`과 `prebuild`는 같은 명령이고 `prebuild`만 `--strict`다(검증은 둘 다 돈다).

```mermaid
flowchart TD
  gate["1단계 · 게이트<br/>validate-posts<br/>(단독 실행)"]
  subgraph stage2["2단계 · 병렬 8개 — 서로 다른 파일만 쓴다"]
    direction LR
    a["sync-posts"]
    b["sitemap"]
    c["rss"]
    d["og-images"]
    e["thumbnails"]
    f["search-index"]
    g["llms-full"]
    h["llms"]
  end
  gate -->|"통과 (또는 --skip-validate)"| stage2
  classDef gateStyle fill:#0E8FA3,stroke:#0E8FA3,color:#ffffff;
  class gate gateStyle;
```

## `defineContent` (`src/shared/contentConfig.ts`)

서버·빌드 전용 설정 표면. **사이트 고유 값에는 기본값이 없다** —
`root`(경로 앵커)와 같은 이유로, 어떤 기본값이든 특정 사이트의 하드코딩이기
때문이다. 그래서 `root` · `site` · `author` · `timezone` ·
`registries.diagramNames` 가 필수(`ContentValues` 계약)이고, 값 자체는 소비자
앱의 `content.values.mts`(순수 리터럴, 값 import 없음)가 소유한다 — 방향은 항상
`content.values → content.config → @blog/content`.

클라이언트 컴포넌트가 소비하는 값(타임존·다이어그램 이름)도 그 값 모듈에서
직접 가져간다. 해석된 설정 객체를 클라이언트가 import하면 og 팔레트·llms 산문
까지 번들에 실리기 때문이다(defineContent 호출 결과라 번들러가 미사용 필드를
털지 못한다).

나머지 그룹은 기본값이 있고 그룹 단위 shallow-Partial로 병합된다
(`og.palette`와 `llms.facts`만 한 단계 더 병합):

| 그룹         | 키                                                                                                                                                    |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`       | **필수.** 경로 앵커 — `file://` URL(관례: `import.meta.url`) 또는 절대 경로. 상대 경로는 거부(cwd 의존 금지)                                          |
| `site`       | **필수(전체).** `url` · `name` · `description` · `descriptionExpanded` · `ogDefaultImage` · `rssPath` · `aboutPageModified` · `mergedPrCountFallback` |
| `author`     | **필수(전체).** `name` · `alternateName` · `role` · `github` · `linkedin`                                                                             |
| `seo`        | `titleSuffix` · `titleMaxLength`(60) · `descriptionMinLength`(120) · `descriptionMaxLength`(160, 자동 발췌 길이 겸용)                                 |
| `timezone`   | **필수(전체).** `iana` · `isoOffset` · `utcOffsetMs`                                                                                                  |
| `runtime`    | `isDevelopment()` — `NODE_ENV === 'development'` 정확 비교(빌드 스크립트를 dev로 오인하지 않게)                                                       |
| `registries` | `diagramNames`는 **필수**(사이트마다 다른 그림 목록). `supportedFenceLabels` · `seriesColors` · `seriesColorFallback`은 기본값 있음                   |
| `dirs`       | **앱 루트 기준 상대 경로** — `content`(`../posts`) · `public` · `cache` · `out` · `media` · `thumbs` · `og`                                           |
| `sitemap`    | `highPriorityFolders`(0.75) · `highPrioritySlugs`(0.8)                                                                                                |
| `og`         | `width` · `height` · `palette`(satori용 hex — CSS 변수를 못 읽는다)                                                                                   |
| `thumbnails` | `maxWidth` · `webpQuality`                                                                                                                            |
| `llms`       | `summaryMaxLength` · `indexIntro` · `fullIntro` · `facts.*`                                                                                           |

## 경로 앵커 — `content.config.mts`

앵커는 **소비자 앱 루트의 `content.config.(m)ts`** 하나다:

```ts
// apps/blog/web/content.config.mts
import { defineContent } from '@blog/content';
export default defineContent({ root: import.meta.url });
```

`root: import.meta.url`이 계약의 핵심 — **설정 파일의 위치 자체가 앵커**라서
`dirs.*` 상대 경로가 전부 그 디렉터리 기준으로 풀리고, 이 패키지는 모노레포/
폴리레포 구조를 전혀 모른다. 절대 경로 해석은 `resolveContentPaths(config)`
(`src/shared/contentPaths.ts`, 순수 함수)가 한다.

- **CLI**: cwd에서 위로 올라가며 설정 파일을 발견한다(`cli/discoverConfig.ts`).
  전역 `--config <경로>`로 명시할 수 있고(서브커맨드 이름 **앞**에 적는다),
  없으면 해결책을 담은 에러가 실행을 막는다 — 폴백은 없다
- **앱**: `src/content.ts`가 같은 설정 파일을 정적 import해
  `createContent`/`createPostSeo` 인스턴스를 만든다
- 파일명이 `.mts`인 이유: `"type": "module"` 없는 패키지에서 `.ts`는 node가
  CJS로 파싱했다가 ESM으로 재파싱한다(경고 + 오버헤드)

```mermaid
flowchart TD
  cli["CLI · blog-content<br/>cwd에서 위로 walk-up"]
  webapp["src/content.ts<br/>정적 import"]
  cfgfile["content.config.mts<br/>root: import.meta.url"]
  define["defineContent()<br/>shared/contentConfig.ts"]
  inst["createContent(config)<br/>post/createContent.ts"]
  api["ContentApi 인스턴스<br/>getAllPosts · getPostBySlug …"]
  cli -->|"발견"| cfgfile
  webapp -->|"import"| cfgfile
  cfgfile -->|"default export"| define
  define -->|"완전한 ContentConfig"| inst
  inst --> api
  classDef anchor fill:#0E8FA3,stroke:#0E8FA3,color:#ffffff;
  class cfgfile anchor;
```

콘텐츠 원본(`apps/blog/posts`)은 이 패키지로 옮기지 않았다(`dirs.content` 한
줄이므로 필요해질 때 싸게 옮긴다). 실제 코퍼스를 읽는 계약 테스트는
`src/post/testing.ts`의 `testContent`(테스트 픽스처 인스턴스)로 배선한다.

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
