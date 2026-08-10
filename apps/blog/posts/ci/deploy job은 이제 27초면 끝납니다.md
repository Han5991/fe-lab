---
title: 'deploy job은 이제 27초면 끝납니다'
date: '2026-07-12'
status: draft
slug: 'astryx-deploy-pipeline-parallel'
thumbnail: '/og/astryx-deploy-pipeline-parallel.png'
tags: ['github-actions', 'ci', 'deploy']
---

## 이 글을 읽고 나면

- CI 파이프라인을 DAG로 보고, wall time을 결정하는 크리티컬 패스를 찾는 관점을 얻습니다
- deploy job을 '빌드하는 곳'이 아니라 '조립하고 push하는 곳'으로 재정의하는 설계를 배웁니다
- `gh api`로 job별 시작/종료 시각을 뽑아 머지 전후를 같은 잣대로 비교하는 측정 방법을 알게 됩니다
- 병목은 제거되는 게 아니라 이동한다는 것을 실측 데이터로 확인합니다

## 들어가며

> **느린 CI 뜯어고치기**
>
> 1. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 2. 캐시가 hit인데 매번 콜드 빌드였습니다
> 3. deploy job은 이제 27초면 끝납니다 **(현재 글)**
> 4. CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다

2026년 7월, 열흘 남짓 동안 facebook/astryx에 PR 17개를 머지시켰습니다. astryx는 메타가 오픈소스로 운영하는 내부 도구용 디자인 시스템입니다. main에 머지될 때마다 Deploy 워크플로우가 gh-pages로 Storybook과 샌드박스를 배포합니다. 이번 글의 주인공이 바로 그 워크플로우입니다.

지금 astryx의 Actions 탭에서 최근 Deploy 실행을 열면, deploy job이 **27초** 만에 끝나 있습니다. Storybook 풀 빌드에 Next.js 샌드박스까지 얹어 사이트 전체를 배포하는 job인데 말이죠. 대체 뭘 하길래 27초일까요. 답은 간단합니다. **아무것도 빌드하지 않기 때문입니다.**

