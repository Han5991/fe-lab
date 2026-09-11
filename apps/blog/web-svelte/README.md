# @blog/web-svelte

`apps/blog/web`(Next.js + React)과 **같은 사이트를 SvelteKit으로 병행 재구현**하는
워크스페이스. 운영 블로그를 대체하지 않는다 — 나란히 두고 재기 위한 것이다.

전체 계획과 결정 원장은 [이슈 #392](https://github.com/Han5991/fe-lab/issues/392).

## 지금 있는 것

- SvelteKit + `adapter-static` 정적 export (`build/`) — **49 페이지**
- 공개 라우트 5개: `/` · `/posts/` · `/posts/[...slug]/` · `/series/` · `/about/` · `/privacy/`
- 마크다운 렌더 — remark/rehype를 **빌드 타임에** 돌려 HTML 문자열까지 서버에서 만든다
- 커스텀 태그 9종 — `callout`·`file-tree`·`figure`·`dialogue`/`msg`·
  `metrics`/`metric`·`timeline`/`step`. HAST를 다시 쓰는 방식이라 **클라이언트 JS 0**
- Vitest(node) — 변환 계층 계약 테스트 34개
- **`check-bundle`도 `pnpm build` 안의 게이트다** — 규칙 2개
- Panda CSS — React 판과 **같은 프리셋**(`@design-system/ui/blog-preset`), `strictTokens`
- 사이트 값은 `@blog/site-values` (React 판과 공유)
- ESLint — `--max-warnings=0`, 인라인 `eslint-disable` 금지, 타입 정보 룰
- **`check-seo`가 `pnpm build` 안의 게이트다** — React 판과 같은 자리

아직 없는 것: `code-tabs`(상호작용)·`diagram` 계열 3종(배치 계산) — 지우지 않고
통과시키므로 내용은 보이되 스타일이 없다. 그리고 코드 블록 테마·Mermaid·이미지
줌, 런타임 기능(조회수·댓글·검색·테마·전환), Admin, `check-bundle` 규칙 선언,
배포 배선.

### 커스텀 태그는 왜 Svelte 컴포넌트가 아닌가

React 판은 `react-markdown`의 컴포넌트 맵(`callout: Callout`)으로 태그를
컴포넌트에 잇는다. Svelte에서 같은 구조를 만들려면 HAST 트리를 `load` 데이터로
화면에 넘겨야 하는데, **SvelteKit은 `load` 데이터를 하이드레이션용으로 HTML에
직렬화한다** — 트리를 문서에 한 번 더 싣게 되고, 지금 재고 있는 HTML 크기가
부풀어 오른다.

이 9종은 전부 프레젠테이션이다(상태도 이벤트도 없다). 빌드 타임에 클래스가
붙은 마크업으로 구우면 클라이언트 JS가 0이고 문서에는 결과만 남는다.
상호작용이 필요한 `code-tabs`는 이 방식으로 안 되므로 따로 다룬다.

### 원고가 실제로 쓰는 태그

70편 전수 조사 결과다. 이식 우선순위와 **검증 가능성**이 여기서 갈린다.

| 태그                                                                        |  사용 |
| :-------------------------------------------------------------------------- | ----: |
| `diagram-node`                                                              |    11 |
| `diagram-edge`                                                              |     5 |
| `diagram` · `file-tree`                                                     |     3 |
| `figure`                                                                    |     2 |
| `callout`·`code-tabs`·`dialogue`·`msg`·`metrics`·`metric`·`timeline`·`step` | **0** |

8종은 한 번도 쓰인 적이 없어 **실제 글로는 검증할 수 없다.** 그래서 계약을
픽스처 테스트로 잠갔다 — 누가 처음 쓰는 날 그때 처음 깨지는 것이 아니라,
여기서 먼저 깨져야 한다.

## 옮기며 드러난 프레임워크 차이

읽어서는 안 보이고 지어 봐야 나온 것들이다. 전부 빌드가 실패로 잡아 줬다.

| 무엇                     | React(Next)                                                     | SvelteKit                                                                                                                                                                                 |
| :----------------------- | :-------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **경로 앵커**            | `content.config.mts`의 `import.meta.url`이 원래 파일을 가리킨다 | Vite가 설정을 서버 번들로 옮겨 `import.meta.url`이 **출력 파일**이 된다 → `../posts`가 `.svelte-kit/output/server/posts`로 풀려 ENOENT. 앱 그래프에서만 앵커를 덮는다(`__CONTENT_ROOT__`) |
| **catch-all 파라미터**   | `['foo']` 세그먼트 배열                                         | `[...slug]`가 후행 슬래시를 삼켜 `'foo/'` → 전 글이 404. 정규화가 필요하다                                                                                                                |
| **배럴 클라이언트 누수** | `optimizePackageImports: ['@blog/content']`가 막는다            | 그 최적화가 없어 화면이 `@blog/content`를 import하면 `node:fs`가 브라우저용으로 externalize된다. URL 계약을 **서버에서 풀어** 문자열로 내려보낸다                                         |
| **본문 자산 경로**       | `MarkdownImage`가 런타임에 푼다                                 | 빌드 타임에 HAST를 훑어 `resolvePostAssetUrl`로 다시 쓴다(안 하면 프리렌더 크롤러가 404)                                                                                                  |

## 실행

```bash
pnpm dev --filter=@blog/web-svelte      # 개발 서버
pnpm build --filter=@blog/web-svelte    # 정적 export → build/
pnpm lint --filter=@blog/web-svelte
pnpm check-types --filter=@blog/web-svelte
pnpm --filter @blog/web-svelte measure  # 첫 로드 전송량 측정
```

## 기준선 (2026-09-07)

`blog-content measure-bundle`로 **같은 도구·같은 방식**으로 잰 gzip 첫 로드
전송량(HTML + CSS + JS). Node `zlib.gzipSync` 기준.

### React 판 (`apps/blog/web`) — 100 페이지

| 그룹       | 페이지 |   중앙값 |     최대 | 대표 페이지                                           |
| :--------- | -----: | -------: | -------: | :---------------------------------------------------- |
| `/admin/`  |     49 | 447.4 KB | 494.3 KB | `/admin/analytics/design-system-start/`               |
| `/posts/`  |     45 | 339.7 KB | 407.3 KB | `/posts/reduce-server-dependency-clean-architecture/` |
| `/`        |      1 | 313.5 KB | 313.5 KB | `/`                                                   |
| `/series/` |      1 | 255.1 KB | 255.1 KB | `/series/`                                            |

대표 페이지 분해 (html / css / js):

| 페이지                                                |    HTML |     CSS |       JS | JS 파일 |
| :---------------------------------------------------- | ------: | ------: | -------: | ------: |
| `/posts/reduce-server-dependency-clean-architecture/` | 35.6 KB | 30.9 KB | 273.2 KB |      13 |
| `/`                                                   |  9.3 KB | 30.3 KB | 274.0 KB |      13 |
| `/admin/analytics/design-system-start/`               |  5.5 KB | 30.3 KB | 411.5 KB |      16 |

산출물 전체: 파일 921개, 96.5 MB(raw). 빌드 49초.

### Svelte 판 — 뼈대 1 페이지

| 페이지 |   HTML |    CSS |      JS | JS 파일 |        합계 |
| :----- | -----: | -----: | ------: | ------: | ----------: |
| `/`    | 0.9 KB | 6.0 KB | 32.3 KB |       7 | **39.2 KB** |

> **이 39.2 KB를 313.5 KB와 나란히 놓고 읽으면 안 된다.** 지금 Svelte 쪽에는
> 화면도, 마크다운 렌더도, 런타임 기능도 없다. 이 수치의 뜻은 하나다 —
> **프레임워크 런타임 + 라우터 + Panda preflight의 바닥값이 39.2 KB**라는 것.
> 비교는 같은 화면이 양쪽에 설 때(PR 3 이후) 성립한다.

목표 수치는 아직 정하지 않았다. 같은 화면이 선 뒤에 정한다.

## 알려진 것

- **`.svelte` 파일은 `pnpm format:check`가 보지 않는다.** 루트 prettier 글롭에
  `svelte`가 없고 `prettier-plugin-svelte`도 없다. ESLint(`eslint-plugin-svelte`)는
  보므로 규율이 통째로 빠진 것은 아니지만, 포매팅은 손으로 맞추는 상태다.
  루트 도구를 바꾸는 일이라 별도 변경으로 둔다
- ~~**`check-bundle`은 이 앱에 아직 걸 수 없다.**~~ **해소됨** — 참조 수집과
  청크 목록에서 경로 관례를 걷어내 두 산출물에 같은 게이트가 걸린다. 자세히는
  아래 표 참고. 남은 것: ~~`check-bundle`의 `/_next/` 하드코딩~~ `collectChunkRefs`가
  `/_next/static/chunks/`를 정규식에 박아 두어 SvelteKit 산출물에서 청크를
  하나도 못 찾는다("누수 0건"이 아니라 검사 무력화). 일반화는 PR 4
- **`@sveltejs/vite-plugin-svelte`가 Vite 8을 실험 지원으로 경고한다.**
  저장소 catalog가 Vite 8 라인이라 맞췄다. 빌드·타입 검사는 통과하지만
  경고는 매 실행 뜬다
