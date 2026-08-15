---
title: '로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다 — 낭비를 걷어내고, 남은 것을 나눴습니다'
seoTitle: 'CI에서만 빨라지는 Vitest 최적화'
date: '2026-07-12'
excerpt: 'DOM을 안 쓰는 테스트 121개가 파일마다 jsdom을 부팅하던 낭비를 Vitest 프로젝트 분리로 걷어냈습니다. 로컬 wall time은 그대로인데 4-vCPU CI에서만 25초가 줄어든 이유와, 남은 test job을 2-way 샤딩으로 나눈 제안까지 다룹니다.'
status: draft
slug: 'astryx-vitest-project-split'
thumbnail: '/og/astryx-vitest-project-split.png'
tags: ['vitest', 'testing', 'ci', 'performance']
---

## 이 글을 읽고 나면

- wall time(벽시계 시간)과 total compute(총 연산량)의 차이를 이해합니다
- Vitest 프로젝트 분리로 jsdom 오버헤드를 걷어내고, 쪼갠 뒤 "하나도 안 빠졌다"를 증명하는 방법을 배웁니다
- 크리티컬 패스가 이벤트 종류(첫 push / 재push / merge queue)마다 다르다는 걸 실측으로 보게 됩니다
- 샤드 개수를 감이 아니라 고정비와 밸런스로 결정하는 방법을 알게 됩니다

## 들어가며

벤치마크 결과를 보고 한참을 멍하니 앉아 있었습니다. 테스트 인프라 최적화 PR을 만들고, 같은 트리에서 diff를 붙였다 뗐다 하며 전체 스위트를 돌렸습니다. 결과는 이랬습니다.

| | 전체 스위트 wall time (로컬, 10코어) |
|---|---|
| 최적화 전 | 97.5초 |
| 최적화 후 | **117.8초** |

빨라지기는커녕 숫자만 보면 더 느립니다. 순간 '그럼 이 PR은 실패인가?' 싶었습니다.

결론부터 말하면, 실패가 아니었습니다. 이 PR은 머지 후 CI에서 실행당 약 25초를 꾸준히 줄였습니다. 로컬에선 그대로인데 CI에서만 빨라지는 최적화. 그게 어떻게 가능한지가 이 글의 전반부입니다.

그리고 후반부가 있습니다. 낭비를 걷어내고 나서도 `test` job은 여전히 CI에서 가장 마지막에 끝나는 job이었습니다. 그래서 이번엔 job 자체를 반으로 쪼갰습니다. 결국 이 글은 하나의 질문을 두 단계로 다룹니다. **테스트 실행을 어떻게 배치할 것인가.**

이 글은 facebook/astryx(메타의 내부 도구용 디자인 시스템, 오픈소스)에 열흘 남짓 동안 PR 17개를 머지시키며 남긴 기록 중 하나입니다. 근거 PR은 두 개입니다.