이 글은 그 파이프라인을 직렬에서 병렬로 바꾼 PR [#3812](https://github.com/facebook/astryx/pull/3812)의 기록입니다. 머지에서 배포 완료까지 평균 12분 21초가 걸리던 것이 6분 33초가 됐습니다. 47% 단축입니다. 그리고 그 과정에서, 병목은 없어지는 게 아니라 이동한다는 걸 숫자로 목격했습니다.

## 머지 한 번에 12분 21초

먼저 머지 전의 구조입니다. Deploy 워크플로우는 job 두 개가 한 줄로 서 있었습니다.

```text
test (~6분) ──완료──▶ deploy (전체 빌드 + push, 4~8분)
```

test job이 전체 테스트를 돌리고 끝나야, deploy job이 시작됩니다. 그런데 이 deploy job이 하는 일이 많았습니다. 패키지 빌드, Storybook 빌드, Next.js 샌드박스 빌드를 처음부터 전부 수행하고, 마지막에 gh-pages로 push합니다. 완전 직렬입니다.

더 아까운 사실도 있습니다. test job도 typecheck 게이트 때문에 자체적으로 풀 빌드를 한 번 합니다. 즉 main에 push할 때마다 같은 사이트 빌드를 연달아 **두 번** 하고 있었습니다.

머지 직전의 성공 실행 5회를 실측했습니다. 첫 job 시작부터 마지막 job 종료까지, 10m09s에서 14m34s 사이였고 평균 **12m21s**였습니다. 편차의 주범은 deploy job이었습니다. Next.js 캐시 상태에 따라 재빌드가 혼자 **4m14s~8m01s**를 오갔습니다. 머지하고 나서 사이트에 반영됐는지 확인하려면, 그날 운에 따라 10분에서 15분을 기다려야 했던 겁니다.

왜 처음부터 이렇게 만들어졌을까요. 나무랄 수 없는 출발점이었다고 생각합니다. "테스트를 통과한 커밋만 배포한다"는 요구사항을 가장 단순하게 구현하면 이 모양이 됩니다. `needs: test` 한 줄로 게이트를 걸고, 배포에 필요한 산출물은 deploy job 안에서 직접 빌드하는 것. 배선이 가장 적은 형태니까요. 문제는 요구사항이 **게이트**인데 구현이 **직렬화**라는 점입니다. 테스트가 지켜야 하는 건 마지막 push 한 줄이지, 빌드 전체가 아닙니다.

## 파이프라인은 합이 아니라 max입니다

CI 파이프라인을 job의 나열이 아니라 **의존성 그래프(DAG)**로 보면 답이 보입니다. wall time을 결정하는 건 job 시간의 합이 아니라, 그래프에서 가장 긴 경로 — 크리티컬 패스입니다.

그럼 묻게 됩니다. 빌드는 정말 테스트에 의존하나? 아닙니다. 빌드와 테스트는 서로의 결과물이 필요 없습니다. 의존이 있는 건 **push뿐**입니다. push는 테스트 통과(게이트)와 빌드 산출물(내용물) 둘 다를 기다려야 하지만, 그 둘끼리는 동시에 돌 수 있습니다. 그래서 구조를 이렇게 바꿨습니다.

```text
test  (~6분)  ─┐
               ├──▶ deploy (조립 + push, 22~27초)
build (~6~7분)─┘
```

변경 내용은 세 가지입니다.

- **`build` job 신설** — 기존 deploy가 하던 빌드(패키지 + Storybook + 샌드박스)를 그대로 옮겨와, test와 동시에 시작합니다. 산출물 세 개(Storybook dist, 샌드박스 out, 랜딩 페이지 CSS)를 아티팩트로 올립니다.
- **`deploy` job 축소** — `needs: [test, build]`로 둘을 기다렸다가, 아티팩트 다운로드 → gh-pages의 `pr/`과 `reports/` 보존 → 배포 디렉터리 조립 → push. 이게 전부입니다. Node 설치도, 빌드 트리 체크아웃도 없습니다.
- **게이트는 그대로** — test가 실패하면 push는 없습니다. 이전과 동일합니다. 달라진 건 그 게이트가 더 이상 빌드까지 직렬로 세워두지 않는다는 것뿐입니다.

새로운 발명은 아닙니다. job 사이에 아티팩트로 산출물을 넘기는 방식은 같은 저장소의 ci.yml이 PR 프리뷰마다 이미 쓰고 있던 메커니즘입니다. 그걸 Deploy 워크플로우에도 적용한 것뿐입니다. 참고로 deploy가 보존하는 `pr/` 디렉터리는 시리즈 4편에서 cleanup 워크플로우와 경쟁하던 바로 그 구조입니다.

머지 전에 검증도 했습니다. 제 fork에서 이 워크플로우를 그대로 dispatch해 돌렸습니다. fork는 Pages가 꺼져 있어서 실제 배포 없이 전 과정을 확인할 수 있었습니다. test와 build가 같은 시각에 출발했고, deploy는 14초 만에 끝났으며, 결과 트리에 `storybook/`, `sandbox/`, CSS 에셋이 기대한 레이아웃대로 들어 있었습니다.

## 결과: 12분 21초에서 6분 33초로

### 측정: 체감 말고 같은 잣대로

"빨라진 것 같은데요"로는 부족합니다. 시리즈 1편에서 배운 게 하나 있다면, 최적화의 효과는 **어디서 어떻게 측정하느냐**에 따라 다르게 보인다는 것입니다. 그래서 이번에도 머지 전후를 같은 방식으로 쟀습니다.

방법은 GitHub API입니다. 실행 하나의 job별 시작/종료 시각을 이렇게 뽑을 수 있습니다.

```bash
# 최근 Deploy 실행 목록
gh run list --repo facebook/astryx --workflow=deploy.yml \
  --branch main --status success --limit 10

# 실행 하나의 job별 시작/종료 시각
gh api repos/facebook/astryx/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | "\(.name)\t\(.started_at)\t\(.completed_at)"'
```

기준은 **첫 job의 `started_at`부터 마지막 job의 `completed_at`까지**로 통일했습니다. 실행 생성 시각부터 재면 concurrency group의 큐 대기가 섞이는데, 그건 파이프라인 모양과 무관한 노이즈입니다. 중요한 건 머지 전과 후에 **같은 기준**을 적용하는 것입니다. 여러분의 저장소에서도 저장소 이름만 바꾸면 그대로 쓸 수 있습니다.

결과입니다.

| | wall time (첫 job 시작 → 마지막 job 종료) |
|---|---|
| 머지 전 5회 | 10m09s ~ 14m34s, 평균 **12m21s** |
| 머지 후 3회 | 5m33s / 6m30s / 7m36s, 평균 **6m33s** |
| 차이 | **−47%** |

deploy job 자체는 더 극적입니다. **4m14s~8m01s → 22~27초.** 4~8분짜리 재빌드가 사라지고 다운로드와 push만 남았으니까요. 서두의 27초는 이렇게 나온 숫자입니다.

wall time이 합에서 max(test, build)로 바뀌면서, deploy 재빌드가 만들던 4분짜리 널뛰기도 크리티컬 패스에서 빠졌습니다. 다만 머지 후 3회도 5m33s에서 7m36s까지 2분의 폭이 있습니다. 이 편차는 어디서 왔을까요. 여기서 이 글에서 제일 흥미로운 숫자가 나옵니다.

### 병목은 사라지지 않고 이동합니다

머지 후 세 번째 실행의 job별 시간입니다.

| job | 시간 |
|---|---|
| test | 6m21s |
| build | **7m05s** |
| deploy | 27초 안팎 |

build가 test를 **추월**했습니다. 앞의 두 실행에서는 test가 크리티컬 패스였는데, 세 번째에서는 샌드박스의 Next.js 컴파일이 길어지면서 build가 가장 긴 가지가 됐습니다. 그 실행의 wall time이 3회 중 최장인 7m36s였던 이유입니다.

이게 병렬화의 정직한 얼굴이라고 생각합니다. 직렬을 병렬로 바꾸면 병목이 없어지는 게 아닙니다. **가장 긴 가지로 이동합니다.** 어제까지 이 파이프라인의 wall time을 정하던 건 deploy의 재빌드였습니다. 오늘은 max(test, build)이고, 그 max의 주인이 실행마다 test와 build 사이를 오갑니다. 다음에 줄여야 할 대상이 뭔지, 그래프가 스스로 알려주는 셈입니다.

그래서 다음 단계도 자연스럽게 정해졌습니다. 같은 원리를 옆 파이프라인 — PR CI — 에 적용하는 것입니다. 그리고 이 글의 초안을 다듬던 바로 그날 오후, 실제로 일어났습니다.

### 후속: 같은 날, 병목이 두 번 더 이동했습니다

초안을 다듬는 사이 후속 PR 두 개가 나란히 머지됐습니다. 예고만 하고 끝내기엔 숫자가 아까워서, 실측을 그대로 붙입니다.

**[#3811](https://github.com/facebook/astryx/pull/3811) — PR CI에서도 샌드박스 빌드를 분리.** PR CI의 build job도 Storybook 빌드와 샌드박스 빌드를 직렬로 안고 있었습니다. 이걸 `build-storybook` ∥ `build-sandbox` 병렬 job으로 쪼갠 결과, PR CI 크리티컬 패스가 **8m56s → 평균 7m04s**(머지 후 4회 실측, 6m09s~7m30s)로 줄었습니다. 그리고 예상대로 병목은 이동했습니다. 이제 가장 긴 가지는 build-sandbox — 정확히는 그 안의 Next.js 콜드 컴파일 ~4분입니다.

**[#3864](https://github.com/facebook/astryx/pull/3864) — 그 콜드 컴파일의 범인은 죽은 캐시.** PR 빌드와 main 배포가 같은 캐시 키를 쓰는데 basePath가 서로 달라서, Next.js가 복원된 캐시를 매번 내부 무효화하고 있었습니다. 캐시 "히트"인데 4분 풀컴파일. 게다가 히트로 처리되니 PR은 자기 캐시를 저장할 기회조차 없었습니다. 키에 PR 번호를 넣어 분리하자, 같은 PR의 두 번째 push부터 진짜 웜 빌드가 됩니다:

| | 콜드 (PR 첫 push) | 웜 (같은 PR 재push) |
|---|---|---|
| Next.js 컴파일 | 4.1min | **60s** |
| Build Sandbox 스텝 | 5m13s | **2m01s** |
| build-sandbox job 전체 | 6m48s | **3m34s** |

웜 재push의 빌드 경로는 약 4분까지 내려왔습니다. 그러자 병목은 **또** 이동했습니다 — 이번엔 test job(~4m50s)입니다. 본문에서 "다음에 줄여야 할 대상을 그래프가 스스로 알려준다"고 썼는데, 하루 사이에 세 번을 알려줬습니다. deploy의 재빌드 → 샌드박스 콜드 컴파일 → 이제 테스트. 다음 수는 아마 vitest 샤딩이 될 겁니다.

## 마치며

정리합니다.

- astryx의 Deploy 워크플로우는 test(~6분) 완료 후 deploy가 전체 빌드 + push(4~8분)를 수행하는 완전 직렬이었고, 머지에서 배포까지 평균 12m21s가 걸렸습니다
- 빌드를 test와 병렬인 build job으로 분리하고 deploy를 조립 + push만 남기자, 평균 6m33s — **47% 단축**됐습니다. deploy job 자체는 4~8분에서 **22~27초**가 됐습니다
- 파이프라인을 DAG로 보면 wall time은 합이 아니라 크리티컬 패스, 즉 max(test, build)입니다. 게이트(테스트 통과)와 직렬화(빌드 대기)는 다른 요구사항입니다
- 머지 후 세 번째 실행에서 build(7m05s)가 test(6m21s)를 추월했습니다. 병목은 제거되는 게 아니라 이동합니다 — 같은 날 머지된 후속 [#3811](https://github.com/facebook/astryx/pull/3811)·[#3864](https://github.com/facebook/astryx/pull/3864)가 병목을 두 번 더 옮겼습니다 (PR CI 8m56s → 7m04s, 웜 재push 컴파일 4.1min → 60s)
- 효과는 `gh api`로 job별 started_at/completed_at을 뽑아, 머지 전후에 같은 기준(첫 job 시작 → 마지막 job 종료)으로 측정했습니다

여러분의 배포 파이프라인에서 deploy job은 몇 분짜리인가요. 그 안에서 빌드를 하고 있다면, 그 빌드는 정말 앞 job의 결과를 기다려야 하는 일인가요. 위의 `gh api` 명령으로 job별 시간을 한번 뽑아보세요. 직렬로 서 있을 이유가 없는 job이 발견됐다면, 혹은 병렬화 후 병목이 어디로 이동했는지 측정해 본 적이 있다면 댓글로 공유해 주세요. 남의 파이프라인 이야기가 늘 가장 좋은 교재입니다.

- 근거 PR: [facebook/astryx#3812 — perf(deploy): build in parallel with test, deploy only assembles and pushes](https://github.com/facebook/astryx/pull/3812) (2026-07-12 머지)
- 후속 PR: [facebook/astryx#3811 — perf(ci): build sandbox preview in parallel with storybook](https://github.com/facebook/astryx/pull/3811) (2026-07-12 머지)
- 후속 PR: [facebook/astryx#3864 — perf(ci): key sandbox next cache by PR to stop cross-basepath invalidation](https://github.com/facebook/astryx/pull/3864) (2026-07-12 머지)
