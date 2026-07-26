---
title: 'CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다'
date: '2026-07-12'
published: false
slug: 'astryx-ci-race-and-permissions'
thumbnail: '/og/astryx-ci-race-and-permissions.png'
---

# CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다

## 이 글을 읽고 나면

- 파이프라인이 빨라지면 왜 잠복해 있던 문제가 수면 위로 올라오는지 이해합니다
- force-orphan push 앞에서 rebase 재시도가 무너지는 이유와, 대안인 record & replay 패턴을 배웁니다
- `permissions: write`를 선언했는데도 403이 나오는 이유 — fork발 PR의 토큰 강등 규칙을 알게 됩니다
- 로컬에서 재현되지 않고 에러도 원인을 안 가리키는 CI 버그를 진단하는 공통 절차를 얻어갑니다

## 들어가며

> **느린 CI 뜯어고치기**
>
> 1. 매일 쓰던 getByRole 때문에 테스트가 26배 느렸습니다
> 2. 로컬에선 그대로인데 CI에서만 빨라지는 최적화가 있습니다
> 3. 캐시가 hit인데 매번 콜드 빌드였습니다
> 4. deploy job은 이제 27초면 끝납니다
> 5. CI가 빨라지자 숨어 있던 함정 두 개가 드러났습니다 **(현재 글)**

2026년 7월, 열흘 남짓 동안 facebook/astryx에 PR 17개를 머지시켰습니다. astryx는 메타가 오픈소스로 운영하는 내부 도구용 디자인 시스템이고, CI는 GitHub Actions입니다. main에 머지될 때마다 Deploy 워크플로우가 gh-pages 브랜치로 Storybook과 샌드박스를 배포합니다.

앞의 네 편은 전부 CI를 **빠르게 만든** 이야기였습니다. 테스트를 쪼개고, 캐시를 살리고, 직렬 파이프라인을 병렬로 폈습니다. 이번 편은 그 뒷이야기입니다. **빨라진 뒤에 드러난 문제들**이요.

