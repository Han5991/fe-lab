---
title: 'GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일'
date: '2026-07-12'
published: false
slug: 'astryx-gh-pages-deploy-race'
thumbnail: '/og/astryx-gh-pages-deploy-race.png'
---

# GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일

## 이 글을 읽고 나면

- 여러 워크플로우가 같은 브랜치에 push할 때 생기는 경쟁 조건의 구조를 이해합니다
- force-orphan push 앞에서 왜 rebase 재시도가 무너지는지, 대안인 record & replay 패턴을 배웁니다
- concurrency group을 합칠지 분리할지 판단하는 트레이드오프를 알게 됩니다
- 로컬 git 시뮬레이션으로 CI 워크플로우를 머지 전에 검증하는 방법을 얻어갑니다

## 들어가며

> **astryx 기여 시리즈**
>
> 1. 테스트 한 파일에 34초, 범인은 getByRole이었습니다
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. GitHub Actions끼리 서로 push를 덮어쓸 때 생기는 일 **(현재 글)**
> 4. fork PR을 머지했더니 CI가 빨간불이 됐습니다 — permissions: write가 무시된 이유
> 5. deploy job은 이제 27초면 끝납니다

CI가 가끔 빨간불이면 어떻게 하시나요. 솔직히 저는 재실행 버튼부터 눌렀습니다. 다시 돌리면 초록불이 되니까요. 그렇게 넘어가던 실패가 하나 있었습니다.

최근 3일간 facebook/astryx에 PR 11개를 머지시켰습니다. astryx는 메타의 내부 도구용 디자인 시스템입니다. pnpm 모노레포이고, CI는 GitHub Actions입니다. main에 머지될 때마다 Deploy 워크플로우가 gh-pages로 Storybook과 샌드박스를 배포합니다.

그 와중에 이상한 실패를 계속 마주쳤습니다. PR이 머지될 때마다 Cleanup Preview Deployments 워크플로우가 간헐적으로 죽었습니다. 하루에 두 번 실패한 날, 더는 못 본 척할 수 없었습니다. 이 글은 그 원인을 추적하고 고친 기록입니다.

