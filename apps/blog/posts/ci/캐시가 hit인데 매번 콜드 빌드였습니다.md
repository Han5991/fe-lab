---
title: '캐시가 hit인데 매번 콜드 빌드였습니다 — GitHub Actions Next.js 캐시 키가 죽어 있던 이유'
date: '2026-07-26'
status: draft
slug: 'astryx-pr-ci-parallel-cache'
thumbnail: '/og/astryx-pr-ci-parallel-cache.png'
tags: ['github-actions', 'ci', 'nextjs', 'cache']
---

# 캐시가 hit인데 매번 콜드 빌드였습니다 — GitHub Actions Next.js 캐시 키가 죽어 있던 이유

## 이 글을 읽고 나면

- CI job을 병렬로 쪼개면서 기존 체크 이름을 깨뜨리지 않는 join gate 패턴을 알게 됩니다
- "캐시 hit"이 성공 신호가 아닐 수 있다는 것과, 그것을 대조군으로 증명하는 방법을 배웁니다
- Next.js 빌드 캐시가 basePath 같은 config 변화에 어떻게 반응하는지 이해합니다
- CI 최적화의 효과가 중앙값보다 분포의 꼬리에서 먼저 나타나는 이유를 보게 됩니다

> **느린 CI 뜯어고치기**
>
> 1. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 2. 캐시가 hit인데 매번 콜드 빌드였습니다 **(현재 글)**
> 3. deploy job은 이제 27초면 끝납니다
> 4. CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다

## 들어가며

CI 로그에서 캐시 복원 스텝은 초록불이었습니다. 67MB가 정상적으로 내려왔고, 로그는 primary key에 hit이 났다고 말하고 있었습니다. 그런데 바로 다음 스텝인 Next.js 빌드는 4.0분이 걸렸습니다. 캐시가 아예 없는 run이 3.9분이었습니다.

다운로드 비용만 내고 재사용은 0이었던 겁니다.

