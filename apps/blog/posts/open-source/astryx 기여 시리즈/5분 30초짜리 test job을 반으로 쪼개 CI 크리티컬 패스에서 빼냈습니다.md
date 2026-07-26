---
title: '5분 30초짜리 test job을 반으로 쪼개 CI 크리티컬 패스에서 빼냈습니다 — GitHub Actions vitest 2-way 샤딩'
date: '2026-07-26'
published: false
slug: 'astryx-test-job-sharding'
thumbnail: '/og/astryx-test-job-sharding.png'
---

# 5분 30초짜리 test job을 반으로 쪼개 CI 크리티컬 패스에서 빼냈습니다 — GitHub Actions vitest 2-way 샤딩

## 이 글을 읽고 나면

- 크리티컬 패스가 이벤트 종류(첫 push / 재push / merge queue)마다 다르다는 걸 실측으로 확인하게 됩니다
- vitest `--shard` 매트릭스와 join 게이트로 기존 체크 이름을 유지하며 job을 쪼개는 패턴을 배웁니다
- 샤드 개수를 감이 아니라 고정비와 밸런스로 결정하는 방법을 알게 됩니다
- 더 빠르게 만들 수 있는데도 2개에서 멈추는 판단이 왜 합리적인지 이해합니다

> **CI 최적화 시리즈**
>
> 1. 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. deploy job은 이제 27초면 끝납니다
> 4. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일
> 5. fork PR을 머지했더니 CI가 빨간불이 됐습니다
> 6. 5분 30초짜리 test job을 반으로 쪼개 CI 크리티컬 패스에서 빼냈습니다 **(현재 글)**

## 들어가며

시리즈 3편(deploy job) 마지막 문장은 이랬습니다.

> 다음 수는 아마 vitest 샤딩이 될 겁니다.

그 다음 수가 이 글입니다. deploy 파이프라인을 병렬화하고, 샌드박스 빌드를 분리하고, 죽은 Next.js 캐시를 살려내고 나니 병목이 세 번 이동해서 결국 `test` job 위에 앉았습니다. 이번엔 그 job을 직접 열어봤습니다.