미리 밝혀둡니다. 이번 수정 PR([facebook/astryx#3810](https://github.com/facebook/astryx/pull/3810))은 체크는 전부 그린이지만 **아직 리뷰 대기 중**입니다.

## 사건: 하루에 두 번 죽는 워크플로우

실패 로그를 열었습니다. 에러는 매번 똑같았습니다.

```
To https://github.com/facebook/astryx
 ! [rejected]        gh-pages -> gh-pages (fetch first)
error: failed to push some refs
```

`fetch first`. git을 써본 사람이라면 다 아는 메시지입니다. 누군가 나보다 먼저 push했다는 뜻입니다. 그런데 이건 사람이 아니라 봇들끼리의 충돌이었습니다.

astryx의 gh-pages 브랜치에는 쓰기 주체가 넷 있습니다.

| 워크플로우 | 트리거 | 하는 일 | push 재시도 |
|---|---|---|---|
| `deploy.yml` | main push | 사이트 전체 배포 (**force-orphan push**) | 불필요 (force push) |
| `ci.yml`의 deploy-preview | PR push | PR 프리뷰를 `pr/<번호>/`에 배포 | 있음 (5회) |
| `redeploy-preview.yml` | 프리뷰 재배포 요청 | 프리뷰 다시 배포 | 있음 (5회) |
| `cleanup-previews.yml` | PR closed | 닫힌 PR의 프리뷰 디렉터리 삭제 | **없음** |

구조가 보이십니까. PR을 머지하는 순간 이벤트 두 개가 **동시에** 발화합니다. 하나는 `pull_request: closed` — cleanup이 닫힌 PR의 프리뷰를 지우고 push합니다. 다른 하나는 main으로의 push — `deploy.yml`이 gh-pages를 통째로 갈아엎습니다. 둘 다 몇 초 안에 같은 브랜치에 씁니다.

개념적인 타임라인으로 그리면 이렇습니다(시각은 예시입니다).

```
t+0s    PR 머지
t+1s    cleanup-previews 발화 (pull_request: closed)
t+1s    deploy.yml 발화 (main push)
t+40s   cleanup: gh-pages 체크아웃, pr/<번호> 삭제 커밋 생성
t+55s   deploy: force-orphan push → gh-pages 히스토리 교체
t+60s   cleanup: git push → ! [rejected] (fetch first)
```

'PR 머지'라는 행위 하나가 두 writer를 항상 함께 깨웁니다. 간헐적 실패처럼 보였지만, 사실은 트리거 설계에 박혀 있는 구조적 경쟁 조건이었습니다. 타이밍이 어긋나면 통과하고, 겹치면 죽는 것뿐이었습니다.

그리고 표를 다시 보면 답답한 사실이 하나 더 보입니다. `ci.yml`과 `redeploy-preview.yml`에는 이미 재시도 루프가 있었습니다. 정확히 이 경쟁 때문입니다. cleanup만 없었습니다. gh-pages에 쓰는 워크플로우 중 유일하게.

## 시련: '재시도만 붙이면 되겠지'가 무너진 지점

처음엔 간단해 보였습니다. 옆 워크플로우의 재시도 루프를 복사하면 끝이라고 생각했습니다. push가 거부되면 fetch하고, rebase하고, 다시 push. 낙관적 잠금의 교과서 패턴입니다.

그런데 `deploy.yml`의 배포 설정을 보고 멈칫했습니다.

```yaml
keep_files: false
force_orphan: true
```

`force_orphan`은 배포할 때마다 히스토리를 버립니다. 커밋 1개짜리 고아 브랜치를 새로 만들어 강제 push합니다. 즉 경쟁에서 지는 순간, 원격의 히스토리는 통째로 갈아엎어져 있습니다. 내 로컬 커밋과 원격 tip은 조상을 공유하지 않는 **unrelated histories**가 됩니다.

rebase는 공통 조상을 전제로 커밋을 옮기는 도구입니다. 공통 조상이 없으면 설 자리가 없습니다. '재시도 + rebase' 계획은 여기서 무너졌습니다. 설마 싶어서 다시 확인했지만, force-orphan인 이상 피할 수 없었습니다.

당황스러웠지만, 어디서 본 그림이었습니다. 분산 시스템에서 낙관적 잠금이 실패하면 '최신 상태를 읽고 내 변경을 재적용'합니다. 그런데 여기선 내 변경을 커밋(diff) 형태로는 재적용할 수 없습니다. diff가 기대는 베이스 자체가 사라지니까요. 그렇다면 커밋이 아니라 **의도**를 다시 실행해야 합니다.

## 해결: 삭제를 기록해뒀다가 다시 적용한다 (record & replay)

cleanup의 의도는 단순합니다. "이 경로들을 지운다." 그래서 삭제하는 순간마다 경로를 배열에 기록했습니다.

```bash
git rm -rf --quiet "pr/${pr_num}"
DELETED_PATHS+=("pr/${pr_num}")
```

push가 거부되면 이렇게 복구합니다. 원격의 최신 tip을 fetch해서 `reset --hard`로 갈아탑니다. 그 위에 기록해둔 삭제를 다시 적용합니다. 그리고 다시 push합니다. 최대 5회, 백오프를 늘려가며 반복합니다. 실제 PR의 코드입니다.

```bash
MAX_ATTEMPTS=5
for attempt in $(seq 1 $MAX_ATTEMPTS); do
  if [ "$attempt" -gt 1 ]; then
    echo "Push rejected (concurrent gh-pages update) — retrying in $((attempt * 2))s"
    sleep $((attempt * 2))
    git fetch --depth=1 origin gh-pages
    git reset --hard FETCH_HEAD
    git rm -r -f -q --ignore-unmatch -- "${DELETED_PATHS[@]}"
    if git diff --cached --quiet; then
      echo "Stale paths already removed upstream — nothing left to push"
      exit 0
    fi
  fi

  git commit -m "chore: cleanup ${DELETED} stale deployments"
  if git push origin gh-pages; then
    echo "Pushed cleanup commit"
    exit 0
  fi
done

echo "::error::Failed to push cleanup after ${MAX_ATTEMPTS} attempts"
exit 1
```

이 replay가 성립하는 전제가 하나 있습니다. `deploy.yml`은 히스토리는 갈아엎지만, 배포 간에 `pr/`과 `reports/` 콘텐츠는 보존합니다. 그래서 새로 배포된 tip에도 지워야 할 stale 경로가 그대로 남아 있습니다. 히스토리와 콘텐츠의 수명이 다른 구조라 재적용이 가능한 겁니다.

디테일 두 개가 이 루프를 지탱합니다. `--ignore-unmatch`는 경로가 이미 없어도 `git rm`이 실패하지 않게 합니다. `git diff --cached --quiet`는 재적용 후 지울 게 없으면 — 경쟁 상대가 먼저 지워준 경우 — 빈 커밋 없이 성공(exit 0)으로 끝냅니다. 실패도 아니고 빈 커밋도 아닌, 정확한 '할 일 없음'입니다.

## 두 번째 함정: concurrency group에 합류하지 않은 이유

사실 더 쉬워 보이는 해법이 하나 더 있었습니다. `deploy.yml`이 쓰는 `pages-deploy` concurrency group에 cleanup을 합류시키는 것. 같은 그룹이면 GitHub이 알아서 직렬화해 주니, 경쟁 자체가 사라지지 않을까요.

안 됩니다. GitHub Actions는 **그룹당 pending 실행을 최신 1개만 유지**합니다. cleanup이 그룹에 들어가 대기 중인 main 배포를 밀어내면, 그 배포는 취소됩니다. 사이트가 낡은 채로 남습니다. 프리뷰 청소가 본배포를 죽이는 셈입니다. 배보다 배꼽이 큽니다.

그래서 전용 그룹을 신설했습니다.

```yaml
concurrency:
  group: "cleanup-previews"
  cancel-in-progress: false
```

역할 분담은 이렇습니다. 여러 PR이 동시에 닫힐 때 cleanup끼리의 경쟁은 이 그룹이 직렬화로 막습니다. `deploy.yml`과의 경쟁은 위의 push 재시도가 흡수합니다. 경쟁 상대의 성격에 따라 다른 도구를 쓴 겁니다. 직렬화할 수 있는 상대는 직렬화하고, 못 하는 상대는 재시도로 견딥니다.

## 검증: 3-클론 git 시뮬레이션으로 CI를 로컬에서 재현하기

이 로직이 정말 맞는지 어떻게 확인할까요. 경쟁 조건은 CI에서 재현을 기다리기가 고역입니다. 운 좋게 재현돼도 타이밍을 통제할 수 없습니다. 그래서 로컬에 미니 CI를 만들었습니다.

구성은 클론 세 개입니다.

- **bare 저장소** 하나를 원격(GitHub) 삼습니다
- **클론 A**는 cleanup 워크플로우 역할입니다
- **클론 B**는 `deploy.yml`(배포자) 역할입니다

시나리오는 프로덕션의 타이밍을 손으로 재현합니다. A가 gh-pages를 체크아웃하고 삭제 커밋을 만듭니다. 그 사이에 B가 force-orphan push를 끼워넣습니다. 그다음 A가 push합니다.

핵심은 워크플로우의 셸 스크립트를 **그대로(verbatim)** 실행했다는 점입니다. 비슷하게 옮겨 적은 스크립트를 돌리는 건 검증이 아닙니다. YAML에서 그 스크립트 블록을 떼어 토씨 하나 안 바꾸고 돌려야, CI에서도 같은 행동을 믿을 수 있습니다.

세 경로를 모두 확인했습니다.

| 시나리오 | 기대 동작 | 결과 |
|---|---|---|
| 경쟁 발생 | 1차 push가 프로덕션과 동일한 에러로 거부 → reset & replay 후 push 성공 | 통과 |
| 이미 정리됨 | 상대가 같은 경로를 먼저 지움 → `Stale paths already removed upstream` + exit 0 | 통과 |
| 무경쟁 | 1차 push가 기존과 동일하게 성공 | 통과 |

부수 피해도 확인했습니다. 경쟁 후에도 열린 PR들의 프리뷰와 배포자가 올린 새 콘텐츠는 전부 살아남았습니다. 사라진 건 닫힌 PR의 프리뷰뿐이었습니다. 지워야 할 것만 지우고, 남겨야 할 것은 남긴 겁니다.

## 배운 점

**간헐적 실패에도 구조가 있습니다.** '재실행하면 되니까'는 원인을 안 본다는 말과 같습니다. 로그를 열고 트리거를 나란히 놓자, 실패는 우연이 아니라 설계의 귀결이었습니다.

**경쟁 조건의 해법은 상대의 쓰기 방식에 달려 있습니다.** rebase 재시도는 히스토리가 이어진다는 전제 위의 패턴입니다. force-orphan처럼 히스토리를 버리는 상대 앞에서는, 커밋이 아니라 의도를 기록해 재적용해야 합니다. record & replay는 그 전제 위에서만 고를 수 있는 답이었습니다.

**CI 워크플로우도 테스트할 수 있습니다.** bare 저장소와 클론 몇 개면 GitHub Actions의 경쟁 시나리오를 로컬에서 결정적으로 재현할 수 있습니다. '아마 될 거야'로 리뷰를 요청하는 것과, 세 경로를 표로 검증한 뒤 요청하는 것은 다른 일입니다.

결국 이 문제의 정체는 익숙한 것이었습니다. 동시에 쓰는 writer 여럿, 낙관적 잠금 실패, 충돌 해소 전략. 분산 시스템 교과서의 그림이 CI 파이프라인에 그대로 나타난 겁니다. gh-pages 브랜치도 결국 공유 상태 저장소니까요.

## 마치며

정리합니다. PR 머지는 cleanup과 deploy를 동시에 깨우는 구조적 경쟁이었습니다. force-orphan 때문에 rebase 재시도는 불가능했고, 삭제 경로를 기록해 재적용하는 record & replay로 풀었습니다. concurrency group은 본배포를 지키기 위해 일부러 분리했고, 3-클론 git 시뮬레이션으로 세 경로를 모두 검증했습니다.

이 PR은 아직 머지 전입니다. 체크는 전부 그린이고, 리뷰를 기다리고 있습니다. 진행이 궁금하시면 여기서 보실 수 있습니다 → [facebook/astryx#3810](https://github.com/facebook/astryx/pull/3810)

여러분의 CI에도 '재실행하면 되는' 빨간불이 있나요. 봇 두 개가 같은 브랜치에 쓰고 있다면, 이미 경쟁 중일지도 모릅니다. 비슷한 경험이나 다른 해법이 있다면 댓글로 들려주세요. 남의 파이프라인이 어디서 새는지는, 의외로 서로의 댓글에서 가장 빨리 배웁니다.
