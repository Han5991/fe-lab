# @blog/web-svelte

`apps/blog/web`(Next.js + React)과 **같은 사이트를 SvelteKit으로 병행 재구현**하는
워크스페이스. 운영 블로그를 대체하지 않는다 — 나란히 두고 재기 위한 것이다.

전체 계획과 결정 원장은 [이슈 #392](https://github.com/Han5991/fe-lab/issues/392).

## 지금 있는 것 (PR 1 — 뼈대)

- SvelteKit + `adapter-static` 정적 export (`build/`)
- Panda CSS — React 판과 **같은 프리셋**(`@design-system/ui/blog-preset`), `strictTokens`
- 자체 `content.config.mts` / `content.values.mts` (경로 앵커 + 사이트 값)
- ESLint — `--max-warnings=0`, 인라인 `eslint-disable` 금지, 타입 정보 룰
- 페이지 하나(`/`) — 정적 export와 토큰 배선이 살아 있는지만 확인한다

콘텐츠 파이프라인(`blog-content build`)은 `predev`/`prebuild`에 배선돼 있지만
아직 화면이 소비하지 않는다. 글·라우트는 PR 2부터.

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

- **`content.values.mts`가 React 판의 부분 사본이다.** 사이트 정체성이 두 곳에
  살아 있어 한쪽만 고치면 산출물이 조용히 갈라진다. 해소는 PR 2 — 파일 상단
  주석에 선택지 셋을 적어 뒀다
- **`check-bundle`은 이 앱에 아직 걸 수 없다.** `collectChunkRefs`가
  `/_next/static/chunks/`를 정규식에 박아 두어 SvelteKit 산출물에서 청크를
  하나도 못 찾는다("누수 0건"이 아니라 검사 무력화). 일반화는 PR 4
- **`@sveltejs/vite-plugin-svelte`가 Vite 8을 실험 지원으로 경고한다.**
  저장소 catalog가 Vite 8 라인이라 맞췄다. 빌드·타입 검사는 통과하지만
  경고는 매 실행 뜬다