이 글의 근거 PR은 [facebook/astryx#4103](https://github.com/facebook/astryx/pull/4103)입니다. 문제 정의는 이슈 [#4339](https://github.com/facebook/astryx/issues/4339)에 따로 떼어 정리했습니다. 다만 이 PR은 이 글을 쓰는 시점에 **아직 열려 있는 제안**입니다. 그래서 이 글은 "이렇게 고쳤습니다"가 아니라 "이렇게 제안했고 근거는 이겁니다"에 가깝습니다. 머지 후 실측이 아니라, 제안 단계에서 어디까지 숫자로 밀어붙일 수 있는지에 대한 기록이라고 봐주시면 좋겠습니다.

바뀐 파일은 `.github/workflows/ci.yml` **하나, +36/-13줄**입니다. 그 서른여섯 줄을 위해 쟀던 것들이 이 글의 내용입니다.

## 크리티컬 패스는 하나가 아니었습니다

"CI가 느리다"를 고치려면 먼저 무엇이 마지막에 끝나는지를 알아야 합니다. 그런데 astryx의 PR CI를 재보니, 그 답이 **하나가 아니었습니다**.

같은 PR([#4101](https://github.com/facebook/astryx/pull/4101))의 실제 실행 두 건을 job 단위로 뽑았습니다. 하나는 첫 push(Next.js 캐시 콜드), 하나는 같은 PR에 다시 push한 실행(웜)입니다.

| Job | 첫 push (콜드, run 29749301708) | 재push (웜, run 29752691491) |
|---|---|---|
| build-sandbox | **385초** ← 크리티컬 | 206초 |
| **test** | 327초 (58초 뒤) | **324초 ← 크리티컬** |
| build-storybook | 164초 | 167초 |

표를 세로가 아니라 가로로 읽어야 합니다. `test`는 두 실행에서 327초와 324초로 **거의 움직이지 않습니다**. 반면 build-sandbox는 385초에서 206초로 절반 가까이 내려갑니다. PR별 Next.js 캐시가 붙기 때문입니다(시리즈 3편에서 캐시 키를 PR별로 분리한 그 PR의 효과입니다).

그래서 상황별로 크리티컬 패스가 이렇게 갈립니다.

- **첫 push**: build-sandbox가 여전히 가장 깁니다. 하지만 `test`가 **58초** 뒤에 붙어 있을 뿐입니다.
- **재push**: build-sandbox가 3분 30초대로 내려오면서 `test`(5분 30초대)가 크리티컬 패스가 됩니다. 그리고 재push는 리뷰 피드백을 반영하며 기여자가 실제로 반복해서 기다리는 루프입니다.
- **merge queue(`merge_group`)와 main**: 이쪽은 애초에 build-sandbox를 돌리지 않습니다. `test`가 그냥 크리티컬 패스입니다.

> 첫 push만 보면 `test`는 2등입니다. 하지만 사람이 실제로 반복해서 기다리는 경로에서는 이미 1등이었습니다.

여기에 시간축이 하나 더 있습니다. `test`는 **컴포넌트 수에 선형으로 자라는 유일한 job**입니다. 당시 스위트는 359개 파일 / 7,118개 테스트였습니다. 빌드는 캐시로 눌러왔지만, 테스트는 컴포넌트가 늘 때마다 정직하게 길어집니다. 지금 58초 차이는 다음 분기에 사라질 숫자입니다.

## test job 안을 열어봤습니다

그다음은 5분 30초를 무엇이 먹고 있는지입니다. step 단위로 쪼갰습니다.

| 구간 | 시간 |
|---|---|
| 러너 셋업 (checkout + setup 액션) | 약 30초 |
| vitest 실행 | 약 284초 |

그리고 vitest가 리포트한 내부 내역입니다. 워커별 합산이라 벽시계보다 큽니다(시리즈 2편에서 한 번 데인 그 숫자입니다).

| 항목 | 합계 |
|---|---|
| 테스트 CPU (워커 전체) | 413초 |
| jsdom environment | 148초 |
| import | 110초 |
| transform | 54초 |

여기서 중요한 건 개별 항목이 아니라 **비율**입니다. 5분 30초 중 4분 44초가 vitest이고, 고정비는 30초입니다. 그리고 vitest 구간은 파일 단위로 잘라 나눌 수 있습니다. 즉 이 job은 **깔끔하게 샤딩되는 모양**을 하고 있었습니다.

시리즈 2편에서는 같은 job의 낭비(불필요한 jsdom 부팅)를 걷어냈습니다. 이번엔 걷어낼 낭비가 아니라 **나눌 일**이 남은 상태였습니다.

## 설계: 샤드 매트릭스 + join 게이트

vitest는 `--shard=1/2` 형태로 스위트를 나눠 실행합니다. astryx의 `test` 스크립트는 `vitest run`이라, `pnpm test --shard=1/2`처럼 그대로 플래그가 넘어갑니다.

문제는 워크플로우 쪽입니다. 단일 `test` job을 매트릭스로 바꾸면 체크 이름이 `test`에서 `test (shard 1/2)` / `test (shard 2/2)`로 바뀝니다. 브랜치 보호 규칙과 각종 도구가 `test`라는 이름에 걸려 있는데, 그게 사라지면 게이트가 조용히 풀립니다.

다행히 같은 저장소에 선례가 있었습니다. `build-storybook`과 `build-sandbox`를 나누면서 `build`라는 이름을 유지하는 **join 게이트**가 이미 ci.yml 안에 있었습니다. 같은 패턴을 그대로 가져왔습니다.

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

      - name: Check copyright headers
        if: matrix.shard == '1/2'
        run: ./scripts/add-copyright.sh --check
      # exports sync / token docs 체크도 동일하게 shard 1에서만

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

작은 결정이 세 개 들어 있습니다.

**저장소 동기화 체크는 shard 1에서만.** 저작권 헤더, `package.json` exports 동기화, 토큰 문서 동기화 — 이 셋은 테스트가 아니라 저장소 정합성 검사입니다. 두 샤드에서 똑같이 돌 이유가 없어서 `if: matrix.shard == '1/2'`로 한 번만 돌게 했습니다.

**`fail-fast: false`.** 기본값이면 한쪽 샤드가 빨개지는 순간 다른 쪽이 취소됩니다. 그러면 기여자는 실패 리포트의 절반만 받고, 고쳐서 다시 올린 뒤에야 나머지 절반을 봅니다. 왕복이 늘어납니다. 그래서 껐습니다.

**docsite-only PR 처리는 job 레벨로 올렸습니다.** 기존 job은 스텝마다 `if: needs.check-scope.outputs.docsite_only != 'true'`를 달아 "스킵 안내 메시지만 찍고 끝나는 job"이었습니다. 매트릭스로 바뀐 지금은 job 레벨 `if` 하나로 샤드 전체가 스킵되고, join 게이트도 `result != 'skipped'` 조건으로 함께 스킵됩니다. 예전 단일 job이 사실상 하던 것과 결과가 같습니다.

## 왜 하필 2개인가

여기가 이 PR에서 제일 오래 고민한 부분입니다. 8개로 쪼개면 `test`는 1분대가 됩니다. 왜 2개에서 멈췄을까요.

> 목표는 `test`를 최소화하는 게 아니라 **크리티컬 패스에서 빼내는 것**입니다.

기준선이 있습니다. 웜 재push에서 build-sandbox는 206초, 콜드 첫 push에서는 385초입니다. `test`가 그 아래로만 내려가면 사람이 기다리는 시간에서는 사라집니다.

2샤드로 나눈 예상치는 이렇습니다. 러너 셋업 약 30초 + vitest 약 145초 + node 프로젝트의 globalSetup(프로세스마다 `@astryxdesign/core`를 한 번 빌드) ≈ **약 3분**. 웜 206초보다 아래고, 콜드 385초보다는 한참 아래입니다. 여기서 더 쪼개는 건 **아무도 기다리지 않는 숫자를 줄이는 일**입니다.

그리고 더 쪼갤수록 손해가 커지는 이유가 세 개 있습니다.

**1. 샤드마다 고정비를 다시 냅니다.** 러너 셋업 약 30초는 샤드 수만큼 곱해집니다. 여기에 node 프로젝트의 globalSetup이 vitest 프로세스마다 core를 빌드합니다. 그래서 수익 곡선이 빠르게 눕습니다.

| 샤드 늘리기 | 추가로 줄어드는 시간 |
|---|---|
| 2 → 4 | 약 70초 |
| 4 → 8 | 35초 미만 |

(둘 다 낙오 샤드(straggler) 효과를 계산에 넣기 전 수치입니다.)

**2. vitest는 소요 시간이 아니라 파일 개수로 나눕니다.** astryx 스위트에는 유독 무거운 파일이 몇 개 있습니다. Markdown 성능 테스트, Tokenizer, TabList 같은 것들입니다. 샤드가 많아질수록 이 무거운 파일 한 개가 한 샤드를 통째로 끌고, 나머지 샤드는 먼저 끝나서 논니다. 그런데 join 게이트는 **가장 느린 샤드**를 기다립니다. 밸런스가 나빠지는 만큼 실효 이득이 깎입니다.

**3. 나중에 늘리는 건 한 줄입니다.** 스위트가 자라 다시 build-sandbox를 추월하면 `matrix.shard` 배열만 고치면 됩니다. 지금 필요 없는 복잡도를 미리 살 이유가 없습니다.

비용 쪽도 확인했습니다. 공개 저장소는 표준 러너의 Actions 사용 시간이 무료입니다. 두 번째 러너를 띄우는 데 드는 추가 비용은 없습니다.

## 검증: 로컬 반쪽과 실제 CI 실행

워크플로우 변경은 "머지해봐야 아는" 종류의 변경이라 위험합니다. 그래서 두 단계로 나눠 확인했습니다.

**로컬에서 플래그가 실제로 통하는지.** astryx는 vitest 프로젝트를 `ui`/`node`로 나눠 쓰고 있습니다(시리즈 2편의 그 분리입니다). `--shard`가 `pnpm test` 스크립트를 통과해서 vitest까지 도달하는지, 그리고 프로젝트 필터와 조합이 되는지를 봐야 했습니다.

```bash
pnpm test --shard=1/2 --project node
```

결과는 node 프로젝트 파일 130개 중 정확히 **65개**, **1,328개 테스트 통과**였습니다. 딱 반쪽입니다. 플래그가 스크립트를 통과하고 프로젝트 설정과도 충돌하지 않는다는 확인입니다.

**그다음은 PR 자신의 CI 실행.** 워크플로우 PR의 좋은 점이자 무서운 점은, 그 PR의 CI가 곧 변경의 실행 결과라는 것입니다. 매트릭스와 join 게이트가 처음부터 끝까지 돌아갑니다.

| 체크 | 소요 |
|---|---|
| test (shard 1/2) | 3분 09초 |
| test (shard 2/2) | 2분 42초 |
| test (join 게이트) | 4초 |
| build-sandbox (콜드) | 6분 31초 |
| build-storybook | 2분 34초 |

예상했던 "약 3분"이 3분 09초와 2분 42초로 나왔습니다. 그리고 이 실행은 콜드 첫 push였는데, build-sandbox가 6분 31초입니다. `test`는 이제 크리티컬 패스보다 **3분 이상 앞서** 끝납니다. 예전에는 58초 뒤였습니다.

join 게이트가 4초라는 점도 의미가 있습니다. 이 job은 러너를 하나 더 쓰지만 아무것도 빌드하지 않고 `needs`의 결과만 확인합니다. 체크 이름을 지키는 값으로 4초는 싼 편입니다.

## 스코프를 ci.yml로 좁힌 이유

이 PR은 `ci.yml`만 건드립니다. `pull_request`와 `merge_group` — 사람이 실제로 기다리는 경로입니다.

`deploy.yml`에도 main에서 전체 스위트를 돌리는 test job이 있습니다. 하지만 그 job은 `pnpm test`를 빌드/타입체크 같은 배포 게이트와 **한 job 안에 섞어서** 실행합니다. 여기에 같은 샤딩을 적용하려면 배포 의존성 그래프를 손봐야 합니다. 그래서 후속으로 남기고 PR 본문에 그렇게 적었습니다.

시리즈 3편에서 배운 것과 같은 맥락입니다. 한 job이 서로 다른 성격의 일(게이트와 빌드, 게이트와 테스트)을 안고 있으면, 그 job은 쪼개기 전까지 계속 걸림돌이 됩니다.

## 배운 점

**1. 크리티컬 패스는 이벤트 종류마다 다릅니다.** 첫 push 하나만 보고 "test는 2등이니 괜찮다"고 판단했다면 이 PR은 없었습니다. 재push, merge queue, main을 각각 재보니 세 곳 중 두 곳에서 이미 1등이었습니다. 파이프라인을 측정할 땐 **어떤 이벤트의 실행인지**를 함께 적어야 합니다.

**2. 체크 이름은 API입니다.** job을 쪼개는 리팩터링에서 제일 조용히 깨지는 건 성능이 아니라 브랜치 보호입니다. join 게이트는 "내부 구조는 바꾸되 밖으로 보이는 이름은 유지한다"는, 코드에서 늘 하던 일을 CI에서 하는 것뿐입니다. 저장소에 이미 있는 패턴(`build` 게이트)을 따라간 덕에 리뷰어에게 설명할 것도 줄었습니다.

**3. 최적화에는 멈출 지점이 있습니다.** 8샤드는 숫자를 더 예쁘게 만들지만, 그 숫자를 기다리는 사람은 없습니다. "무엇을 최소화할 것인가"보다 "무엇 아래로 내려가면 되는가"를 먼저 정하면 과잉 설계를 피할 수 있습니다. 그리고 그 기준선(build-sandbox 206초 / 385초)은 이미 측정해둔 값이었습니다.

**4. 기각 근거를 PR 본문에 미리 적으면 왕복이 줄어듭니다.** 시리즈 2편에서도 썼던 방법입니다. "왜 4개가 아닌가"에 대한 답(고정비 재지불, 파일 개수 기반 샤딩, 낙오 샤드)을 표와 함께 미리 넣어두면, 그 질문이 리뷰 코멘트로 오지 않습니다.

## 마치며

정리합니다.

- astryx의 단일 `test` job(약 5분 30초)은 재push·merge queue·main에서 이미 CI 크리티컬 패스였고, 콜드 첫 push에서도 build-sandbox와 **58초** 차이였습니다
- job 내부는 러너 셋업 약 30초 + vitest 약 284초로, vitest 구간이 깔끔하게 샤딩되는 모양이었습니다
- `pnpm test`를 2-way `vitest --shard` 매트릭스로 나누고, 과거 `test` 체크 이름을 유지하는 join 게이트를 붙였습니다. 저장소에 이미 있던 `build` join 게이트와 같은 패턴입니다
- 샤드는 2개입니다. 목표가 최소화가 아니라 "build-sandbox 아래로 내리기"였고, 샤드마다 러너 셋업 + globalSetup core 빌드를 다시 내야 하며(2→4는 약 70초, 4→8은 35초 미만), vitest가 파일 개수로 나누는 탓에 샤드가 늘수록 밸런스가 나빠지기 때문입니다
- 로컬에서 `--shard=1/2 --project node`가 정확히 반쪽(65/130 파일, 1,328 테스트)을 돌리는 것을 확인했고, PR 자신의 CI에서 두 샤드가 3분 09초 / 2분 42초, join 게이트가 4초로 끝났습니다
- 바뀐 파일은 `ci.yml` 하나(+36/-13). `deploy.yml`은 test가 배포 게이트와 한 job에 묶여 있어 후속 과제로 남겼습니다

시리즈 3편에서 "병목은 사라지지 않고 이동한다"고 썼는데, 그 이동의 다음 목적지가 정확히 `test`였습니다. 이번에 그것도 옮겼으니, 다음 병목은 아마 다시 build-sandbox의 콜드 컴파일이 될 겁니다. 파이프라인 최적화는 끝나는 일이 아니라 **가장 긴 가지를 계속 따라가는 일**에 가깝다는 걸 매번 다시 배웁니다.

여러분의 CI에서 가장 마지막에 끝나는 job은 무엇인가요. 그리고 그 답은 첫 push와 재push에서 같은가요? 두 실행을 나란히 놓고 재보시면, 생각과 다른 job이 나올 수도 있습니다. 결과가 의외였다면 댓글로 공유해 주세요.

- 근거 PR: [facebook/astryx#4103 — ci: shard the PR test job two ways to take vitest off the critical path](https://github.com/facebook/astryx/pull/4103) (작성 시점 기준 open)
- 관련 이슈: [facebook/astryx#4339 — The `test` job is the CI critical path on re-pushes, merge queue, and main](https://github.com/facebook/astryx/issues/4339)