- [#3814](https://github.com/facebook/astryx/pull/3814) — Vitest를 `ui`/`node` 프로젝트로 분리. 2026년 7월 11일 **머지 완료**. 머지 전후 CI 실측이 있습니다.
- [#4103](https://github.com/facebook/astryx/pull/4103) — `test` job 2-way 샤딩. **아직 열려 있는 제안**입니다. 그래서 후반부는 "이렇게 고쳤습니다"가 아니라 "이렇게 제안했고 근거는 이겁니다"에 가깝습니다.

---

## 1부. 낭비를 없앤다 — jsdom 값을 내던 121개 파일

### 발단: 벽시계보다 큰 오버헤드

astryx는 pnpm 모노레포이고 테스트는 Vitest입니다. 전체 테스트를 돌리던 어느 날, 요약 줄의 숫자가 눈에 걸렸습니다.

```text
Duration 97.5s (environment 180s, setup 27s, ...)
```

전체 실행이 97.5초인데 environment가 180초? 처음엔 버그인 줄 알았습니다. 알고 보니 이 숫자는 **worker별 소요 시간의 합산**입니다. 워커 10개가 각자 쓴 시간을 더한 값이라 벽시계보다 커질 수 있습니다.

그렇다 해도 결론은 같습니다. 매 실행마다 **jsdom 부팅에만 CPU 시간 180초**를 쓰고 있었습니다. jest-dom setup 27초는 덤입니다. 크게 새고 있다는 신호였습니다.

### DOM 없는 파일 121개가 jsdom 값을 내고 있었습니다

astryx의 테스트 파일은 약 316개인데, 이 전부가 루트 vitest 설정 하나로 돌고 있었습니다. 루트 설정은 모든 파일에 fresh jsdom 인스턴스(`environment: 'jsdom'`)를 띄우고, React/StyleX babel 변환을 적용하고, jest-dom 매처를 주입합니다.

컴포넌트 테스트라면 전부 필요한 것들입니다. 문제는 그중 **121개 파일이 DOM을 전혀 안 쓴다**는 점이었습니다. packages/cli, 빌드 도구, scripts, 내부 유틸 테스트들이 파일마다 jsdom을 부팅하고 babel 변환까지 통과하고 있었습니다. 단일 파일 기준으로 재보니 오버헤드가 이랬습니다.

| 항목 | node 전용 파일 1개당 비용 |
|---|---|
| environment (jsdom 부팅) | 283ms |
| setup (jest-dom) | 192ms |
| transform (StyleX babel) | 173ms |

파일 하나엔 밀리초지만, 121개 × 매 실행이면 이야기가 다릅니다. 순수하게 버려지는 연산입니다.

### 해결: 프로젝트 2개로 스위트를 쪼갰습니다

Vitest workspace로 프로젝트를 2개로 나눴습니다. 당시 astryx는 Vitest 2.x라 `vitest.workspace.ts`가 공식 메커니즘이었습니다.

| 프로젝트 | 범위 | environment | 플러그인 |
|---|---|---|---|
| `ui` | packages/core + packages/lab (195파일) | jsdom (기존 유지) | StyleX babel + jest-dom setup |
| `node` | 나머지 전부 (121파일) | node | 없음 |

머지된 설정의 핵심만 발췌하면 이렇습니다.

```ts
// vitest.workspace.ts
export default defineWorkspace([
  // UI 패키지 — jsdom, StyleX babel, jest-dom이 필요. 루트 설정을 상속.
  {
    extends: './vitest.config.ts',
    test: {
      name: 'ui',
      include: [
        'packages/core/src/**/*.test.{ts,tsx,mjs}',
        'packages/lab/src/**/*.test.{ts,tsx,mjs}',
      ],
    },
  },
  // Node 전용 코드 — 의도적으로 루트 설정을 상속하지 않음.
  {
    test: {
      name: 'node',
      globals: true,
      environment: 'node',
      include: [
        'packages/**/src/**/*.test.{ts,tsx,mjs}',
        'internal/**/*.test.{ts,tsx,mjs}',
        'scripts/**/*.test.{ts,tsx,mjs}',
      ],
      exclude: [...configDefaults.exclude, 'packages/core/**', 'packages/lab/**'],
    },
  },
]);
```

> 참고: `defineWorkspace`는 Vitest 3.2에서 deprecated, 4에서 제거되었습니다. 지금 따라 하신다면 루트 설정의 `test.projects`를 쓰면 됩니다. astryx도 이후 그렇게 마이그레이션했습니다.

설정은 단순해 보입니다. 하지만 이 형태에 도달하기까지 설계 결정이 세 번 있었고, 한 번은 제대로 당했습니다.

### 결정 1: 분할은 구조적으로 완전해야 합니다

`ui`와 `node`를 둘 다 명시 목록으로 만들면 어떻게 될까요? 새 패키지가 아무 목록에도 안 들어가면 그 테스트는 **CI에서 조용히 빠집니다**. 테스트가 안 도는데 초록불이 뜨는 최악의 시나리오입니다.

그래서 비대칭으로 설계했습니다. `ui`만 명시 목록이고, `node`는 루트와 같은 glob에서 core/lab을 **제외**한 나머지 전부입니다. 새 패키지는 기본적으로 `node`에 떨어지고, DOM이 필요하면 거기서 시끄럽게 실패합니다. 조용한 누락 대신 시끄러운 실패를 선택한 것입니다.

### 결정 2 (시련): `extends`는 배열을 병합합니다

첫 시도에서 제대로 당한 지점입니다. 처음엔 루트 `vitest.config.ts`에 include 목록을 남겨둔 채 workspace를 얹었는데, 돌려보니 테스트 개수가 맞지 않았습니다.

원인은 workspace의 `extends`가 배열 옵션을 **덮어쓰지 않고 병합**한다는 것이었습니다. 루트에 남은 include가 상속받는 프로젝트로 새어 들어갔고, 그 결과 **node 쪽 121개 파일이 두 번씩 돌고 있었습니다**. 설마 싶어서 파일 목록을 뽑아 보고 나서야 믿었습니다.

해결은 include 목록을 루트에서 완전히 들어내고 각 프로젝트에만 두는 것이었습니다. '상속은 병합'이라는 한 줄을 몰라서 벤치마크 하루를 날릴 뻔했습니다.

### 결정 3: `node` 프로젝트도 forks 풀을 유지합니다 — 실측으로 기각한 대안들

Vitest의 worker threads 풀이 forks보다 가벼우니 node 프로젝트라면 threads가 자연스러워 보입니다. 여기에 `isolate: false`까지 더하면 더 공격적으로 줄일 수 있습니다. 둘 다 실제로 돌려봤고, 숫자로 기각했습니다.

| 대안 | 결과 |
|---|---|
| 전역 `pool: 'threads'` | **63개 테스트 실패** — CLI 테스트 11개 파일 |
| `isolate: false` | **2,138개 테스트 실패** — 파일 간 상태 오염 |

threads 실패는 전부 `process.chdir() is not supported in workers` 하나였습니다. astryx의 CLI 테스트 여러 개가 `process.chdir()`를 호출하는데 worker threads는 이를 지원하지 않습니다. `isolate: false`는 격리 오버헤드 자체를 없애니 이론상 가장 빠르지만, 파일 간 DOM/모듈 상태 오염이 광범위해서 2,138개가 무너졌습니다. 그래서 `node` 프로젝트도 기본값인 forks 풀을 유지했습니다.

기각한 대안도 숫자와 함께 PR 본문에 남겼습니다. "threads는 왜 안 썼나요?"라는 리뷰 코멘트가 달리기 전에 답을 미리 적어두는 셈입니다.

### 검증: 316개 파일, 5,893개 테스트, 누락 0

테스트 스위트를 쪼갤 때 가장 무서운 것은 성능이 아닙니다. **글이 빠지는 것**입니다. 그래서 JSON 리포터로 분리 전후의 실행 결과를 덤프하고 diff를 떴습니다. 파일은 양쪽 모두 **316개**, 테스트도 양쪽 모두 **5,893개**. 누락 0개, 중복 0개였습니다.

결정 2에서 121개 파일이 두 번 돌던 걸 잡아낸 것도 이 검증 덕분입니다. 분할 PR에는 이 parity 증명이 벤치마크보다 먼저라고 생각합니다.

### 반전: 로컬에서는 하나도 안 빨라졌습니다

여기까지 하고 벤치마크를 돌렸습니다. 그리고 글 서두의 그 표가 나왔습니다. 97.5초 → 117.8초. jsdom 부팅 CPU 시간을 분명히 걷어냈는데 wall time은 오히려 늘어난 숫자가 찍혔습니다(반복 측정하니 노이즈 수준이었습니다).

그런데 node 프로젝트만 따로 보면 효과가 선명했습니다.

| 시나리오 | 이전 | 이후 |
|---|---|---|
| node 범위 타겟 실행 (121파일 / 1,791테스트) | 61.6초 | 50.3초 (**−18%**) |
| 단일 CLI 테스트 파일 (수정 → 재실행 루프) | 1.69초 | 1.09초 (**−35%**) |
| node 실행의 environment 합계 | 파일마다 jsdom | **16ms** |
| node 실행의 transform 합계 | 33초 | **3.5초** |

부분은 확실히 빨라졌는데 전체는 그대로. 이 모순을 붙들고 한참 생각했습니다.

### wall time이 아니라 total compute였습니다

답은 측정 단위에 있었습니다. 제 로컬은 M시리즈 10코어입니다. 워커 10개가 병렬로 돌면 **코어가 남습니다**. jsdom 부팅이라는 낭비는 남는 코어가 흡수해 버립니다. 낭비를 걷어내도 코어가 노는 시간만 늘어날 뿐, 벽시계는 안 움직입니다.

즉 이 PR이 줄인 것은 wall time이 아니라 **total compute — 실행당 worker CPU 시간 약 90~110초**입니다. 이 절약이 벽시계 시간으로 바뀌려면 조건이 하나 필요합니다. **코어가 포화된 환경**입니다.

마트 계산대에 비유하면 이렇습니다. 계산대 10개가 열려 있고 손님이 적으면, 계산원 한 명의 일이 빨라져도 대기 시간은 그대로입니다. 하지만 계산대 4개에 줄이 늘어서 있다면, 그 개선이 곧바로 줄 길이를 줄입니다.

그리고 astryx의 CI 러너가 정확히 그 '계산대 4개'입니다. GitHub Actions의 ubuntu 러너는 **4 vCPU**라, 316개 파일을 욱여넣으면 코어는 항상 포화 상태입니다. 이 PR의 효과는 제 맥북이 아니라 거기서 측정해야 했던 겁니다.

### 진짜 측정대: 4-vCPU CI 러너

astryx는 main에 머지될 때마다 Deploy 워크플로우가 돕니다. 그 안의 `Run pnpm test` 스텝이 이상적인 측정대였습니다. 같은 4-vCPU 러너, 같은 fresh checkout, 실제 트래픽입니다.

| | `Run pnpm test` (main, Deploy 워크플로우) |
|---|---|
| 머지 전 9회 평균 | **296초** (범위 290–311) |
| 머지 후 평균 | **271초** (범위 265–277) |
| 차이 | **약 −25초 (−8%)** |

로컬에서 안 보이던 25초가 CI에서는 매 실행마다 꾸준히 나타났습니다. 범위가 겹치지 않는 것도 중요합니다. 머지 후 최댓값(277초)이 머지 전 최솟값(290초)보다 작습니다. 노이즈가 아니라 분포 자체가 이동했습니다.

여담 하나. 이 PR의 첫 CI 실행은 main에 잠재하던 core 빌드 레이스로 실패했습니다. node 파일들이 jsdom 부팅 없이 촘촘하게 시작하자 드러난 것이라 이 PR 안에서 함께 고쳤습니다. 빨라지면 숨어 있던 레이스가 드러난다는 이야기는 [CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다](https://blog.sangwook.dev/posts/astryx-ci-race-and-permissions/)에서 더 합니다.

이후 후속 PR [#3816](https://github.com/facebook/astryx/pull/3816)(날짜 테스트 스위트 최적화)까지 합쳐 최종 약 **246초**가 되었습니다. 두 PR 합산 약 50초, **17% 단축**입니다.

---

## 2부. 남은 것을 나눈다 — test job을 반으로 쪼갭니다

### 낭비를 걷어내도 test는 여전히 크리티컬 패스였습니다

1부의 PR로 총 연산량은 줄었습니다. 그런데 그 뒤 deploy 파이프라인을 병렬화하고 죽은 Next.js 캐시를 살려내고 나니(각각 [deploy job은 이제 27초면 끝납니다](https://blog.sangwook.dev/posts/astryx-deploy-pipeline-parallel/)와 [캐시가 hit인데 매번 콜드 빌드였습니다](https://blog.sangwook.dev/posts/astryx-pr-ci-parallel-cache/)에 기록해 뒀습니다) 병목이 세 번 이동해서 결국 `test` job 위에 앉았습니다. 그사이 스위트도 자라 359개 파일 / 7,118개 테스트가 되어 있었습니다.

1부에서 얻은 교훈이 여기서 그대로 판단 근거가 됩니다. **코어가 포화된 곳에서 재라.** 그래서 이번에도 로컬이 아니라 실제 CI 실행 로그를 열었습니다. 근거 PR은 [#4103](https://github.com/facebook/astryx/pull/4103), 문제 정의는 이슈 [#4339](https://github.com/facebook/astryx/issues/4339)에 정리했습니다. 바뀐 파일은 `.github/workflows/ci.yml` **하나, +36/-13줄**입니다.

### 크리티컬 패스는 하나가 아니었습니다

"CI가 느리다"를 고치려면 먼저 무엇이 마지막에 끝나는지를 알아야 합니다. 그런데 재보니 그 답이 **하나가 아니었습니다**. 같은 PR([#4101](https://github.com/facebook/astryx/pull/4101))의 실제 실행 두 건을 job 단위로 뽑았습니다. 하나는 첫 push(Next.js 캐시 콜드), 하나는 같은 PR에 다시 push한 실행(웜)입니다.

| Job | 첫 push (콜드) | 재push (웜) |
|---|---|---|
| build-sandbox | **385초** ← 크리티컬 | 206초 |
| **test** | 327초 (58초 뒤) | **324초 ← 크리티컬** |
| build-storybook | 164초 | 167초 |

표를 세로가 아니라 가로로 읽어야 합니다. `test`는 두 실행에서 327초와 324초로 **거의 움직이지 않습니다**. 반면 build-sandbox는 385초에서 206초로 절반 가까이 내려갑니다. PR별 Next.js 캐시가 붙기 때문입니다(캐시 키를 PR별로 분리한 뒤 생긴 효과입니다 — [캐시가 hit인데 매번 콜드 빌드였습니다](https://blog.sangwook.dev/posts/astryx-pr-ci-parallel-cache/) 참고).

그래서 상황별로 크리티컬 패스가 갈립니다.

- **첫 push**: build-sandbox가 여전히 가장 깁니다. 하지만 `test`가 **58초** 뒤에 붙어 있을 뿐입니다.
- **재push**: build-sandbox가 3분 30초대로 내려오면서 `test`(5분 30초대)가 크리티컬 패스가 됩니다. 그리고 재push는 기여자가 리뷰 피드백을 반영하며 반복해서 기다리는 루프입니다.
- **merge queue(`merge_group`)와 main**: 애초에 build-sandbox를 돌리지 않습니다. `test`가 그냥 크리티컬 패스입니다.

> 첫 push만 보면 `test`는 2등입니다. 하지만 사람이 실제로 반복해서 기다리는 경로에서는 이미 1등이었습니다.

시간축도 하나 더 있습니다. `test`는 **컴포넌트 수에 선형으로 자라는 유일한 job**입니다. 빌드는 캐시로 눌러왔지만 테스트는 정직하게 길어집니다. 지금의 58초 차이는 다음 분기에 사라질 숫자입니다.

### test job 안을 열어봤습니다

그다음은 5분 30초를 무엇이 먹고 있는지입니다. step 단위로 쪼개니 러너 셋업(checkout + setup 액션)이 약 30초, vitest 실행이 약 284초였습니다. vitest가 리포트한 내부 내역은 이렇습니다. 워커별 합산이라 벽시계보다 큽니다. 1부에서 한 번 데인 그 숫자입니다.

| 항목 | 합계 |
|---|---|
| 테스트 CPU (워커 전체) | 413초 |
| jsdom environment | 148초 |
| import | 110초 |
| transform | 54초 |

여기서 중요한 건 개별 항목이 아니라 **비율**입니다. 5분 30초 중 4분 44초가 vitest이고, 고정비는 30초입니다. 그리고 vitest 구간은 파일 단위로 잘라 나눌 수 있습니다. 즉 이 job은 **깔끔하게 샤딩되는 모양**을 하고 있었습니다.

1부에서는 같은 job의 낭비(불필요한 jsdom 부팅)를 걷어냈습니다. 이번엔 걷어낼 낭비가 아니라 **나눌 일**이 남은 상태였습니다.

### 설계: 샤드 매트릭스 + join 게이트

vitest는 `--shard=1/2` 형태로 스위트를 나눠 실행합니다. astryx의 `test` 스크립트는 `vitest run`이라 `pnpm test --shard=1/2`처럼 플래그가 그대로 넘어갑니다.

문제는 워크플로우 쪽입니다. 단일 `test` job을 매트릭스로 바꾸면 체크 이름이 `test (shard 1/2)` / `test (shard 2/2)`로 바뀝니다. 브랜치 보호 규칙과 각종 도구가 `test`라는 이름에 걸려 있는데, 그게 사라지면 게이트가 조용히 풀립니다.

다행히 선례가 있었습니다. `build-storybook`과 `build-sandbox`를 나누면서 `build`라는 이름을 유지하는 **join 게이트**가 이미 ci.yml 안에 있었습니다. 같은 패턴을 그대로 가져왔습니다.

```yaml
  test-shard:
    name: test (shard ${{ matrix.shard }})
    needs: [check-scope]
    if: needs.check-scope.outputs.docsite_only != 'true'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: ['1/2', '2/2']
    steps:
      - uses: actions/checkout@v7
      - uses: ./.github/actions/setup

      # 저작권 헤더 / exports 동기화 / 토큰 문서 — 테스트가 아니라
      # 저장소 정합성 검사라 shard 1에서만 한 번 돌립니다
      - name: Check copyright headers
        if: matrix.shard == '1/2'
        run: ./scripts/add-copyright.sh --check

      - run: pnpm test --shard=${{ matrix.shard }}

  # 과거 `test` 체크 이름을 유지하는 join 게이트
  test:
    needs: [test-shard]
    if: ${{ !cancelled() && needs.test-shard.result != 'skipped' }}
    runs-on: ubuntu-latest
    permissions: {}
    steps:
      - name: Assert shards succeeded
        run: |
          echo "test-shard: ${{ needs.test-shard.result }}"
          [ "${{ needs.test-shard.result }}" = "success" ] || exit 1
```

`fail-fast: false`가 중요합니다. 기본값이면 한쪽 샤드가 빨개지는 순간 다른 쪽이 취소됩니다. 그러면 기여자는 실패 리포트의 절반만 받고, 고쳐서 다시 올린 뒤에야 나머지를 봅니다. 왕복이 늘어나니 껐습니다.

### 왜 하필 2개인가

여기가 이 PR에서 제일 오래 고민한 부분입니다. 8개로 쪼개면 `test`는 1분대가 됩니다. 왜 2개에서 멈췄을까요.

> 목표는 `test`를 최소화하는 게 아니라 **크리티컬 패스에서 빼내는 것**입니다.

기준선이 있습니다. 웜 재push에서 build-sandbox는 206초, 콜드 첫 push에서는 385초입니다. `test`가 그 아래로만 내려가면 사람이 기다리는 시간에서는 사라집니다. 2샤드 예상치는 러너 셋업 약 30초 + vitest 약 145초 + node 프로젝트의 globalSetup(프로세스마다 `@astryxdesign/core`를 한 번 빌드) ≈ **약 3분**입니다. 웜 206초보다 아래고, 콜드 385초보다는 한참 아래입니다. 여기서 더 쪼개는 건 **아무도 기다리지 않는 숫자를 줄이는 일**입니다.

그리고 더 쪼갤수록 손해가 커지는 이유가 세 개 있습니다.

**1. 샤드마다 고정비를 다시 냅니다.** 러너 셋업 약 30초는 샤드 수만큼 곱해지고, globalSetup의 core 빌드도 vitest 프로세스마다 반복됩니다. 그래서 수익 곡선이 빠르게 눕습니다.

| 샤드 늘리기 | 추가로 줄어드는 시간 |
|---|---|
| 2 → 4 | 약 70초 |
| 4 → 8 | 35초 미만 |

(둘 다 낙오 샤드(straggler) 효과를 계산에 넣기 전 수치입니다.)

**2. vitest는 소요 시간이 아니라 파일 개수로 나눕니다.** astryx 스위트에는 Markdown 성능 테스트, Tokenizer, TabList처럼 유독 무거운 파일이 몇 개 있습니다. 샤드가 많아질수록 이 파일 한 개가 한 샤드를 통째로 끌고 나머지는 먼저 끝나서 놉니다. 그런데 join 게이트는 **가장 느린 샤드**를 기다립니다. 밸런스가 나빠지는 만큼 실효 이득이 깎입니다.

**3. 나중에 늘리는 건 한 줄입니다.** 스위트가 자라 다시 build-sandbox를 추월하면 `matrix.shard` 배열만 고치면 됩니다. 지금 필요 없는 복잡도를 미리 살 이유가 없습니다. (비용은 문제가 아닙니다. 공개 저장소는 표준 러너 사용 시간이 무료입니다.)

### 검증: 로컬 반쪽과 PR 자신의 CI

워크플로우 변경은 "머지해봐야 아는" 종류라 위험합니다. 그래서 두 단계로 확인했습니다.

먼저 로컬에서 `pnpm test --shard=1/2 --project node`를 돌렸습니다. 1부의 프로젝트 분리 덕에 `node` 범위만 따로 재볼 수 있었습니다. 결과는 파일 130개 중 정확히 **65개**, **1,328개 테스트 통과**. 딱 반쪽입니다. 플래그가 스크립트를 통과해 vitest까지 도달하고 프로젝트 설정과도 충돌하지 않는다는 확인입니다.

그다음은 PR 자신의 CI입니다. 워크플로우 PR의 좋은 점이자 무서운 점은, 그 PR의 CI가 곧 변경의 실행 결과라는 것입니다.

| 체크 | 소요 |
|---|---|
| test (shard 1/2) | 3분 09초 |
| test (shard 2/2) | 2분 42초 |
| test (join 게이트) | 4초 |
| build-sandbox (콜드) | 6분 31초 |

예상했던 "약 3분"이 3분 09초와 2분 42초로 나왔습니다. 이 실행은 콜드 첫 push였고 build-sandbox가 6분 31초였으니, `test`는 이제 크리티컬 패스보다 **3분 이상 앞서** 끝납니다. 예전에는 58초 뒤였습니다. 아무것도 빌드하지 않고 `needs` 결과만 확인하는 join 게이트가 4초라는 것도, 체크 이름을 지키는 값으로는 싼 편입니다.

다만 이 숫자들은 **제안 PR 자신의 실행**에서 나온 것입니다. 1부처럼 머지 전후를 비교한 사후 실측이 아닙니다. 이 PR은 아직 열려 있고, 머지 후 실측은 그때 다시 재야 합니다.

스코프도 `ci.yml`로 좁혔습니다. `deploy.yml`의 test job(1부에서 296초 → 271초를 잰 그 job)은 `pnpm test`가 배포 게이트와 **한 job 안에 섞여** 있어 후속으로 남겼습니다.

---

## 배운 점

**1. 최적화의 효과는 어디서 측정하느냐에 따라 다릅니다.** 코어가 남는 환경에서는 연산량 절감이 벽시계에 안 보입니다. 10코어 M시리즈와 4-vCPU 러너는 병목의 위치가 다르고, 팀 전체가 매일 수십 번 기다리는 건 CI 쪽입니다.

**2. 그 원칙은 job 단위로도 확장됩니다.** 1부가 "코어가 포화된 곳에서 재라"였다면 2부는 "사람이 실제로 기다리는 실행에서 재라"입니다. 첫 push만 보고 "test는 2등"이라 판단했다면 2부의 PR은 없었습니다. 파이프라인을 측정할 땐 **어떤 이벤트의 실행인지**를 함께 적어야 합니다.

**3. 쪼갤 때 첫 번째 요건은 속도가 아니라 완전성입니다.** 새 패키지가 조용히 CI에서 빠질 수 없는 구조와 JSON 리포터 parity 검증(316파일/5,893테스트 일치)이 벤치마크보다 먼저였습니다. job도 같습니다. 제일 조용히 깨지는 건 성능이 아니라 브랜치 보호입니다. **체크 이름은 API입니다.**

**4. 최적화에는 멈출 지점이 있습니다.** 8샤드는 숫자를 더 예쁘게 만들지만 그 숫자를 기다리는 사람은 없습니다. "무엇을 최소화할 것인가"보다 "무엇 아래로 내려가면 되는가"를 먼저 정하면 과잉 설계를 피할 수 있습니다.

**5. 기각한 대안을 숫자로 남기면 리뷰가 빨라집니다.** 1부에서는 "threads는 63개 실패, isolate:false는 2,138개 실패"를, 2부에서는 "왜 4개가 아닌가"의 답을 PR 본문에 미리 넣었습니다. 그러면 그 질문이 리뷰 코멘트로 오지 않습니다.

보너스 하나. 1부의 분리 덕에 `vitest --project node`로 타겟 실행이 가능해졌습니다. 단일 파일 재실행이 1.69초에서 1.09초로 줄었고, 그 프로젝트 경계가 2부에서 `--shard`를 검증하는 발판이 되기도 했습니다.

## 마치며

같은 질문을 두 단계로 다뤘습니다.

**1단계 — 낭비를 없앤다(머지 완료).** 316개 파일 중 DOM이 필요 없는 121개가 파일마다 jsdom 값을 내고 있었습니다. Vitest 프로젝트를 `ui`(jsdom)와 `node`로 나눠 그 낭비를 걷어냈습니다. 로컬 10코어에서는 wall time이 안 변해 잠시 실패인 줄 알았지만, 절약된 것은 total compute였고 4-vCPU CI 러너에서 실행당 25초(후속 PR 합산 50초, 17%)로 나타났습니다.

**2단계 — 남은 것을 나눈다(제안, 아직 open).** 연산량을 줄여도 `test` job은 재push·merge queue·main에서 여전히 크리티컬 패스였습니다. 2-way `vitest --shard` 매트릭스로 나누고 `test` 체크 이름을 유지하는 join 게이트를 붙였습니다. 샤드가 2개인 이유는 목표가 최소화가 아니라 "build-sandbox 아래로 내리기"였기 때문입니다.

병목은 사라지지 않고 이동합니다. 이번에 `test`를 옮겼으니 다음 목적지는 아마 다시 build-sandbox의 콜드 컴파일이겠죠. 파이프라인 최적화는 끝나는 일이 아니라 **가장 긴 가지를 계속 따라가는 일**에 가깝다는 걸 매번 다시 배웁니다.

여러분의 스위트에도 jsdom 값을 내는 node 테스트가 숨어 있지 않은지 확인해 보세요. `vitest run` 요약 줄의 environment 시간이 힌트입니다. 그리고 여러분의 CI에서 가장 마지막에 끝나는 job은 무엇인가요. 그 답은 첫 push와 재push에서 같은가요? "로컬에선 효과 없던 최적화가 CI에서 터진" 경험이 있다면 댓글로 공유해 주세요.

- 1단계 근거 PR: [facebook/astryx#3814 — perf(test): split vitest into ui (jsdom) and node projects](https://github.com/facebook/astryx/pull/3814) (2026-07-11 머지)
- 1단계 후속 PR: [facebook/astryx#3816](https://github.com/facebook/astryx/pull/3816)
- 2단계 근거 PR: [facebook/astryx#4103 — ci: shard the PR test job two ways to take vitest off the critical path](https://github.com/facebook/astryx/pull/4103) (작성 시점 기준 open)
- 2단계 관련 이슈: [facebook/astryx#4339 — The `test` job is the CI critical path on re-pushes, merge queue, and main](https://github.com/facebook/astryx/issues/4339)