이 글은 facebook/astryx(메타의 내부 도구용 디자인 시스템, 오픈소스)에 기여한 PR 두 건을 다룹니다. 근거 PR은 [#3811](https://github.com/facebook/astryx/pull/3811)(sandbox 빌드 병렬화)과 [#3864](https://github.com/facebook/astryx/pull/3864)(sandbox 캐시 키 PR 스코핑)이고, 둘 다 2026년 7월 12일에 머지되었습니다.

두 PR을 한 편으로 묶는 이유가 있습니다. 머지 시각이 **23분 차이**(UTC 06:25:01 / 06:48:48)라 머지 후 실측에서 두 효과를 분리할 수 없기 때문입니다. 이 점은 뒤에서 다시 명시합니다.

## 발단: build job 6분 30초 중 4분 15초가 한 스텝

astryx의 PR CI에는 `build`라는 단일 job이 있었습니다. 하는 일이 많습니다.

| 구성 | 소요 |
| --- | --- |
| core 빌드 + 타입체크 4종 + storybook 빌드 + PR 분석 | 약 2분 |
| sandbox Next.js export | **4분 15초** |
| 합계 (단일 `build` job) | 약 6분 30초 |

한 스텝이 job의 3분의 2를 먹고 있었습니다. 그런데 이게 단순히 "느린 스텝"으로 끝나지 않습니다. 이 job이 통째로 끝나야 하위 job이 시작되기 때문입니다.

접근성 감사 job(`pr-a11y`)이 대표적입니다. 필요한 건 storybook 아티팩트 하나뿐이고 그건 2분이면 준비되는데, `needs: [build]`로 걸려 있으니 관계도 없는 sandbox export가 끝날 때까지 4분 넘게 놀고 있었습니다.

> 직렬 파이프라인에서 가장 비싼 것은 느린 스텝 자체가 아니라, 그 스텝 뒤에 줄 서 있는 것들입니다.

### 1차 작업: 한 job을 세 개로 쪼갰습니다

[#3811](https://github.com/facebook/astryx/pull/3811)은 `ci.yml` 한 파일만 건드리는 PR입니다(+99/−42).

- **`build-storybook`** — 기존 `build`를 개명. core 빌드 + 타입체크 + storybook + PR 분석(약 2분)
- **`build-sandbox`** — 신규. core 빌드 + sandbox export. PR 이벤트 전용, t0부터 병렬
- **`build`** — 신규 join gate. 위 둘의 결과를 접어서 기존 체크 이름을 유지

`pr-a11y`의 `needs`도 `[build, check-components]`에서 `[build-storybook, check-components]`로 바꿨습니다. sandbox를 기다릴 이유가 없으니까요.

### 결정 1: 왜 job 이름을 바꾸고 끝내지 않았나

`build`라는 이름을 그냥 `build-storybook`으로 바꾸고 끝낼 수도 있었습니다. 하지만 체크 이름은 사실상 공개 API입니다. 브랜치 보호 규칙, 외부 툴링, 그리고 "build가 초록이면 됐다"는 팀의 습관이 전부 그 문자열에 걸려 있습니다. 이름이 사라지면 조용히 깨집니다.

그래서 `build`라는 이름의 join gate를 남겼습니다.

```yaml
build:
  needs: [build-storybook, build-sandbox]
  if: ${{ !cancelled() && needs.build-storybook.result != 'skipped' }}
  runs-on: ubuntu-latest
  permissions: {}
  steps:
    - name: Assert parallel builds succeeded
      run: |
        [ "${{ needs.build-storybook.result }}" = "success" ] || exit 1
        case "${{ needs.build-sandbox.result }}" in
          success|skipped) ;;
          *) exit 1 ;;
        esac
```

두 군데가 핵심입니다. 하나는 `build-sandbox`의 `skipped`를 실패로 보지 않는 것입니다. 문서 사이트만 고치는 PR은 sandbox 프리뷰를 정당하게 건너뛰기 때문에, 여기서 실패로 처리하면 멀쩡한 PR이 빨간불이 됩니다.

다른 하나는 `needs.build-storybook.result != 'skipped'` 조건입니다. merge_group 이벤트에서는 `build-storybook` 자체가 skip되는데, 그럴 때 join도 함께 skip되어야 기존의 캐스케이드 동작과 같아집니다.

동작 동등성은 시나리오별로 따로 적어 PR 본문에 올렸습니다.

| 시나리오 | 이전 | 이후 |
| --- | --- | --- |
| 일반 PR, sandbox 빌드 실패 | `build` 빨간불 | `build` 빨간불 (join 경유) |
| 문서 사이트 전용 PR | `build` 초록 (스텝 skip) | `build` 초록 (sandbox skip, join 통과) |
| fork PR | 프리뷰/코멘트 skip | 동일 (빌드는 돌고 deploy/comment만 skip) |
| merge_group | `build` skip (check-scope 캐스케이드) | join도 같은 방식으로 skip |

### 결정 2: 비용을 계산해서 적었습니다

공짜는 아닙니다. 러너 하나가 더 뜨고, `build-sandbox`가 core 빌드를 다시 하므로 **약 40초의 중복 연산**이 생깁니다. wall time을 사는 대가로 total compute를 조금 더 쓰는 거래입니다. 이걸 PR 본문에 명시적으로 적었습니다. 리뷰어가 묻기 전에 답을 두는 편이 서로 빠릅니다.

여담 하나. 이 PR 본문에는 취소선이 그어진 항목이 두 줄 있습니다. 처음에 `pr-comment` 관련 변경을 적었는데, 그 job들은 별도 워크플로우(`pr-comment.yml`)에 있어서 이 PR이 건드리지 않는 파일이었습니다. 지우는 대신 취소선과 정정 주석을 남겼습니다. 본문과 diff가 어긋난 채로 머지되면, 나중에 그 본문을 근거로 읽는 사람이 틀리게 됩니다.

## 그런데 sandbox 빌드가 여전히 4분이었습니다

병렬로 옮겼으니 이제 크리티컬 패스는 `build-sandbox`가 정합니다. 그러면 이 job을 줄이는 게 다음 과제입니다.

로그를 다시 열었습니다. sandbox job은 `apps/sandbox/.next/cache`를 `actions/cache`로 복원하고 있었고, 복원은 **성공**하고 있었습니다. 67MB가 정상적으로 내려왔는데 컴파일은 4분. 여기서부터가 [#3864](https://github.com/facebook/astryx/pull/3864)입니다.

### 진단: 같은 키, 같은 hit, 4.0분 vs 64초

가설을 세우기 전에 숫자부터 모았습니다. 세 개의 실제 run을 비교했습니다.

| run | 맥락 | 캐시 | sandbox 컴파일 |
| --- | --- | --- | --- |
| [29181246330](https://github.com/facebook/astryx/actions/runs/29181246330) | PR build | **hit** (공유 키, 67MB 복원) | **4.0분** |
| [29181173652](https://github.com/facebook/astryx/actions/runs/29181173652) | main Deploy | hit (**같은 키**) | **64초** |
| [29180552092](https://github.com/facebook/astryx/actions/runs/29180552092) | 대조군 | **miss** (콜드) | 3.9분 |

같은 캐시 키에 같은 hit인데 main은 64초, PR은 4.0분입니다. 그리고 PR의 4.0분은 **캐시가 아예 없는 대조군 3.9분과 구분되지 않습니다**.

> 캐시가 죽었는지 살았는지는 hit/miss 로그로 알 수 없습니다. hit 이후의 실제 컴파일 시간을 콜드 run과 비교해야 알 수 있습니다.

### 원인 1: basePath가 다르면 Next.js는 캐시를 버립니다

캐시 키는 이랬습니다.

```text
nextjs-sandbox-<pnpm-lock 해시>-<packages/core/dist 해시>
```

빌드 입력을 잘 반영한 키처럼 보입니다. 의존성이 바뀌면 갈리고, core 산출물이 바뀌면 갈립니다. 그런데 키에 안 들어간 입력이 하나 있었습니다. PR 빌드와 main 빌드는 **basePath가 다릅니다**.

- PR: `SANDBOX_BASE_PATH=/<repo>/pr/<n>/sandbox`
- main: `/<repo>/sandbox`

이건 실수가 아니라 필연입니다. PR 프리뷰는 GitHub Pages의 `<owner>.github.io/<repo>/pr/<n>/sandbox/` 경로에 배포됩니다. 그 prefix 없이 빌드하면 루트 절대 경로로 나가는 에셋 URL이 전부 404가 나서 프리뷰의 스타일과 JS가 통째로 깨집니다.

그리고 Next.js는 **resolved config가 바뀌면 webpack 캐시를 무효화**합니다. basePath는 그 config의 일부입니다. main이 만들어 둔 캐시를 PR이 복원하면, Next.js는 열어보고 "설정이 다르네" 하며 버립니다. 복원한 67MB는 처음부터 순수한 다운로드 낭비였습니다.

### 원인 2: hit으로 기록되면 저장도 못 합니다

여기서 끝이었으면 "쓸데없이 67MB 받는 낭비" 정도였을 겁니다. 진짜 문제는 두 번째였습니다. `actions/cache`는 primary key에 hit이 나면 이 로그를 남기고 저장 단계를 건너뜁니다.

```text
Cache hit occurred on the primary key, not saving.
```

캐시 액션 입장에선 합리적입니다. 이미 그 키로 캐시가 있으니 다시 올릴 이유가 없으니까요. 그런데 이 상황에서는 결과가 최악입니다.

PR은 main의 죽은 캐시로 "hit"을 받습니다. → 저장 단계가 건너뛰어집니다. → **PR은 자기 basePath에 맞는 캐시를 영원히 만들 수 없습니다.** → 다음 푸시에서도 똑같이 죽은 캐시를 받고 콜드 컴파일을 합니다.

> 캐시가 있는데 없는 것보다 나쁜 상태가 됐습니다. 다운로드 비용은 내고, 재사용은 0이고, 올바른 캐시가 생기는 것까지 막습니다.

## 해결: 키를 PR 번호로 스코프

고치는 diff는 허무할 정도로 짧습니다. `ci.yml`과 `deploy.yml` 두 파일, +17/−1. 그중 `deploy.yml` 변경은 키가 아니라 **주석 5줄**입니다.

```yaml
key: nextjs-sandbox-pr${{ github.event.pull_request.number }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ hashFiles('packages/core/dist/**') }}
```

`pr<n>` 한 조각을 넣은 게 전부입니다. 이제 각 PR은 첫 푸시에서 자기 캐시를 굽고, 이후 푸시에서 진짜 워밍 캐시를 씁니다. 대신 이 짧은 diff 뒤에 결정이 몇 개 붙어 있습니다.

### 결정 1: restore-keys는 여전히 넣지 않았습니다

캐시 키를 세분화하면 자연스럽게 "그럼 `restore-keys`로 느슨한 폴백을 두자"는 생각이 따라옵니다. 여기서는 일부러 넣지 않았습니다.

이 저장소에는 이력이 있습니다. Next.js 모듈 캐시에는 `@astryxdesign/core`의 resolved export graph가 함께 구워집니다. 느슨한 폴백은 다른 export 형태로 빌드된 캐시를 복원할 수 있고, 그러면 조용히 잘못된 빌드가 나옵니다(#2941의 머지 후 배포가 이 방식으로 깨졌습니다). 키가 바뀌면 콜드 리빌드가 나는 편이 안전합니다.

즉 이 저장소의 정책은 "캐시 hit률 최대화"가 아니라 **"틀린 빌드를 절대 만들지 않기"**입니다. 이번 변경은 그 정책을 건드리지 않고 키만 좁혔습니다.

### 결정 2: merge_group 폴백은 넣지 않았습니다

`github.event.pull_request.number`는 pull_request 이벤트가 아니면 빕니다. 비면 키가 `nextjs-sandbox-pr-...`로 뭉개져서 서로 다른 컨텍스트가 한 키를 공유하게 됩니다. 정확히 지금 고치고 있는 그 버그입니다.

그래서 확인했습니다. 이 job과 캐시 스텝은 job 레벨 `if`로 `github.event_name == 'pull_request'`에만 걸려 있습니다. 키가 평가되는 시점에 PR 번호는 항상 존재합니다. 도달할 수 없는 분기를 위한 방어 코드는 넣지 않고, 대신 그 근거를 주석으로 적었습니다.

### 결정 3: PR끼리의 공유도 (일부러) 끊었습니다

PR 번호로 스코프하면 PR A와 PR B도 캐시를 공유하지 못합니다. 언뜻 손해 같지만 아닙니다. **모든 PR이 서로 다른 basePath를 씁니다.** PR 간 공유 역시 같은 이유로 죽은 캐시가 됩니다.

키 충돌도 확인했습니다. `hashFiles()`는 16진수만 출력하므로 main의 `nextjs-sandbox-<hex>...`가 PR의 `nextjs-sandbox-pr<n>...`와 같아지는 일은 구조적으로 불가능합니다.

그리고 테스트 플랜에는 일부러 **체크되지 않은 항목**을 하나 남겼습니다. "이 PR의 첫 푸시는 캐시 miss가 예상된다 — 그게 수정이 작동한다는 증거다. 후속 커밋을 푸시해 두 번째 run이 `nextjs-sandbox-pr<n>-…`를 복원하고 컴파일이 240초에서 64초급으로 떨어지는지 확인할 것." 머지 시점에 아직 관측되지 않은 것을 관측된 척하지 않는 편이 낫습니다.

## 결과와 배운 점

### 머지 후 5.5일 실측

두 PR은 KST 15:25와 15:48에 머지됐습니다. 머지 후 약 5.5일간의 GitHub Actions 실행 기록을 API로 모아 집계했습니다.

먼저 대표 run 두 개의 타임라인 비교입니다. 개선 전은 [run 29181246330](https://github.com/facebook/astryx/actions/runs/29181246330), 개선 후는 워밍 캐시가 걸린 재푸시 [run 29182864149](https://github.com/facebook/astryx/actions/runs/29182864149)입니다.

| job | 개선 전 | 개선 후 (워밍 캐시 재푸시) |
| --- | --- | --- |
| test | 4분 46초 | 4분 52초 |
| build (storybook+sandbox 직렬) | 7분 49초 | — |
| build-storybook (병렬) | — | 2분 26초 |
| build-sandbox (병렬·워밍) | — | **3분 34초** |
| deploy-preview | 17초 | 1초 미만 |
| **총 소요** | **8분 56초** | **5분 10초** |
| a11y 감사 시작 | 8분 10초 | **2분 43초** |

크리티컬 패스가 `build → deploy-preview`에서 test 스위트로 옮겨갔습니다. 이제 PR CI의 하한은 테스트 자체입니다. 그리고 a11y 감사는 5분 30초 일찍 시작합니다.

전수 집계는 이렇습니다. 성공한 pull_request run만, 문서 사이트 전용 run은 제외했습니다.

| 지표 | 개선 전 (n=53) | 개선 후 (n=122) |
| --- | --- | --- |
| 중앙값 | 8.1분 | **7.2분** (−11%) |
| 정상 run 최댓값 | 21.9분 | **9.4분** (−57%) |
| 워밍 캐시 재푸시 최솟값 | — | **4.95분** |

중앙값 1분보다 중요한 건 두 번째 줄입니다. 개선 전 분포에는 11.6~21.9분짜리 꼬리가 있었습니다. 이 꼬리는 인프라 탓만이 아니었습니다. 항상 콜드로 도는 직렬 `build`(~8분)가 크리티컬 패스의 바닥을 높여 놓았기 때문에, 평범한 큐 지연이 그대로 증폭돼서 나타난 것이었습니다.

개선 후 정상 run 118건은 전부 **4.95~9.4분** 구간에 들어옵니다. 코드가 만들던 긴 꼬리가 사라졌습니다.

### 이 숫자들의 한계

성과 리포트에 적어 둔 한계를 그대로 옮깁니다.

**1. 두 PR의 효과는 분리 측정할 수 없습니다.** 머지 간격이 23분이라 그 사이의 run으로는 통계를 낼 표본이 안 나옵니다. 위 분포는 전부 **#3811과 #3864의 합산 효과**입니다. 병렬화가 몇 분, 캐시 수정이 몇 분이라고 나눠 말할 근거가 없습니다.

**2. 러너 백로그 이상치 4건이 있습니다.** 개선 후 창에서 10분을 넘긴 run은 5일간 4건인데, 전부 7월 13일 16:30~17:00 UTC의 GitHub 러너 백로그 클러스터(74~83분)입니다. job 실행 시간 자체는 정상이고 job 사이 대기만 60분 넘게 붙어 있었습니다. 중앙값에는 영향이 없어 통계에는 포함하되 분포에서는 축 밖 이상치로 표기했습니다.

**3. 측정 단위에 큐 대기가 일부 포함됩니다.** run 소요 시간은 GitHub Actions API의 `startedAt → updatedAt`이라 concurrency 그룹 대기가 섞일 수 있습니다. 전/후 동일 조건입니다. 전/후 구분점은 #3864 머지 시각(7/12 06:48 UTC)이고, 두 PR 사이 24분간의 run은 제외했습니다.

**4. 사전 예측과 실측이 다릅니다.** PR 본문에서는 "~6.5분", 두 PR을 합치면 "~4분대"를 예상했습니다. 실측 중앙값은 7.2분, 최솟값은 4.95분입니다. 예측은 워밍 캐시가 걸린 재푸시의 크리티컬 패스만 본 값이고, 실측 전수에는 첫 푸시와 core를 건드린 푸시(캐시 키가 갈리므로 콜드)가 함께 들어 있습니다. 다만 이 데이터만으로 그 비율을 분해하지는 못했습니다.

### 배운 점

**1. "캐시 hit"은 성공 신호가 아닙니다.** 봐야 할 것은 hit rate가 아니라 hit 이후의 실제 컴파일 시간이고, 그게 의미 있는지는 콜드 대조군과 비교해야 압니다. 4.0분 대 3.9분이라는 두 숫자가 나란히 놓이기 전까지 아무도 이 버그를 몰랐습니다.

**2. 캐시 키에는 산출물을 바꾸는 입력이 전부 들어가야 합니다.** lock 해시와 dist 해시는 들어갔는데 basePath는 빠져 있었습니다. 빌드 결과를 바꾸는 환경변수는 의존성만큼이나 키의 일부입니다. 키에서 빠진 입력은 캐시를 무효화하는 게 아니라 조용히 죽은 캐시를 만듭니다.

**3. 병렬화의 이득은 중앙값보다 꼬리에서 먼저 보입니다.** 중앙값은 1분 남짓 줄었지만 최악의 정상 run은 21.9분에서 9.4분이 됐습니다. 매일 CI를 기다리는 사람이 체감하는 건 후자입니다.

**4. 체크 이름은 API입니다.** `build`라는 이름의 join gate를 남긴 건 성능과 무관한 결정이지만, 이게 없으면 브랜치 보호 규칙이 조용히 무력화됩니다. 성능 PR일수록 "무엇을 안 바꿨는가"를 같이 증명해야 합니다.

**5. 예측은 PR 본문에, 검증은 머지 후에.** 그리고 예측이 빗나가면 그것도 적습니다. ~4분대를 예상했지만 중앙값은 7.2분이었습니다. 이 차이를 감추면 다음 최적화의 견적이 계속 낙관적으로 틀립니다.

## 마치며

정리하면 이렇습니다. PR CI의 `build` job은 6분 30초짜리 직렬 파이프라인이었고 그중 4분 15초가 sandbox Next.js export였습니다. 이걸 별도 job으로 떼어 병렬로 돌리고, 기존 체크 이름은 join gate로 지켰습니다. 그런데 떼어 놓고 보니 sandbox는 캐시를 hit하고도 매번 콜드 컴파일을 하고 있었습니다. PR과 main이 basePath가 다른데 캐시 키를 공유했기 때문입니다. 키에 PR 번호를 넣어 각 PR이 자기 캐시를 굽게 했습니다.

머지 후 5.5일 실측으로 PR CI 중앙값은 8.1분에서 7.2분, 정상 run 최댓값은 21.9분에서 9.4분이 됐고, 접근성 감사는 8분 10초 대신 2분 43초에 시작합니다. 다시 말하지만 두 PR의 효과를 나눠서 말할 수는 없습니다.

여러분의 CI에도 캐시 스텝이 있다면 한 번만 확인해 보세요. `Cache restored successfully` 다음 줄의 빌드 시간이 캐시가 없던 시절과 정말로 다른가요. 저는 그 두 줄을 한참 그냥 지나쳤습니다. 비슷하게 "hit인데 안 빨라지는" 캐시를 만나신 적 있다면 댓글로 공유해 주세요.

- 근거 PR: [facebook/astryx#3811 — perf(ci): build sandbox preview in parallel with storybook](https://github.com/facebook/astryx/pull/3811), [facebook/astryx#3864 — perf(ci): key sandbox next cache by PR to stop cross-basepath invalidation](https://github.com/facebook/astryx/pull/3864) (둘 다 2026-07-12 머지)