테스트를 ui/node 두 프로젝트로 쪼갠 PR([#3814](https://github.com/facebook/astryx/pull/3814))의 커밋 메시지에 이런 취지의 문장을 적었습니다. 프로젝트 분리로 파일 스케줄링이 바뀌자 잠복해 있던 레이스가 터졌다고요. **빨라지면 숨어 있던 레이스가 드러납니다.** 시간차 덕분에 안 부딪히던 것들이, job이 짧아지고 병렬로 겹치면서 부딪히기 시작합니다. 새 버그가 생긴 게 아니라, 원래 있던 버그의 발현 확률이 올라간 겁니다.

이 글은 그렇게 드러난 함정 두 개의 기록입니다. 하나는 워크플로우 둘이 같은 브랜치에 동시에 push하다 서로를 덮어쓴 경합이고, 다른 하나는 `permissions: contents: write`를 선언했는데도 403이 나던 권한 문제입니다. 재미있는 건 **둘 다 같은 워크플로우**(`Cleanup Preview Deployments`)에서, 그것도 같은 한 줄에서 터졌다는 점입니다. 원인은 전혀 달랐고요.

둘은 성격도 닮았습니다. 로컬에서는 절대 재현되지 않고, 에러 메시지가 원인을 가리키지 않습니다. 그 공통점은 마지막에 따로 정리하겠습니다.

## 함정 1 — 봇 둘이 같은 브랜치에 씁니다

### 사건: 하루에 두 번 죽는 워크플로우

CI가 가끔 빨간불이면 재실행 버튼부터 누르게 됩니다. 저도 그랬습니다. PR이 머지될 때마다 `Cleanup Preview Deployments`가 간헐적으로 죽었는데, 다시 돌리면 초록불이 되니 그냥 넘겼습니다. 그런데 하루에 두 번 실패한 날, 더는 못 본 척할 수 없었습니다. 로그를 열었더니 에러는 매번 똑같았습니다.

```
To https://github.com/facebook/astryx
 ! [rejected]        gh-pages -> gh-pages (fetch first)
error: failed to push some refs
```

`fetch first`. 누군가 나보다 먼저 push했다는 뜻입니다. 그런데 이건 사람이 아니라 봇들끼리의 충돌이었습니다.

astryx의 gh-pages 브랜치에는 쓰기 주체가 넷 있습니다.

| 워크플로우                | 트리거              | 하는 일                                | push 재시도       |
| ------------------------- | ------------------- | -------------------------------------- | ----------------- |
| `deploy.yml`              | main push           | 사이트 전체 배포 (**force-orphan push**) | 불필요 (force push) |
| `ci.yml`의 deploy-preview | PR push             | PR 프리뷰를 `pr/<번호>/`에 배포        | 있음 (5회)        |
| `redeploy-preview.yml`    | 프리뷰 재배포 요청  | 프리뷰 다시 배포                       | 있음 (5회)        |
| `cleanup-previews.yml`    | PR closed           | 닫힌 PR의 프리뷰 디렉터리 삭제         | **없음**          |

구조가 보이십니까. PR을 머지하는 순간 이벤트 두 개가 **동시에** 발화합니다. 하나는 `pull_request: closed` — cleanup이 닫힌 PR의 프리뷰를 지우고 push합니다. 다른 하나는 main으로의 push — `deploy.yml`이 gh-pages를 통째로 갈아엎습니다. 둘 다 몇 초 안에 같은 브랜치에 씁니다.

타임라인으로 그리면 이렇습니다(시각은 예시입니다).

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

### 시련: '재시도만 붙이면 되겠지'가 무너진 지점

처음엔 간단해 보였습니다. 옆 워크플로우의 재시도 루프를 복사하면 끝이라고 생각했습니다. push가 거부되면 fetch하고, rebase하고, 다시 push. 낙관적 잠금의 교과서 패턴입니다.

그런데 `deploy.yml`의 배포 설정을 보고 멈칫했습니다.

```yaml
keep_files: false
force_orphan: true
```

`force_orphan`은 배포할 때마다 히스토리를 버립니다. 커밋 1개짜리 고아 브랜치를 새로 만들어 강제 push합니다. 즉 경쟁에서 지는 순간, 원격의 히스토리는 통째로 갈아엎어져 있습니다. 내 로컬 커밋과 원격 tip은 조상을 공유하지 않는 **unrelated histories**가 됩니다.

rebase는 공통 조상을 전제로 커밋을 옮기는 도구입니다. 공통 조상이 없으면 설 자리가 없습니다. '재시도 + rebase' 계획은 여기서 무너졌습니다.

당황스러웠지만 어디서 본 그림이었습니다. 분산 시스템에서 낙관적 잠금이 실패하면 '최신 상태를 읽고 내 변경을 재적용'합니다. 그런데 여기선 내 변경을 커밋(diff)으로는 재적용할 수 없습니다. diff가 기대는 베이스 자체가 사라지니까요. 그렇다면 커밋이 아니라 **의도**를 다시 실행해야 합니다.

### 해결: 삭제를 기록해뒀다가 다시 적용한다

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

디테일 두 개가 이 루프를 지탱합니다. `--ignore-unmatch`는 경로가 이미 없어도 `git rm`이 실패하지 않게 합니다. `git diff --cached --quiet`는 재적용 후 지울 게 없으면 — 경쟁 상대가 먼저 지워준 경우 — 빈 커밋 없이 성공(exit 0)으로 끝냅니다. 실패도 빈 커밋도 아닌, 정확한 '할 일 없음'입니다.

### concurrency group에 합류하지 않은 이유

사실 더 쉬워 보이는 해법이 하나 더 있었습니다. `deploy.yml`이 쓰는 `pages-deploy` concurrency group에 cleanup을 합류시키는 것. 같은 그룹이면 GitHub이 알아서 직렬화해 주니, 경쟁 자체가 사라지지 않을까요.

안 됩니다. GitHub Actions는 **그룹당 pending 실행을 최신 1개만 유지**합니다. cleanup이 그룹에 들어가 대기 중인 main 배포를 밀어내면, 그 배포는 취소됩니다. 사이트가 낡은 채로 남습니다. 프리뷰 청소가 본배포를 죽이는 셈입니다. 배보다 배꼽이 큽니다.

그래서 전용 그룹을 신설했습니다.

```yaml
concurrency:
  group: 'cleanup-previews'
  cancel-in-progress: false
```

역할 분담은 이렇습니다. 여러 PR이 동시에 닫힐 때 cleanup끼리의 경쟁은 이 그룹이 직렬화로 막습니다. `deploy.yml`과의 경쟁은 위의 push 재시도가 흡수합니다. 직렬화할 수 있는 상대는 직렬화하고, 못 하는 상대는 재시도로 견디는 겁니다.

### 검증: 3-클론 git 시뮬레이션

경쟁 조건은 CI에서 재현을 기다리기가 고역입니다. 운 좋게 재현돼도 타이밍을 통제할 수 없습니다. 그래서 로컬에 미니 CI를 만들었습니다.

구성은 클론 세 개입니다.

- **bare 저장소** 하나를 원격(GitHub) 삼습니다
- **클론 A**는 cleanup 워크플로우 역할입니다
- **클론 B**는 `deploy.yml`(배포자) 역할입니다

시나리오는 프로덕션의 타이밍을 손으로 재현합니다. A가 gh-pages를 체크아웃하고 삭제 커밋을 만듭니다. 그 사이에 B가 force-orphan push를 끼워넣습니다. 그다음 A가 push합니다.

핵심은 워크플로우의 셸 스크립트를 **그대로(verbatim)** 실행했다는 점입니다. 비슷하게 옮겨 적은 스크립트를 돌리는 건 검증이 아닙니다. 토씨 하나 안 바꾸고 돌려야 CI에서도 같은 행동을 믿을 수 있습니다.

세 경로를 모두 확인했습니다.

| 시나리오    | 기대 동작                                                                     | 결과 |
| ----------- | ----------------------------------------------------------------------------- | ---- |
| 경쟁 발생   | 1차 push가 프로덕션과 동일한 에러로 거부 → reset & replay 후 push 성공         | 통과 |
| 이미 정리됨 | 상대가 같은 경로를 먼저 지움 → `Stale paths already removed upstream` + exit 0 | 통과 |
| 무경쟁      | 1차 push가 기존과 동일하게 성공                                               | 통과 |

부수 피해도 확인했습니다. 경쟁 후에도 열린 PR들의 프리뷰와 배포자가 올린 새 콘텐츠는 전부 살아남았고, 사라진 건 닫힌 PR의 프리뷰뿐이었습니다. 지워야 할 것만 지우고 남겨야 할 것은 남긴 겁니다. 이 수정은 [facebook/astryx#3810](https://github.com/facebook/astryx/pull/3810)으로 머지됐습니다.

## 함정 2 — 권한을 선언했는데 권한이 없다고 합니다

### 머지의 기쁨은 10분을 가지 못했습니다

발단은 제 PR [#3859](https://github.com/facebook/astryx/pull/3859)였습니다. 워크스페이스의 vite 버전을 8로 정렬하는 의존성 정리 PR이었습니다. 메인테이너 승인이 떨어지고 main에 머지됐습니다. 기분 좋게 Actions 탭을 열었습니다.

빨간 X가 하나 떠 있었습니다. 또 `Cleanup Preview Deployments`였습니다. 이번엔 exit 128로 죽어 있었고, 로그 끝은 이랬습니다.

```text
remote: Permission to facebook/astryx.git denied to github-actions[bot].
fatal: unable to access 'https://github.com/facebook/astryx/': The requested URL returned error: 403
```

당황했습니다. 제 PR이 머지되자마자 터진 실패입니다. 내 변경이 뭔가를 깨뜨렸나 싶어 심장이 먼저 내려앉았습니다. 다행히 diff를 다시 봐도 접점이 없었습니다. 제 PR은 `package.json`과 lockfile만 건드렸고, 이 워크플로우는 gh-pages를 청소하는 별개 작업입니다. 그런데 왜 하필 지금 죽었을까요.

### 첫 번째 용의자: permissions 선언

가장 먼저 `.github/workflows/cleanup-previews.yml`을 열었습니다. 트리거는 세 개였습니다.

```yaml
on:
  schedule:
    - cron: '0 6 * * *' # Daily 6am UTC
  pull_request:
    types: [closed]
  workflow_dispatch:
```

PR이 닫힐 때(머지 포함) `pr/<번호>/`를 지우고, 매일 06시 UTC에 한 번 더 전체 청소를 도는 구조입니다. 그리고 권한 선언이 눈에 들어왔습니다.

```yaml
permissions: {}

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read
```

여기서 첫 번째 가설이 나왔습니다. "최상위에 `permissions: {}`가 있으니, 이게 job 권한을 덮어쓴 거 아닐까?" 그럴듯해 보였습니다. 하지만 문서를 확인하니 반대였습니다. job 레벨 `permissions`는 워크플로우 레벨 선언을 **덮어씁니다**. 최상위 `{}`는 기본값을 좁혀두는 모범 사례일 뿐이고, `cleanup` job은 분명히 `contents: write`를 받아야 합니다. 가설 기각.

두 번째 시도는 더 단순했습니다. 실패한 job을 그냥 re-run 해봤습니다. 일시적인 GitHub 장애일 수도 있으니까요. 결과는 똑같은 403이었습니다. 재실행은 원래 이벤트의 컨텍스트를 그대로 물려받으니, 우연이 아니라는 뜻입니다.

여기서 막혔습니다. 권한을 **선언한** 워크플로우가, 권한이 **없다며** 죽는 상황. YAML만 노려봐서는 답이 안 나왔습니다.

### 실패와 성공을 나란히 놓아보았습니다

접근을 바꿨습니다. 파일이 아니라 **실행 이력**을 보기로 했습니다. 같은 워크플로우의 최근 실행을 전부 나열했습니다.

```bash
gh run list --repo facebook/astryx \
  --workflow=cleanup-previews.yml --limit 20
```

그러자 패턴이 보였습니다. 정리하면 이렇습니다.

| 트리거                         | head 저장소                | 결과       |
| ------------------------------ | -------------------------- | ---------- |
| PR closed — 제 PR들 (#3859 등) | `Han5991/astryx` (fork)    | 전부 실패 ❌ |
| PR closed — `navi/*` 브랜치 PR | `facebook/astryx` (같은 저장소) | 전부 성공 ✅ |
| schedule (매일 06:00 UTC)      | —                          | 전부 성공 ✅ |

실패한 실행은 **전부 fork에서 온 PR이 닫힐 때**였습니다. 메인테이너들이 같은 저장소의 `navi/*` 브랜치에서 올린 PR이 닫힐 때는 멀쩡했습니다. cron 실행도 멀쩡했습니다. 변수는 딱 하나, **PR이 fork에서 왔는가**였습니다.

확인 사살로 교차 검증을 했습니다.

```bash
gh pr view 3859 --repo facebook/astryx --json isCrossRepository
```

```json
{ "isCrossRepository": true }
```

설마 싶었습니다. 저는 외부 기여자라 fork(`Han5991/astryx`)에서 PR을 올립니다. 제 PR이 닫힐 때마다 이 워크플로우는 조용히 죽고 있었던 겁니다. #3859가 처음이 아니었습니다. 그동안 아무도 눈치채지 못했을 뿐입니다.

### 범인: fork발 pull_request의 토큰 강등

원인은 GitHub Actions의 보안 모델에 있었습니다. 문서에 명시된 규칙입니다.

> fork에서 온 PR이 `pull_request` 이벤트를 발화하면, 그 실행의 `GITHUB_TOKEN`은 **최대 읽기 전용**으로 제한된다. 워크플로우 파일의 `permissions` 선언으로도 이 상한을 넘을 수 없다.

`permissions` 키는 권한을 **좁히는** 장치이지 **넓히는** 장치가 아닙니다. 이벤트 종류와 출처가 정하는 상한 안에서만 동작합니다. fork발 `pull_request` 이벤트의 상한이 read-only이므로, job에 `contents: write`를 백 번 적어도 소용없습니다. 제 첫 가설이 YAML 안에서만 맴돌다 실패한 이유입니다.

이유는 명확합니다. fork는 아무나 만들 수 있으니, fork발 PR이 write 토큰을 받는다면 악의적인 사용자가 PR 하나로 원본 저장소에 커밋을 쓰거나 릴리스를 조작할 수 있습니다. 그래서 GitHub은 fork발 실행의 토큰을 무조건 강등하고 시크릿도 전달하지 않습니다.

흔한 오해 하나만 정정하겠습니다. 이 로그를 처음 보면 "fork 저장소에 뭘 쓰려다 실패했나?"라고 생각하기 쉽습니다. 방향이 반대입니다. 실패한 실행은 **원본 저장소(facebook/astryx)에서** 돌았습니다. 다만 fork발 PR이 트리거했기 때문에 토큰이 강등된 상태였고, 그 토큰으로 **원본 저장소의** gh-pages에 push하려다 거부당한 겁니다. 로그의 `Permission to facebook/astryx.git denied`가 그 증거입니다.

### 왜 하필 마지막 한 줄에서 터졌나

워크플로우 스크립트를 따라가 보면 실패 지점도 정확히 설명됩니다.

```bash
git rm -rf --quiet "pr/${pr_num}"   # 로컬 작업 — 성공
git commit -m "chore: cleanup ..."  # 로컬 커밋 — 성공
git push origin gh-pages            # 원격 쓰기 — 여기서 403
```

읽기 권한은 있으니 gh-pages 체크아웃과 `gh pr list` 조회는 통과합니다. `git rm`과 `git commit`은 러너의 로컬 디스크에서 일어나는 일이라 토큰과 무관합니다. 오직 마지막 `git push`만 원격 쓰기이고, 거기서 403이 터집니다(exit 128은 git의 fatal 에러 코드입니다). 워크플로우가 90%를 멀쩡히 수행하고 마지막 한 줄에서 죽는, 얄궂은 실패였습니다.

여기서 함정 1과의 관계가 분명해집니다. 죽는 자리는 똑같이 `git push origin gh-pages` 한 줄입니다. 하지만 함정 1에 붙인 재시도 루프는 이 실패에는 아무 도움이 안 됩니다. 경합은 '잠깐 밀렸으니 다시 밀면 되는' 문제지만, 토큰 강등은 애초에 쓰기 권한이 없는 상태이기 때문입니다. 같은 줄에서 나는 실패라고 같은 처방을 쓰면 안 됩니다.

### 세 가지 선택지, 그리고 고치지 않기로 한 결정

원인을 알았으니 해결 옵션을 검토했습니다. 세 가지가 있었습니다.

**옵션 1 — `pull_request_target`으로 전환.** 이 이벤트를 쓰면 실행이 **base 저장소의 컨텍스트**에서 돌고, 토큰도 write 권한을 받습니다. 정석 같아 보이지만 악명이 있습니다. 이른바 **'pwn request'** 공격의 진입점이기 때문입니다. 다만 이 공격은 아무 데서나 성립하지 않고, 조건이 있습니다.

| pwn request 성립 조건                              | 이 워크플로우는?                    |
| -------------------------------------------------- | ----------------------------------- |
| (a) PR head의 코드를 체크아웃해서 빌드/실행한다    | ❌ base의 `gh-pages` 브랜치만 체크아웃 |
| (b) `github.event.pull_request.*` 값을 셸에 보간한다 | ❌ event 필드를 전혀 사용하지 않음  |

write 토큰을 쥔 채로 공격자가 통제하는 코드(head 체크아웃)나 데이터(PR 제목·본문 보간)를 실행할 때 뚫리는 겁니다. 이 워크플로우는 둘 다 해당하지 않습니다. 게다가 `pull_request_target`은 워크플로우 파일도 base 브랜치 버전이 실행되므로, PR에서 워크플로우를 조작하는 경로도 막혀 있습니다. 결론은 **이 경우에는 안전하게 전환 가능**입니다.

**옵션 2 — fork PR이면 건너뛰기.** job에 조건 한 줄을 다는 방법입니다.

```yaml
if: github.event_name != 'pull_request' ||
  github.event.pull_request.head.repo.full_name == github.repository
```

빨간 X는 사라집니다. 대신 fork PR의 프리뷰는 닫히는 즉시 정리되지 않고 남습니다.

**옵션 3 — 아무것도 안 하기.** 여기서 워크플로우의 첫 트리거를 다시 봤습니다. `cron: '0 6 * * *'`. 매일 06시 UTC에 어차피 전체 청소가 돕니다. cron 실행은 fork와 무관하니 토큰 강등도 없고, 실행 이력에서도 전부 성공이었습니다. 즉 fork PR이 닫힐 때의 실패는 **다음 날 아침 cron이 알아서 수습**합니다. 시스템이 이미 자가 치유를 하고 있었던 겁니다.

세 옵션을 놓고 저울질했습니다. 실제 피해는 fork PR의 프리뷰 정리가 **최대 하루** 늦어지는 것, 남는 노이즈는 fork PR이 닫힐 때마다 뜨는 빨간 X 하나. 이게 전부고 사용자 영향은 없습니다. 반면 `pull_request_target`은 보안에 민감한 이벤트라, 메인테이너가 pwn request 성립 조건까지 검토해야 승인할 수 있습니다. '하루 늦는 청소'를 위해 그 리뷰 비용을 청구하는 게 맞을까요.

저는 아니라고 판단했습니다. **수정의 가치가 리뷰 비용보다 작았습니다.** 그래서 PR 대신 조사 결과만 정리해 두기로 했습니다. 나중에 이 워크플로우를 어차피 손볼 일이 생기면, 그때 옵션 1을 한 줄 얹으면 됩니다. 원인을 완전히 규명한 뒤에 **고치지 않기로 결정하는 것도 엔지니어링**입니다. 모르고 방치하는 것과 알고 놔두는 것은 완전히 다릅니다.

## 두 함정의 공통점

두 사건은 원인도 해법도 달랐습니다. 하나는 코드를 고쳤고 하나는 안 고쳤습니다. 그런데 **진단 과정은 이상하리만치 닮아 있었습니다.**

**첫째, 둘 다 로컬에서는 재현되지 않습니다.** 워크플로우 YAML을 아무리 들여다봐도, 스크립트를 로컬에서 돌려봐도 멀쩡합니다. 두 실패 모두 CI 환경 고유의 조건 위에서만 성립하기 때문입니다. 하나는 **다른 워크플로우가 동시에 존재한다**는 조건, 다른 하나는 **트리거가 fork에서 왔다**는 조건입니다. 둘 다 내 머신에는 없습니다.

그래서 진단 도구가 파일이 아니어야 했습니다. 함정 1은 그 조건을 로컬에 **직접 만들었고**(bare 저장소 + 클론 둘로 경쟁 상대를 재현), 함정 2는 CI가 이미 남겨둔 **실행 이력을 표로 정렬했습니다**(`gh run list`로 실패와 성공을 나란히). 로컬에 없는 조건은 만들어내거나, 기록에서 읽어내야 합니다.

**둘째, 에러 메시지가 원인을 직접 가리키지 않습니다.** `fetch first`는 "네 로컬이 뒤처졌으니 먼저 받아라"라고 말합니다. 맞는 말이지만 누가 언제 왜 먼저 썼는지는 한 글자도 알려주지 않습니다. `denied to github-actions[bot]` 403도 "권한이 없다"는 사실만 말할 뿐, YAML에 `contents: write`가 적혀 있는데도 왜 없는지는 설명하지 않습니다. 둘 다 원인이 아니라 **증상 지점의 메시지**이고, 공교롭게 그 지점마저 `git push` 한 줄로 똑같습니다. 그대로 검색창에 넣으면 "pull 먼저 하세요", "permissions를 추가하세요" 같은 일반론이 나오고, 둘 다 오답입니다.

**셋째, 둘 다 GitHub Actions의 실행 모델을 알아야 진단됩니다.** 함정 1은 **동시성 모델** — 사용자 행동 하나(PR 머지)가 서로 다른 이벤트 둘을 동시에 발화시킨다는 것, concurrency group은 그룹당 pending 실행을 하나만 남긴다는 것. 함정 2는 **토큰 권한 모델** — `permissions`는 상한을 넓히지 못하고, 그 상한은 이벤트 종류와 트리거의 출처가 정한다는 것. 둘 다 워크플로우 파일 어디에도 적혀 있지 않습니다. 플랫폼 쪽 규칙이라 모르면 파일만 노려보다 하루를 씁니다. 알고 나면 진단은 몇 분입니다.

이 셋이 겹치면 사람은 자연스럽게 재실행 버튼을 누릅니다. 다시 돌리면 초록불이 되기도 하니까요. 하지만 함정 1은 트리거 설계에 박힌 구조적 경쟁이었고, 함정 2는 재실행으로는 영원히 초록불이 될 수 없는 실패였습니다. **간헐적 실패에도 구조가 있습니다.** '재실행하면 되니까'는 원인을 안 본다는 말과 같습니다.

## 마치며

빨라진 파이프라인은 없던 버그를 만들지 않습니다. 있던 버그를 꺼내 보여줄 뿐입니다. 최적화의 부작용이 아니라, 최적화가 준 정보라고 생각합니다.

두 함정을 세 줄로 요약합니다.

1. PR 머지는 cleanup과 deploy를 동시에 깨우는 구조적 경쟁이었습니다. force-orphan 앞에서는 rebase 재시도가 성립하지 않으므로, 커밋이 아니라 **의도(삭제할 경로)를 기록해 재적용**하는 record & replay로 풀었습니다 — [#3810](https://github.com/facebook/astryx/pull/3810).
2. fork발 PR이 트리거한 `pull_request` 실행의 `GITHUB_TOKEN`은 무조건 read-only입니다. `permissions: contents: write`를 선언해도 못 이깁니다. 원인을 못 찾겠으면 코드가 아니라 **실행 이력**을 보세요.
3. 원인을 다 밝힌 뒤에 **고치지 않기로 결정하는 것**도 엔지니어링입니다. 이 건은 cron의 자가 치유가 이미 수습하고 있었고, `pull_request_target` 전환이 청구할 리뷰 비용이 이득보다 컸습니다.

여러분의 CI에도 '재실행하면 되는' 빨간불이 있나요. 봇 두 개가 같은 브랜치에 쓰고 있다면 이미 경쟁 중일지도 모르고, `pull_request: closed` 트리거를 훑어보면 fork PR이 닫힐 때마다 조용히 죽는 워크플로우가 나올지도 모릅니다. 비슷한 경험이나 다른 해법이 있다면 댓글로 들려주세요. 남의 파이프라인이 어디서 새는지는, 의외로 서로의 댓글에서 가장 빨리 배웁니다.

---

## 참고 링크

- [GitHub Docs — Automatic token authentication (`GITHUB_TOKEN`의 권한 상한)](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [GitHub Docs — Events that trigger workflows: `pull_request_target`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#pull_request_target)
- [GitHub Security Lab — Preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/)
